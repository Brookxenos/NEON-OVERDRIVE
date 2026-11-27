import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { KeyboardController } from '../controls/KeyboardController';
import { TouchController } from '../controls/TouchController';
import { VisualEffects } from '../effects/VisualEffects';
import { BoostSystem } from '../gameplay/BoostSystem';
import { CollisionReport, CollisionSystem } from '../gameplay/CollisionSystem';
import { CollectibleManager } from '../gameplay/CollectibleManager';
import { DifficultyManager } from '../gameplay/DifficultyManager';
import { ObstacleManager } from '../gameplay/ObstacleManager';
import { ScoreManager } from '../gameplay/ScoreManager';
import { TacticalWaveDirector } from '../gameplay/TacticalWaveDirector';
import { GameSettings, GameSettingsData } from '../settings/GameSettings';
import { SaveData, SaveManager } from '../storage/SaveManager';
import { LaneIndex, LaneSystem } from '../track/LaneSystem';
import { TrackManager } from '../track/TrackManager';
import {
  BASE_MAX_SPEED,
  BASE_START_SPEED,
  BOOST_SPEED_BONUS,
  PAD_BOOST_BONUS,
  SPAWN_Z,
  SPEED_TO_KMH,
  THROTTLE_BONUS,
} from '../utils/Constants';
import { clamp, damp } from '../utils/MathUtils';
import { TextureBundle, TextureFactory } from '../utils/TextureFactory';
import {
  CarId,
  getCarSpec,
  getNextLockedCar,
} from '../vehicle/CarCatalog';
import { CarController } from '../vehicle/CarController';
import { SceneManager } from '../world/SceneManager';
import { GameLoop } from './GameLoop';
import { GameState } from './GameState';
import { Renderer } from './Renderer';

export interface UiModalBridge {
  hasOpenModal: () => boolean;
  closeTopModal: () => boolean;
}

export class Game {
  public readonly state: GameState;
  public readonly settings: GameSettings;

  private readonly saveManager = new SaveManager();
  private saveData: SaveData;

  private readonly container: HTMLElement;
  private readonly renderer: Renderer;
  private readonly textures: TextureBundle;
  private readonly sceneManager: SceneManager;
  private readonly carController: CarController;
  private readonly trackManager: TrackManager;
  private readonly obstacleManager: ObstacleManager;
  private readonly collectibleManager: CollectibleManager;
  private readonly collisionSystem = new CollisionSystem();
  private readonly boostSystem = new BoostSystem();
  private readonly scoreManager = new ScoreManager();
  private readonly difficultyManager = new DifficultyManager();
  private readonly waveDirector = new TacticalWaveDirector();
  private readonly visualEffects = new VisualEffects();
  private readonly audioManager: AudioManager;
  private readonly keyboardController: KeyboardController;
  private readonly touchController: TouchController;
  private readonly loop: GameLoop;

  private currentSpeed = BASE_START_SPEED;
  private spawnDistanceRemaining = 42;
  private runElapsedSeconds = 0;
  private lastAnnouncedLevel = 1;
  private passed500m = false;
  private passed1500m = false;
  private passed2500m = false;
  private passed3000m = false;
  private passed5000m = false;
  private passed8000m = false;
  private lastScoreMilestone = 0;
  private scoreFeverTimer = 0;
  private saveFlushTimer = 0;
  private saveDirty = false;
  private announcedGoalId: CarId | null = null;
  private garagePreviewOpen = false;
  private previewedCarId: CarId;
  private uiModalBridge: UiModalBridge | null = null;

  private readonly collisionReport: CollisionReport = {
    crashed: false,
    crashTime: 1,
    crashCause: '',
    crashPosition: new THREE.Vector3(),
    collected: [],
    hitBoostPad: false,
    nearMissCount: 0,
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.saveData = this.saveManager.loadSaveData();
    this.previewedCarId = this.saveData.selectedCarId;
    this.settings = new GameSettings(this.saveManager.loadSettings());
    this.state = new GameState(
      this.saveData.bestScore,
      this.saveData.bestDistance,
      this.saveData.coins,
      this.saveData.selectedCarId,
      this.saveData.unlockedCars,
    );

    const initialSettings = this.settings.get();
    this.renderer = new Renderer(
      container,
      initialSettings.graphicsQuality,
      () => this.state.setWebGLError('Graphics context interrupted. Attempting recovery...'),
      () => this.state.setWebGLError(null),
    );

    this.textures = TextureFactory.createBundle(this.renderer.getMaxAnisotropy());
    const aspect = Math.max(container.clientWidth, 320) / Math.max(container.clientHeight, 240);
    this.sceneManager = new SceneManager(
      this.renderer.instance,
      this.textures,
      this.renderer.isSoftwareGl,
      aspect,
    );

    this.carController = new CarController(this.textures);
    this.carController.setCarSpec(getCarSpec(this.saveData.selectedCarId));
    this.trackManager = new TrackManager(this.textures);
    this.obstacleManager = new ObstacleManager(this.textures);
    this.collectibleManager = new CollectibleManager(this.textures);

    this.sceneManager.add(this.trackManager.group);
    this.sceneManager.add(this.carController.model.group);
    this.sceneManager.add(this.obstacleManager.group);
    this.sceneManager.add(this.collectibleManager.group);
    this.sceneManager.add(this.visualEffects.group);

    this.renderer.initPostProcessing(
      this.sceneManager.scene,
      this.sceneManager.cameraController.camera,
    );

    this.audioManager = new AudioManager(initialSettings);

    const inputEvents = {
      onLaneShift: (dir: -1 | 1) => {
        if (this.state.getStatus() !== 'playing') return;
        if (this.carController.shiftLane(dir)) {
          this.audioManager.playLaneShift(dir);
        }
      },
      onBoostChange: (active: boolean) => {
        if (this.state.getStatus() !== 'playing') {
          this.boostSystem.setManualHeld(false);
          return;
        }
        const triggered = this.boostSystem.setManualHeld(active);
        if (triggered) {
          this.audioManager.playBoostActivate();
          this.state.pushBanner('BOOST', 'cyan');
        }
      },
      onThrottleChange: (active: boolean) => this.carController.setThrottle(active),
      onPauseToggle: () => {
        if (this.uiModalBridge?.hasOpenModal()) return;
        const status = this.state.getStatus();
        if (status === 'playing') this.pause();
        else if (status === 'paused') this.resume();
      },
      onEscape: () => {
        if (this.uiModalBridge?.closeTopModal()) return;
        const status = this.state.getStatus();
        if (status === 'playing') this.pause();
        else if (status === 'paused') this.resume();
      },
      onInteraction: () => this.audioManager.unlock(),
    };

    this.keyboardController = new KeyboardController(inputEvents);
    this.touchController = new TouchController(container, inputEvents);

    this.settings.subscribe((next) => {
      this.saveManager.writeSettings(next);
      this.audioManager.updateSettings(next);
      this.renderer.setQuality(next.graphicsQuality);
    });

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('beforeunload', this.flushPendingSave);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.loop = new GameLoop(
      this.renderer.isSoftwareGl,
      () => this.renderer.getGlContext(),
      this.updateFrame,
    );
    this.loop.start();
  }

  public start(): void {
    this.audioManager.unlock();
    this.audioManager.nextMusicTrack();
    this.audioManager.playUiClick(true);
    this.resetRun();
    const openingLabel = this.seedOpeningHighway();
    this.state.setStatus('playing');
    this.state.pushBanner(`FORMATION · ${openingLabel}`, 'cyan');
  }

  public pause(): void {
    if (this.state.getStatus() !== 'playing') return;
    this.flushPendingSave();
    this.audioManager.playUiClick(false);
    this.keyboardController.reset();
    this.touchController.reset();
    const exactDistance = this.scoreManager.getExactDistance();
    const difficultyLevel = this.difficultyManager.getLevel(exactDistance, this.runElapsedSeconds);
    const zoneLabel = this.getZoneLabel(exactDistance);
    this.syncHudState(difficultyLevel, this.boostSystem.isAnyBoostActive(), zoneLabel);
    this.state.setStatus('paused');
  }

  public resume(): void {
    if (this.state.getStatus() !== 'paused') return;
    this.audioManager.unlock();
    this.audioManager.playUiClick(true);
    this.loop.flushDelta();
    this.state.setStatus('playing');
  }

  public returnToMenu(): void {
    this.flushPendingSave();
    this.audioManager.playUiClick(false);
    this.resetRun();
    this.state.setStatus('menu');
  }

  public toggleMute(): void {
    this.audioManager.unlock();
    const current = this.settings.get();
    this.settings.update({ muted: !current.muted });
    this.audioManager.playUiClick(false);
  }

  public updateSettings(patch: Partial<GameSettingsData>): void {
    this.settings.update(patch);
  }

  public playUiSound(confirm = false): void {
    this.audioManager.unlock();
    this.audioManager.playUiClick(confirm);
  }

  public triggerTouchLane(direction: -1 | 1): void {
    this.touchController.triggerLane(direction);
  }

  public setTouchBoost(active: boolean): void {
    this.touchController.setBoostHeld(active);
  }

  public setUiModalBridge(bridge: UiModalBridge | null): void {
    this.uiModalBridge = bridge;
  }

  public setGarageOpen(open: boolean): void {
    this.garagePreviewOpen = open;
    if (open) {
      if (this.state.getStatus() === 'gameover') {
        this.carController.reset();
        this.obstacleManager.reset();
        this.collectibleManager.reset();
        this.visualEffects.reset();
      }
      this.previewedCarId = this.saveData.selectedCarId;
      this.carController.setCarSpec(getCarSpec(this.previewedCarId));
      this.sceneManager.cameraController.setShowcaseMode('auto');
    } else {
      this.previewedCarId = this.saveData.selectedCarId;
      this.carController.setCarSpec(getCarSpec(this.saveData.selectedCarId));
    }
    this.syncProgressionState();
    this.state.notify();
  }

  public previewCar(carId: CarId): void {
    this.audioManager.unlock();
    this.audioManager.playUiClick(false);
    this.previewedCarId = carId;
    this.carController.setCarSpec(getCarSpec(carId));
    this.syncProgressionState();
    this.state.notify();
  }

  public setGarageCameraView(mode: 'auto' | 'front' | 'side' | 'rear' | 'manual'): void {
    this.audioManager.unlock();
    this.audioManager.playUiClick(false);
    this.sceneManager.cameraController.setShowcaseMode(mode);
  }

  public rotateGarageCamera(deltaRadians: number): void {
    this.sceneManager.cameraController.orbitShowcaseBy(deltaRadians);
  }

  public getGarageCameraView(): 'auto' | 'front' | 'side' | 'rear' | 'manual' {
    return this.sceneManager.cameraController.getShowcaseMode();
  }

  public selectCar(carId: CarId): boolean {
    if (!this.saveData.unlockedCars.includes(carId)) return false;
    this.audioManager.unlock();
    this.audioManager.playUiClick(true);
    this.saveData.selectedCarId = carId;
    this.previewedCarId = carId;
    this.saveManager.writeSaveData(this.saveData);
    this.carController.setCarSpec(getCarSpec(carId));
    this.syncProgressionState();
    this.state.notify();
    return true;
  }

  public unlockCar(carId: CarId): boolean {
    if (this.saveData.unlockedCars.includes(carId)) {
      return this.selectCar(carId);
    }
    const spec = getCarSpec(carId);
    if (
      this.saveData.coins < spec.costCoins ||
      this.saveData.bestDistance < spec.minBestDistance
    ) {
      return false;
    }

    this.audioManager.unlock();
    this.audioManager.playCollectible('score_crystal', 2);
    this.saveData.coins -= spec.costCoins;
    this.saveData.unlockedCars = [...this.saveData.unlockedCars, carId];
    this.saveData.selectedCarId = carId;
    this.previewedCarId = carId;
    this.announcedGoalId = null;
    this.saveManager.writeSaveData(this.saveData);

    this.carController.setCarSpec(spec);
    this.syncProgressionState();
    this.state.notify();
    return true;
  }

  public resetGarageProgress(): void {
    this.audioManager.unlock();
    this.audioManager.playUiClick(false);
    const defaultId = getCarSpec('sunshine_muscle').id;
    this.saveData.coins = 0;
    this.saveData.unlockedCars = [defaultId];
    this.saveData.selectedCarId = defaultId;
    this.previewedCarId = defaultId;
    this.announcedGoalId = null;
    this.saveManager.writeSaveData(this.saveData);

    this.carController.setCarSpec(getCarSpec(defaultId));
    this.syncProgressionState();
    this.state.notify();
  }

  private syncProgressionState(): void {
    const nextLocked = getNextLockedCar(this.saveData.unlockedCars);
    this.state.updateTelemetry({
      totalCoins: this.saveData.coins,
      selectedCarId: this.saveData.selectedCarId,
      previewCarId: this.previewedCarId,
      unlockedCars: [...this.saveData.unlockedCars],
      nextCarGoal: nextLocked
        ? {
            id: nextLocked.id,
            name: nextLocked.name,
            cost: nextLocked.costCoins,
            minBestDistance: nextLocked.minBestDistance,
          }
        : null,
    });
  }

  private resetRun(): void {
    this.currentSpeed = BASE_START_SPEED + this.carController.getCarSpec().speedBonus;
    this.spawnDistanceRemaining = 42;
    this.runElapsedSeconds = 0;
    this.lastAnnouncedLevel = 1;
    this.passed500m = false;
    this.passed1500m = false;
    this.passed2500m = false;
    this.passed3000m = false;
    this.passed5000m = false;
    this.passed8000m = false;
    this.lastScoreMilestone = 0;
    this.scoreFeverTimer = 0;
    this.waveDirector.reset();
    this.saveFlushTimer = 0;
    const nextGoal = getNextLockedCar(this.saveData.unlockedCars);
    this.announcedGoalId =
      nextGoal &&
      this.saveData.coins >= nextGoal.costCoins &&
      this.saveData.bestDistance >= nextGoal.minBestDistance
        ? nextGoal.id
        : null;

    this.boostSystem.reset();
    this.scoreManager.reset();
    this.carController.reset();
    this.trackManager.reset();
    this.obstacleManager.reset();
    this.collectibleManager.reset();
    this.visualEffects.reset();
    this.sceneManager.resetAtmosphere();
    this.sceneManager.cameraController.reset();
    this.keyboardController.reset();
    this.touchController.reset();

    this.syncProgressionState();
    this.state.updateTelemetry({
      score: 0,
      distance: 0,
      speedKmh: Math.round(this.currentSpeed * SPEED_TO_KMH),
      boostMeter: this.boostSystem.getMeter(),
      isBoosting: false,
      multiplier: 1,
      orbsCollected: 0,
      runCoins: 0,
      difficultyLevel: 1,
      bestScore: this.saveData.bestScore,
      bestDistance: this.saveData.bestDistance,
      isNewRecord: false,
      peakSpeedKmh: this.scoreManager.getPeakSpeedKmh(),
      crashCause: '',
      zoneLabel: '',
      eventBanner: null,
    });
  }

  private handleResize = (): void => {
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);
    this.sceneManager.cameraController.resize(width, height);
    this.renderer.resize(width, height);
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden && this.state.getStatus() === 'playing') {
      this.pause();
    }
  };

  private seedOpeningHighway(): string {
    this.collectibleManager.spawnRewardInLane(1, -44);
    const openingLabel = this.waveDirector.seedOpeningFormation();
    const openingZPositions = [-92, -144, -196, -248, -300];
    for (const zPos of openingZPositions) {
      this.spawnNextWave(1, zPos);
    }
    this.spawnDistanceRemaining = 24;
    return openingLabel;
  }

  private spawnNextWave(
    difficultyLevel: number,
    spawnZ = SPAWN_Z,
  ): { laneShiftSteps: number; spacingScale: number } {
    const exactDistance = this.scoreManager.getExactDistance();
    const lanes = LaneSystem.getAllLanes();
    const clearLanes = lanes.filter((l) =>
      this.obstacleManager.isLaneClearForSafeCorridor(l, this.currentSpeed, difficultyLevel, spawnZ),
    );
    const allowTwoLaneJump =
      !this.boostSystem.isAnyBoostActive() &&
      Math.random() < this.difficultyManager.getTwoLaneJumpChance(difficultyLevel);

    const plan = this.waveDirector.nextWave(difficultyLevel, clearLanes, allowTwoLaneJump);

    const spawnedBlocked = this.obstacleManager.spawnInLanes(
      plan.blockedLanes,
      this.currentSpeed,
      difficultyLevel,
      spawnZ,
      plan.obstacleKind,
      plan.relativeSpeedOverride,
      exactDistance,
    );

    const openLanes = lanes.filter((l) => !spawnedBlocked.includes(l));
    const rewardLane: LaneIndex =
      plan.preferRewardInSafeLane && openLanes.includes(plan.safeLane)
        ? plan.safeLane
        : openLanes[Math.floor(Math.random() * openLanes.length)];
    const isExpressZone = exactDistance >= 2500;
    this.collectibleManager.spawnRewardInLane(rewardLane, spawnZ, isExpressZone);
    return { laneShiftSteps: plan.laneShiftSteps, spacingScale: plan.spacingScale };
  }

  private updateFrame = (rawDt: number): void => {
    const dt = Number.isFinite(rawDt) ? Math.min(Math.max(rawDt, 0), 0.05) : 0.016;
    this.state.tickBanner(dt);
    const status = this.state.getStatus();

    if (this.garagePreviewOpen && (status === 'menu' || status === 'gameover')) {
      const showcaseSpeed = 20;
      const isBottomDock =
        this.container.clientWidth < 768 && this.container.clientHeight > 520;
      this.trackManager.update(dt, showcaseSpeed, false);
      this.sceneManager.update(dt, showcaseSpeed, false);
      this.carController.update(dt, showcaseSpeed, false, false, this.visualEffects.particles);
      this.visualEffects.update(dt, showcaseSpeed, false);
      this.sceneManager.cameraController.updateGarageShowcase(
        dt,
        this.carController.getX(),
        isBottomDock,
      );
      this.audioManager.update(dt, 'menu', 0.15, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    if (status === 'menu') {
      const cruiseSpeed = 34;
      this.trackManager.update(dt, cruiseSpeed, false);
      this.sceneManager.update(dt, cruiseSpeed, false);
      this.carController.update(dt, cruiseSpeed, false, true, this.visualEffects.particles);
      this.visualEffects.update(dt, cruiseSpeed, false);
      this.sceneManager.cameraController.updateAttract(dt, this.carController.getX());
      this.audioManager.update(dt, 'menu', 0.25, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    if (status === 'paused') {
      this.audioManager.update(dt, 'paused', 0, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    if (status === 'gameover') {
      this.carController.update(dt, 0, false, false, this.visualEffects.particles);
      this.visualEffects.update(dt, 0, false);
      this.sceneManager.cameraController.updateChase(dt, this.carController.getX(), 0, false);
      this.audioManager.update(dt, 'gameover', 0, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    if (this.carController.physics.isCrashed()) {
      this.state.setStatus('gameover');
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    this.runElapsedSeconds += dt;
    const exactDistance = this.scoreManager.getExactDistance();
    const zoneScoreMultiplier =
      exactDistance >= 8000 ? 2.5 : exactDistance >= 5000 ? 2.0 : exactDistance >= 2500 ? 1.5 : 1.0;
    const zoneLabel = this.getZoneLabel(exactDistance);
    const difficultyLevel = this.difficultyManager.getLevel(
      exactDistance,
      this.runElapsedSeconds,
    );

    if (!this.passed500m && exactDistance >= 500) {
      this.passed500m = true;
      this.state.pushBanner('500M · SPEED UP', 'cyan');
    }

    if (!this.passed1500m && exactDistance >= 1500) {
      this.passed1500m = true;
      this.state.pushBanner('1,500M · LASER SWEEPERS ACTIVE', 'magenta');
    }

    if (!this.passed2500m && exactDistance >= 2500) {
      this.passed2500m = true;
      this.boostSystem.addEnergy(100);
      this.audioManager.playMilestoneFanfare();
      this.state.pushBanner('2,500M EXPRESS · 1.5X SCORE', 'amber');
    }

    if (!this.passed3000m && exactDistance >= 3000) {
      this.passed3000m = true;
      this.state.pushBanner('3,000M · SHOCK PYLONS DEPLOYED', 'magenta');
    }

    if (!this.passed5000m && exactDistance >= 5000) {
      this.passed5000m = true;
      this.boostSystem.addEnergy(100);
      this.audioManager.playMilestoneFanfare();
      this.state.pushBanner('5,000M OVERCLOCK · 2.0X SCORE', 'amber');
    }

    if (!this.passed8000m && exactDistance >= 8000) {
      this.passed8000m = true;
      this.boostSystem.addEnergy(100);
      this.audioManager.playMilestoneFanfare();
      this.state.pushBanner('8,000M APEX ZONE · 2.5X SCORE', 'amber');
    }

    if (difficultyLevel > this.lastAnnouncedLevel) {
      this.lastAnnouncedLevel = difficultyLevel;
      if (
        difficultyLevel <= 10 ||
        difficultyLevel === 12 ||
        difficultyLevel === 15 ||
        difficultyLevel === 18 ||
        (difficultyLevel >= 20 && difficultyLevel % 5 === 0)
      ) {
        const tierMsg =
          difficultyLevel === 2
            ? 'TIER 2 · LIVE TRAFFIC'
            : difficultyLevel === 3
              ? 'TIER 3 · TIGHT CORRIDORS'
              : difficultyLevel === 4
                ? 'TIER 4 · SLALOM'
                : difficultyLevel === 5
                  ? 'TIER 5 · LASER SWEEPERS'
                  : difficultyLevel === 8
                    ? 'TIER 8 · SHOCK PYLONS'
                    : difficultyLevel === 10
                      ? 'TIER 10 · HIGH SPEED'
                      : difficultyLevel === 12
                        ? 'TIER 12 · OVERDRIVE'
                        : difficultyLevel === 15
                          ? 'TIER 15 · RUSH HOUR'
                          : difficultyLevel === 18
                            ? 'TIER 18 · FINAL TIER'
                            : `TIER ${difficultyLevel} · SPEED UP`;
        this.state.pushBanner(tierMsg, difficultyLevel >= 4 ? 'magenta' : 'amber');
      }
    }

    if (this.boostSystem.update(dt)) {
      this.audioManager.playBoostActivate();
      this.state.pushBanner('BOOST', 'cyan');
    }

    if (this.scoreFeverTimer > 0) {
      this.scoreFeverTimer = Math.max(0, this.scoreFeverTimer - dt);
    }
    const isFeverActive = this.scoreFeverTimer > 0;

    const isManualBoost = this.boostSystem.isManualBoosting();
    const isPadBoost = this.boostSystem.isPadBoosting();
    const isAnyBoost = this.boostSystem.isAnyBoostActive();

    let targetSpeed =
      this.difficultyManager.getBaseSpeed(exactDistance, this.runElapsedSeconds) +
      this.carController.getCarSpec().speedBonus;
    if (this.carController.isThrottling()) targetSpeed += THROTTLE_BONUS;
    if (isManualBoost) targetSpeed += BOOST_SPEED_BONUS;
    if (isPadBoost) targetSpeed += PAD_BOOST_BONUS;
    targetSpeed = Math.max(20, targetSpeed);

    const speedLambda = targetSpeed >= this.currentSpeed ? 4.2 : 3.2;
    this.currentSpeed = damp(this.currentSpeed, targetSpeed, speedLambda, dt);
    if (!Number.isFinite(this.currentSpeed)) {
      this.currentSpeed = BASE_START_SPEED;
    }

    const prevPlayerX = this.carController.getX();
    this.carController.update(
      dt,
      this.currentSpeed,
      isAnyBoost,
      false,
      this.visualEffects.particles,
    );
    const currPlayerX = this.carController.getX();

    this.obstacleManager.update(dt, this.currentSpeed, exactDistance, difficultyLevel);
    this.collectibleManager.update(dt, this.currentSpeed);

    this.collisionSystem.evaluate(
      prevPlayerX,
      currPlayerX,
      this.obstacleManager,
      this.collectibleManager,
      this.collisionReport,
    );

    if (this.collisionReport.crashed) {
      const crashFrac = clamp(this.collisionReport.crashTime, 0, 1);
      this.obstacleManager.snapToFraction(crashFrac);
      this.trackManager.update(dt * crashFrac, this.currentSpeed, isAnyBoost);
      this.sceneManager.update(
        dt * crashFrac,
        this.currentSpeed,
        isAnyBoost,
        exactDistance,
        this.runElapsedSeconds,
      );
      this.scoreManager.updateRun(
        dt * crashFrac,
        this.currentSpeed,
        isAnyBoost,
        zoneScoreMultiplier,
        isFeverActive,
      );
      this.processCollisionEvents(zoneScoreMultiplier, isFeverActive);
      this.visualEffects.update(dt, 0, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    this.scoreManager.updateRun(dt, this.currentSpeed, isAnyBoost, zoneScoreMultiplier, isFeverActive);
    this.trackManager.update(dt, this.currentSpeed, isAnyBoost);
    this.sceneManager.update(
      dt,
      this.currentSpeed,
      isAnyBoost,
      exactDistance,
      this.runElapsedSeconds,
    );
    this.visualEffects.update(dt, this.currentSpeed, isAnyBoost);

    this.spawnDistanceRemaining -= this.currentSpeed * dt;
    if (this.spawnDistanceRemaining <= 0) {
      const waveTiming = this.spawnNextWave(difficultyLevel);
      const postDist = this.scoreManager.getExactDistance();
      const projectedPeakSpeed = Math.max(
        this.currentSpeed,
        this.difficultyManager.getBaseSpeed(postDist, this.runElapsedSeconds) +
          this.carController.getCarSpec().speedBonus +
          (isAnyBoost ? PAD_BOOST_BONUS : THROTTLE_BONUS),
      );
      const baseSpacing = this.difficultyManager.getNextWaveSpacing(
        difficultyLevel,
        projectedPeakSpeed,
        waveTiming.laneShiftSteps,
      );
      const tierCompression = this.difficultyManager.getFormationCompression(difficultyLevel);
      const minHumanReactSec = waveTiming.laneShiftSteps >= 2 ? 0.48 : 0.33;
      const minSafeSpacing =
        projectedPeakSpeed * minHumanReactSec + (waveTiming.laneShiftSteps >= 2 ? 6.5 : 5);
      this.spawnDistanceRemaining = Math.max(
        24,
        minSafeSpacing,
        baseSpacing * waveTiming.spacingScale * tierCompression,
      );
    }

    this.processCollisionEvents(zoneScoreMultiplier, isFeverActive);
    if (this.state.getStatus() === 'playing') {
      this.checkScoreMilestone();
    }

    if (this.state.getStatus() === 'playing') {
      const speedNorm = clamp(
        (this.currentSpeed - BASE_START_SPEED) /
          (BASE_MAX_SPEED + PAD_BOOST_BONUS - BASE_START_SPEED),
        0,
        1,
      );
      this.sceneManager.cameraController.updateChase(
        dt,
        this.carController.getX(),
        speedNorm,
        isAnyBoost,
      );
      this.audioManager.update(dt, 'playing', speedNorm, isAnyBoost);

      this.syncHudState(difficultyLevel, isAnyBoost, zoneLabel);

      if (this.saveDirty) {
        this.saveFlushTimer += dt;
        if (this.saveFlushTimer >= 4) {
          this.flushPendingSave();
        }
      }
    }

    this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
  };

  private checkScoreMilestone(): void {
    const score = this.scoreManager.getScore();
    const milestoneStep = Math.floor(score / 1000);
    if (milestoneStep <= this.lastScoreMilestone) return;

    const stepsCrossed = milestoneStep - this.lastScoreMilestone;
    this.lastScoreMilestone = milestoneStep;
    const bonusCoins = 8 * stepsCrossed;

    this.saveData.coins += bonusCoins;
    this.scoreManager.addBonusCoins(bonusCoins);
    this.saveDirty = true;
    this.boostSystem.addEnergy(100);
    this.scoreFeverTimer = 8.0;

    this.state.pushBanner(
      `${milestoneStep.toLocaleString()}K · 2X SCORE +${bonusCoins} COINS`,
      'amber',
    );
    this.audioManager.playMilestoneFanfare();
    this.checkCarUnlockGoal();
  }

  private checkCarUnlockGoal(): void {
    const nextGoal = getNextLockedCar(this.saveData.unlockedCars);
    const liveBestDist = Math.max(this.saveData.bestDistance, this.scoreManager.getDistance());
    if (
      nextGoal &&
      this.saveData.coins >= nextGoal.costCoins &&
      liveBestDist >= nextGoal.minBestDistance &&
      this.announcedGoalId !== nextGoal.id
    ) {
      this.announcedGoalId = nextGoal.id;
      this.state.pushBanner(`CAR READY: ${nextGoal.name.toUpperCase()}`, 'amber');
    }
  }

  private processCollisionEvents(
    zoneScoreMultiplier: number,
    isFeverActive: boolean,
  ): void {
    let coinsChanged = false;
    for (const item of this.collisionReport.collected) {
      const reward = this.scoreManager.registerCollectible(
        item.kind,
        zoneScoreMultiplier,
        isFeverActive,
      );
      if (reward.coins > 0) {
        this.saveData.coins += reward.coins;
        coinsChanged = true;
      }

      if (item.kind === 'energy_orb') {
        this.boostSystem.addEnergy(16);
      } else if (item.kind === 'boost_cell') {
        this.boostSystem.addEnergy(38);
      }
      this.audioManager.playCollectible(item.kind, this.scoreManager.getMultiplier());
    }

    if (coinsChanged) {
      this.saveDirty = true;
      this.checkCarUnlockGoal();
    }

    if (!this.collisionReport.crashed && this.collisionReport.hitBoostPad) {
      this.boostSystem.activatePadBoost();
      this.scoreManager.registerBoostPad();
      this.audioManager.playBoostActivate();
    }

    if (!this.collisionReport.crashed && this.collisionReport.nearMissCount > 0) {
      const bonus = this.scoreManager.registerNearMiss(this.collisionReport.nearMissCount);
      this.boostSystem.addEnergy(8);
      this.audioManager.playNearMiss();
      this.state.pushBanner(`NEAR MISS +${bonus}`, 'magenta');
    }

    if (this.collisionReport.crashed) {
      this.handleCrash(this.collisionReport.crashCause, this.collisionReport.crashPosition);
    }
  }

  private handleCrash(cause: string, crashPosition: THREE.Vector3): void {
    if (this.state.getStatus() !== 'playing') return;

    this.currentSpeed = 0;
    this.carController.triggerCrash(crashPosition.x);
    this.sceneManager.cameraController.triggerShake(1.15);
    this.visualEffects.emitCrashExplosion(crashPosition);
    this.audioManager.playCrash();
    this.keyboardController.reset();
    this.touchController.reset();

    const finalScore = this.scoreManager.getScore();
    const finalDistance = this.scoreManager.getDistance();
    const exactFinalDistance = this.scoreManager.getExactDistance();
    const isNewRecord = finalScore > this.saveData.bestScore;

    if (isNewRecord) this.saveData.bestScore = finalScore;
    if (finalDistance > this.saveData.bestDistance) this.saveData.bestDistance = finalDistance;
    this.saveData.totalRuns += 1;
    this.saveData.totalOrbs += this.scoreManager.getOrbsCollected();
    this.saveDirty = false;
    this.saveFlushTimer = 0;
    this.saveManager.writeSaveData(this.saveData);

    this.syncProgressionState();
    this.state.updateTelemetry({
      score: finalScore,
      distance: finalDistance,
      speedKmh: 0,
      boostMeter: this.boostSystem.getMeter(),
      isBoosting: false,
      multiplier: this.scoreManager.getMultiplier(),
      orbsCollected: this.scoreManager.getOrbsCollected(),
      runCoins: this.scoreManager.getRunCoins(),
      difficultyLevel: this.difficultyManager.getLevel(
        exactFinalDistance,
        this.runElapsedSeconds,
      ),
      bestScore: this.saveData.bestScore,
      bestDistance: this.saveData.bestDistance,
      isNewRecord,
      peakSpeedKmh: this.scoreManager.getPeakSpeedKmh(),
      crashCause: cause,
    });
    this.state.setStatus('gameover');
  }

  private flushPendingSave = (): void => {
    if (!this.saveDirty) return;
    this.saveDirty = false;
    this.saveFlushTimer = 0;
    this.saveManager.writeSaveData(this.saveData);
  };

  private getZoneLabel(exactDistance: number): string {
    return exactDistance >= 8000
      ? 'APEX 2.5X'
      : exactDistance >= 5000
        ? 'OVERCLOCK 2X'
        : exactDistance >= 2500
          ? 'EXPRESS 1.5X'
          : '';
  }

  private syncHudState(
    difficultyLevel: number,
    isBoosting: boolean,
    zoneLabel: string,
  ): void {
    const currentScore = this.scoreManager.getScore();
    const currentDist = this.scoreManager.getDistance();
    this.syncProgressionState();
    this.state.updateTelemetry({
      score: currentScore,
      distance: currentDist,
      speedKmh: Math.round(this.currentSpeed * SPEED_TO_KMH),
      boostMeter: this.boostSystem.getMeter(),
      isBoosting,
      zoneLabel,
      multiplier: this.scoreManager.getMultiplier(),
      orbsCollected: this.scoreManager.getOrbsCollected(),
      runCoins: this.scoreManager.getRunCoins(),
      difficultyLevel,
      bestScore: Math.max(this.saveData.bestScore, currentScore),
      bestDistance: Math.max(this.saveData.bestDistance, currentDist),
      peakSpeedKmh: this.scoreManager.getPeakSpeedKmh(),
    });
    this.state.notify();
  }

  public dispose(): void {
    this.flushPendingSave();
    this.loop.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.flushPendingSave);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.keyboardController.dispose();
    this.touchController.dispose();
    this.audioManager.dispose();
    this.carController.dispose();
    this.trackManager.dispose();
    this.obstacleManager.dispose();
    this.collectibleManager.dispose();
    this.visualEffects.dispose();
    this.sceneManager.dispose();
    this.textures.dispose();
    this.renderer.dispose();
  }
}
