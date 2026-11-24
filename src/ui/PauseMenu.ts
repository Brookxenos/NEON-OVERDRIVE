import { GameSnapshot } from '../core/GameState';

const ICON_PLAY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
const ICON_RESTART = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_HOME = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

export interface PauseMenuActions {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export class PauseMenu {
  public readonly element: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly distanceEl: HTMLElement;

  constructor(actions: PauseMenuActions) {
    this.element = document.createElement('div');
    this.element.className = 'modal-backdrop hidden';
    this.element.innerHTML = `
      <div class="animate-modal-enter modal-card">
        <div class="modal-header">
          <p class="modal-kicker">NEON OVERDRIVE</p>
          <h2 class="font-display modal-title">Paused</h2>
          <div class="modal-submeta">
            <span>Score <strong class="font-mono-num" style="color:#fff" data-role="score">0</strong></span>
            <span style="color:#475569" aria-hidden="true">·</span>
            <span>Distance <strong class="font-mono-num" style="color:#67e8f9" data-role="distance">0 m</strong></span>
          </div>
        </div>
        <div class="modal-stack">
          <button type="button" class="btn-modal-primary" data-role="resume-btn">${ICON_PLAY}<span>Resume Race</span></button>
          <button type="button" class="btn-modal-secondary" data-role="restart-btn">${ICON_RESTART}<span>Restart Run</span></button>
          <button type="button" class="btn-modal-secondary" data-role="settings-btn">${ICON_SETTINGS}<span>Settings</span></button>
          <button type="button" class="btn-modal-ghost" data-role="menu-btn">${ICON_HOME}<span>Main Menu</span></button>
        </div>
      </div>
    `;

    this.scoreEl = this.element.querySelector('[data-role="score"]')!;
    this.distanceEl = this.element.querySelector('[data-role="distance"]')!;

    this.element.querySelector('[data-role="resume-btn"]')!.addEventListener('click', actions.onResume);
    this.element.querySelector('[data-role="restart-btn"]')!.addEventListener('click', actions.onRestart);
    this.element.querySelector('[data-role="settings-btn"]')!.addEventListener('click', actions.onOpenSettings);
    this.element.querySelector('[data-role="menu-btn"]')!.addEventListener('click', actions.onMainMenu);
  }

  public update(snapshot: GameSnapshot): void {
    this.scoreEl.textContent = snapshot.score.toLocaleString();
    this.distanceEl.textContent = `${snapshot.distance.toLocaleString()} m`;
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
