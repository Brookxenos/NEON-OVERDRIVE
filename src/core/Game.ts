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
  BRAKE_PENALTY,
  COLORS,
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
  private hudSyncTimer = 0;
  private saveFlushTimer = 0;
  private saveDirty = false;
  private announcedGoalId: CarId | null = null;
  private garagePreviewOpen = false;
  private previewedCarId: CarId;
  private readonly boostBurstPos = new THREE.Vector3();

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
          this.state.pushBanner('OVERDRIVE ENGAGED', 'cyan');
        }
      },
      onThrottleChange: (active: boolean) => this.carController.setThrottle(active),
      onBrakeChange: (active: boolean) => this.carController.setBrake(active),
      onPauseToggle: () => {
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

    this.loop = new GameLoop(
      this.renderer.isSoftwareGl,
      () => this.renderer.getGlContext(),
      this.updateFrame,
    );
    this.loop.start();
  }

  public start(): void {
    this.audioManager.unlock();
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

  public setGarageCameraView(mode: 'auto' | 'front' | 'side' | 'rear'): void {
    this.audioManager.unlock();
    this.audioManager.playUiClick(false);
    this.sceneManager.cameraController.setShowcaseMode(mode);
  }

  public getGarageCameraView(): 'auto' | 'front' | 'side' | 'rear' {
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
    if (this.saveData.coins < spec.costCoins) {
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
        ? { id: nextLocked.id, name: nextLocked.name, cost: nextLocked.costCoins }
        : null,
    });
  }

  private resetRun(): void {
    this.currentSpeed = BASE_START_SPEED + this.carController.getCarSpec().speedBonus;
    this.spawnDistanceRemaining = 42;
    this.runElapsedSeconds = 0;
    this.lastAnnouncedLevel = 1;
    this.waveDirector.reset();
    this.hudSyncTimer = 0;
    this.saveFlushTimer = 0;
    const nextGoal = getNextLockedCar(this.saveData.unlockedCars);
    this.announcedGoalId =
      nextGoal && this.saveData.coins >= nextGoal.costCoins ? nextGoal.id : null;

    this.boostSystem.reset();
    this.scoreManager.reset();
    this.carController.reset();
    this.obstacleManager.reset();
    this.collectibleManager.reset();
    this.visualEffects.reset();
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
      eventBanner: null,
    });
  }

  private handleResize = (): void => {
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);
    this.sceneManager.cameraController.resize(width, height);
    this.renderer.resize(width, height);
  };

  private seedOpeningHighway(): string {
    // Populate starter rewards and a randomized 5-wave tactical opening formation on every start/restart
    this.collectibleManager.spawnRewardInLane(1, -44);
    const openingLabel = this.waveDirector.seedOpeningFormation();
    const openingZPositions = [-96, -152, -208, -264, -320];
    for (const zPos of openingZPositions) {
      this.spawnNextWave(1, zPos);
    }
    this.spawnDistanceRemaining = 26;
    return openingLabel;
  }

  private spawnNextWave(
    difficultyLevel: number,
    spawnZ = SPAWN_Z,
  ): { laneShiftSteps: number; spacingScale: number } {
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
    );

    const openLanes = lanes.filter((l) => !spawnedBlocked.includes(l));
    const rewardLane: LaneIndex =
      plan.preferRewardInSafeLane && openLanes.includes(plan.safeLane)
        ? plan.safeLane
        : openLanes[Math.floor(Math.random() * openLanes.length)];
    this.collectibleManager.spawnRewardInLane(rewardLane, spawnZ);
    return { laneShiftSteps: plan.laneShiftSteps, spacingScale: plan.spacingScale };
  }

  private updateFrame = (dt: number): void => {
    this.state.tickBanner(dt);
    const status = this.state.getStatus();

    if (this.garagePreviewOpen && (status === 'menu' || status === 'gameover')) {
      const showcaseSpeed = 20;
      const isNarrow = this.container.clientWidth < 768;
      this.trackManager.update(dt, showcaseSpeed, false);
      this.sceneManager.update(dt, showcaseSpeed, false);
      this.carController.update(dt, showcaseSpeed, false, false, this.visualEffects.particles);
      this.visualEffects.update(dt, showcaseSpeed, false);
      this.sceneManager.cameraController.updateGarageShowcase(
        dt,
        this.carController.getX(),
        isNarrow,
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

    // Active racing simulation
    if (this.carController.physics.isCrashed()) {
      this.state.setStatus('gameover');
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    this.runElapsedSeconds += dt;
    const exactDistance = this.scoreManager.getExactDistance();
    const difficultyLevel = this.difficultyManager.getLevel(
      exactDistance,
      this.runElapsedSeconds,
    );

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
            ? 'TIER 2 · TRAFFIC INTENSIFIES'
            : difficultyLevel === 3
              ? 'TIER 3 · TIGHT CORRIDORS'
              : difficultyLevel === 4
                ? 'TIER 4 · SLALOM LOCKDOWN'
                : difficultyLevel === 5
                  ? 'TIER 5 · GAUNTLET CROSSFIRE'
                  : difficultyLevel === 8
                    ? 'TIER 8 · PHANTOM ZIG-ZAG'
                    : difficultyLevel === 10
                      ? 'TIER 10 · VELOCITY CHOKE'
                      : difficultyLevel === 12
                        ? 'TIER 12 · OVERDRIVE BLITZ'
                        : difficultyLevel === 15
                          ? 'TIER 15 · RUSH HOUR CONVOY'
                          : difficultyLevel === 18
                            ? 'TIER 18 · APEX HELLSTORM'
                            : `TIER ${difficultyLevel} · VELOCITY SURGE`;
        this.state.pushBanner(tierMsg, difficultyLevel >= 4 ? 'magenta' : 'amber');
      }
    }

    if (this.boostSystem.update(dt)) {
      this.audioManager.playBoostActivate();
      this.state.pushBanner('OVERDRIVE ENGAGED', 'cyan');
    }

    const isManualBoost = this.boostSystem.isManualBoosting();
    const isPadBoost = this.boostSystem.isPadBoosting();
    const isAnyBoost = this.boostSystem.isAnyBoostActive();

    let targetSpeed =
      this.difficultyManager.getBaseSpeed(exactDistance, this.runElapsedSeconds) +
      this.carController.getCarSpec().speedBonus;
    if (this.carController.isThrottling()) targetSpeed += THROTTLE_BONUS;
    if (this.carController.isBraking() && !isAnyBoost) targetSpeed -= BRAKE_PENALTY;
    if (isManualBoost) targetSpeed += BOOST_SPEED_BONUS;
    if (isPadBoost) targetSpeed += PAD_BOOST_BONUS;
    targetSpeed = Math.max(20, targetSpeed);

    const speedLambda = targetSpeed >= this.currentSpeed ? 4.2 : 3.2;
    this.currentSpeed = damp(this.currentSpeed, targetSpeed, speedLambda, dt);

    const prevPlayerX = this.carController.getX();
    this.carController.update(
      dt,
      this.currentSpeed,
      isAnyBoost,
      false,
      this.visualEffects.particles,
    );
    const currPlayerX = this.carController.getX();

    this.obstacleManager.update(dt, this.currentSpeed);
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
      this.sceneManager.update(dt * crashFrac, this.currentSpeed, isAnyBoost);
      this.scoreManager.updateRun(dt * crashFrac, this.currentSpeed, isAnyBoost);
      this.processCollisionEvents();
      this.visualEffects.update(dt, 0, false);
      this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
      return;
    }

    this.scoreManager.updateRun(dt, this.currentSpeed, isAnyBoost);
    this.trackManager.update(dt, this.currentSpeed, isAnyBoost);
    this.sceneManager.update(dt, this.currentSpeed, isAnyBoost);
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
      const minHumanReactSec = waveTiming.laneShiftSteps >= 2 ? 0.54 : 0.38;
      const minSafeSpacing =
        projectedPeakSpeed * minHumanReactSec + (waveTiming.laneShiftSteps >= 2 ? 7 : 6);
      this.spawnDistanceRemaining = Math.max(
        28,
        minSafeSpacing,
        baseSpacing * waveTiming.spacingScale * tierCompression,
      );
    }

    this.processCollisionEvents();

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

      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.042) {
        this.hudSyncTimer = 0;
        this.syncHudState(difficultyLevel, isAnyBoost);
      }

      if (this.saveDirty) {
        this.saveFlushTimer += dt;
        if (this.saveFlushTimer >= 4) {
          this.flushPendingSave();
        }
      }
    }

    this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraController.camera);
  };

  private processCollisionEvents(): void {
    let coinsChanged = false;
    for (const item of this.collisionReport.collected) {
      const reward = this.scoreManager.registerCollectible(item.kind);
      if (reward.coins > 0) {
        this.saveData.coins += reward.coins;
        coinsChanged = true;
      }

      if (item.kind === 'energy_orb') {
        this.boostSystem.addEnergy(16);
        this.visualEffects.emitCollectibleBurst(item.position, COLORS.neonCyan, 16, 8);
      } else if (item.kind === 'score_crystal') {
        this.visualEffects.emitCollectibleBurst(item.position, COLORS.energyAmber, 20, 10);
        this.state.pushBanner(`+${reward.coins} COINS · +${reward.points}`, 'amber');
      } else {
        this.boostSystem.addEnergy(38);
        this.visualEffects.emitCollectibleBurst(item.position, COLORS.electricBlue, 20, 10);
        this.state.pushBanner(`+38% BOOST · +${reward.coins} COINS`, 'blue');
      }
      this.audioManager.playCollectible(item.kind, this.scoreManager.getMultiplier());
    }

    if (coinsChanged) {
      this.saveDirty = true;
      const nextGoal = getNextLockedCar(this.saveData.unlockedCars);
      if (
        nextGoal &&
        this.saveData.coins >= nextGoal.costCoins &&
        this.announcedGoalId !== nextGoal.id
      ) {
        this.announcedGoalId = nextGoal.id;
        this.state.pushBanner(`CAR UNLOCK READY: ${nextGoal.name.toUpperCase()}`, 'amber');
      }
    }

    if (!this.collisionReport.crashed && this.collisionReport.hitBoostPad) {
      this.boostSystem.activatePadBoost();
      this.scoreManager.registerBoostPad();
      this.audioManager.playBoostActivate();
      this.boostBurstPos.set(this.carController.getX(), 0.5, 0);
      this.visualEffects.emitCollectibleBurst(
        this.boostBurstPos,
        COLORS.neonCyan,
        22,
        11,
      );
      this.state.pushBanner('TURBO PAD SURGE', 'cyan');
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

  private syncHudState(difficultyLevel: number, isBoosting: boolean): void {
    const currentScore = this.scoreManager.getScore();
    const currentDist = this.scoreManager.getDistance();
    this.syncProgressionState();
    this.state.updateTelemetry({
      score: currentScore,
      distance: currentDist,
      speedKmh: Math.round(this.currentSpeed * SPEED_TO_KMH),
      boostMeter: this.boostSystem.getMeter(),
      isBoosting,
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
