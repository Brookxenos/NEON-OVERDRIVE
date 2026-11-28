import { GameSettingsData, TouchControlsMode } from '../settings/GameSettings';

const ICON_CLOSE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;

export interface SettingsMenuActions {
  onUpdate: (patch: Partial<GameSettingsData>) => void;
  onClose: () => void;
}

export class SettingsMenu {
  public readonly element: HTMLElement;
  private readonly volumeInput: HTMLInputElement;
  private readonly volumeLabel: HTMLElement;
  private readonly musicBtn: HTMLButtonElement;
  private readonly sfxBtn: HTMLButtonElement;
  private readonly qualityHighBtn: HTMLButtonElement;
  private readonly qualityBalBtn: HTMLButtonElement;
  private readonly touchBtns: Record<TouchControlsMode, HTMLButtonElement>;

  private currentSettings: GameSettingsData | null = null;

  constructor(actions: SettingsMenuActions) {
    this.element = document.createElement('div');
    this.element.className = 'modal-backdrop modal-backdrop-settings hidden';
    this.element.innerHTML = `
      <div class="animate-modal-enter modal-card modal-card-wide">
        <div class="settings-header-row">
          <div>
            <p class="modal-kicker modal-kicker-left">Configuration</p>
            <h2 class="font-display modal-title modal-title-sm">Game Settings</h2>
          </div>
          <button type="button" class="hud-square-btn modal-close-btn" data-role="close-btn" aria-label="Close settings">${ICON_CLOSE}</button>
        </div>

        <div class="settings-group">
          <div class="settings-label-row">
            <span>Master Volume</span>
            <span class="font-mono-num settings-val-accent" data-role="vol-label">20%</span>
          </div>
          <input type="range" min="0" max="100" value="20" class="volume-slider" data-role="vol-slider" />
        </div>

        <div class="toggle-grid">
          <button type="button" class="toggle-btn" data-role="music-btn">Music: On</button>
          <button type="button" class="toggle-btn" data-role="sfx-btn">SFX: On</button>
        </div>

        <div class="settings-group">
          <div class="settings-label-row"><span>Visual Bloom &amp; Effects</span></div>
          <div class="segmented-control segmented-2">
            <button type="button" class="segmented-btn" data-role="quality-high">High (Neon Bloom)</button>
            <button type="button" class="segmented-btn" data-role="quality-bal">Balanced (Fast)</button>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-label-row"><span>On-Screen Touch Buttons</span></div>
          <div class="segmented-control segmented-3">
            <button type="button" class="segmented-btn" data-role="touch-auto">Auto</button>
            <button type="button" class="segmented-btn" data-role="touch-always">Always</button>
            <button type="button" class="segmented-btn" data-role="touch-off">Off</button>
          </div>
        </div>

        <button type="button" class="btn-modal-primary" data-role="done-btn">Done</button>
      </div>
    `;

    this.volumeInput = this.element.querySelector('[data-role="vol-slider"]')!;
    this.volumeLabel = this.element.querySelector('[data-role="vol-label"]')!;
    this.musicBtn = this.element.querySelector('[data-role="music-btn"]')!;
    this.sfxBtn = this.element.querySelector('[data-role="sfx-btn"]')!;
    this.qualityHighBtn = this.element.querySelector('[data-role="quality-high"]')!;
    this.qualityBalBtn = this.element.querySelector('[data-role="quality-bal"]')!;
    this.touchBtns = {
      auto: this.element.querySelector('[data-role="touch-auto"]')!,
      always: this.element.querySelector('[data-role="touch-always"]')!,
      off: this.element.querySelector('[data-role="touch-off"]')!,
    };

    this.volumeInput.addEventListener('input', () => {
      const value = Number(this.volumeInput.value) / 100;
      actions.onUpdate({ masterVolume: value, muted: value === 0 });
    });

    this.musicBtn.addEventListener('click', () => {
      if (!this.currentSettings) return;
      actions.onUpdate({ musicEnabled: !this.currentSettings.musicEnabled });
    });

    this.sfxBtn.addEventListener('click', () => {
      if (!this.currentSettings) return;
      actions.onUpdate({ sfxEnabled: !this.currentSettings.sfxEnabled });
    });

    this.qualityHighBtn.addEventListener('click', () =>
      actions.onUpdate({ graphicsQuality: 'high' }),
    );
    this.qualityBalBtn.addEventListener('click', () =>
      actions.onUpdate({ graphicsQuality: 'balanced' }),
    );

    this.touchBtns.auto.addEventListener('click', () =>
      actions.onUpdate({ showTouchControls: 'auto' }),
    );
    this.touchBtns.always.addEventListener('click', () =>
      actions.onUpdate({ showTouchControls: 'always' }),
    );
    this.touchBtns.off.addEventListener('click', () =>
      actions.onUpdate({ showTouchControls: 'off' }),
    );

    this.element.querySelector('[data-role="close-btn"]')!.addEventListener('click', actions.onClose);
    this.element.querySelector('[data-role="done-btn"]')!.addEventListener('click', actions.onClose);
  }

  public update(settings: GameSettingsData): void {
    this.currentSettings = settings;
    const pct = Math.round(settings.masterVolume * 100);
    this.volumeInput.value = String(pct);
    this.volumeLabel.textContent = `${pct}%`;

    this.musicBtn.textContent = `Music: ${settings.musicEnabled ? 'On' : 'Off'}`;
    this.musicBtn.classList.toggle('is-on', settings.musicEnabled);

    this.sfxBtn.textContent = `SFX: ${settings.sfxEnabled ? 'On' : 'Off'}`;
    this.sfxBtn.classList.toggle('is-on', settings.sfxEnabled);

    this.qualityHighBtn.classList.toggle('is-active', settings.graphicsQuality === 'high');
    this.qualityBalBtn.classList.toggle('is-active', settings.graphicsQuality === 'balanced');

    (['auto', 'always', 'off'] as const).forEach((mode) => {
      this.touchBtns[mode].classList.toggle('is-active', settings.showTouchControls === mode);
    });
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
