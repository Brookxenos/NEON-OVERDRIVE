import { Game } from '../core/Game';
import { GameSnapshot } from '../core/GameState';
import { GameSettingsData } from '../settings/GameSettings';
import { GameHUD } from './GameHUD';
import { GameOverScreen } from './GameOverScreen';
import { GarageModal } from './GarageModal';
import { MainMenu } from './MainMenu';
import { PauseMenu } from './PauseMenu';
import { SettingsMenu } from './SettingsMenu';

export class UIManager {
  private readonly game: Game;
  private readonly root: HTMLElement;
  private readonly errorBanner: HTMLElement;

  private readonly mainMenu: MainMenu;
  private readonly gameHud: GameHUD;
  private readonly pauseMenu: PauseMenu;
  private readonly gameOverScreen: GameOverScreen;
  private readonly settingsMenu: SettingsMenu;
  private readonly garageModal: GarageModal;

  private settingsOpen = false;
  private garageOpen = false;
  private isTouchDevice = false;
  private latestSnapshot: GameSnapshot;
  private latestSettings: GameSettingsData;
  private readonly unsubState: () => void;
  private readonly unsubSettings: () => void;

  constructor(uiRoot: HTMLElement, game: Game) {
    this.root = uiRoot;
    this.game = game;
    this.latestSnapshot = game.state.getSnapshot();
    this.latestSettings = game.settings.get();

    this.errorBanner = document.createElement('div');
    this.errorBanner.className = 'webgl-error-banner hidden';
    this.root.appendChild(this.errorBanner);

    const openGarage = () => {
      this.game.playUiSound(false);
      this.settingsOpen = false;
      this.garageOpen = true;
      this.game.setGarageOpen(true);
      this.render();
    };

    this.mainMenu = new MainMenu({
      onStart: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.start();
      },
      onToggleMute: () => this.game.toggleMute(),
      onOpenSettings: () => {
        this.game.playUiSound(false);
        this.garageOpen = false;
        this.settingsOpen = true;
        this.render();
      },
      onOpenGarage: openGarage,
    });

    this.gameHud = new GameHUD({
      onPause: () => this.game.pause(),
      onToggleMute: () => this.game.toggleMute(),
      onTouchSteer: (dir) => this.game.triggerTouchLane(dir),
      onTouchBoost: (active) => this.game.setTouchBoost(active),
    });

    this.pauseMenu = new PauseMenu({
      onResume: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.resume();
      },
      onRestart: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.start();
      },
      onOpenSettings: () => {
        this.game.playUiSound(false);
        this.garageOpen = false;
        this.settingsOpen = true;
        this.render();
      },
      onMainMenu: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.returnToMenu();
      },
    });

    this.gameOverScreen = new GameOverScreen({
      onRestart: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.start();
      },
      onMainMenu: () => {
        this.settingsOpen = false;
        this.garageOpen = false;
        this.game.returnToMenu();
      },
      onOpenGarage: openGarage,
    });

    this.settingsMenu = new SettingsMenu({
      onUpdate: (patch) => this.game.updateSettings(patch),
      onClose: () => {
        this.game.playUiSound(false);
        this.settingsOpen = false;
        this.render();
      },
    });

    this.garageModal = new GarageModal({
      onPreviewCar: (carId) => this.game.previewCar(carId),
      onSelectCar: (carId) => this.game.selectCar(carId),
      onUnlockCar: (carId) => this.game.unlockCar(carId),
      onResetGarage: () => this.game.resetGarageProgress(),
      onSetCameraView: (mode) => this.game.setGarageCameraView(mode),
      getCameraView: () => this.game.getGarageCameraView(),
      onClose: () => {
        this.game.playUiSound(false);
        this.garageOpen = false;
        this.game.setGarageOpen(false);
        this.render();
      },
    });

    this.root.append(
      this.mainMenu.element,
      this.gameHud.element,
      this.pauseMenu.element,
      this.gameOverScreen.element,
      this.settingsMenu.element,
      this.garageModal.element,
    );

    this.detectTouchCapability();
    window.addEventListener('resize', this.detectTouchCapability);

    this.unsubState = this.game.state.subscribe((snapshot) => {
      this.latestSnapshot = snapshot;
      this.render();
    });

    this.unsubSettings = this.game.settings.subscribe((settings) => {
      this.latestSettings = settings;
      this.render();
    });

    this.render();
  }

  private detectTouchCapability = (): void => {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isTouchDevice =
      coarse || (hasTouch && window.innerWidth < 1024) || window.innerWidth < 640;
    this.render();
  };

  private shouldShowTouchPad(): boolean {
    if (this.latestSettings.showTouchControls === 'always') return true;
    if (this.latestSettings.showTouchControls === 'off') return false;
    return this.isTouchDevice;
  }

  private render(): void {
    const snap = this.latestSnapshot;
    const muted = this.latestSettings.muted;

    if (snap.webglError) {
      this.errorBanner.textContent = snap.webglError;
      this.errorBanner.classList.remove('hidden');
    } else {
      this.errorBanner.classList.add('hidden');
    }

    this.mainMenu.setVisible(snap.status === 'menu' && !this.garageOpen);
    this.gameHud.setVisible(snap.status === 'playing');
    this.pauseMenu.setVisible(snap.status === 'paused');
    this.gameOverScreen.setVisible(snap.status === 'gameover' && !this.garageOpen);
    this.settingsMenu.setVisible(this.settingsOpen);
    this.garageModal.setVisible(this.garageOpen);

    if (snap.status === 'menu') {
      this.mainMenu.update(snap, muted);
    } else if (snap.status === 'playing') {
      this.gameHud.update(snap, muted, this.shouldShowTouchPad());
    } else if (snap.status === 'paused') {
      this.pauseMenu.update(snap);
    } else if (snap.status === 'gameover') {
      this.gameOverScreen.update(snap);
    }

    if (this.settingsOpen) {
      this.settingsMenu.update(this.latestSettings);
    }
    if (this.garageOpen) {
      this.garageModal.update(snap);
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.detectTouchCapability);
    this.unsubState();
    this.unsubSettings();
  }
}
