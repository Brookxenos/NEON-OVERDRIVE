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
  private readonly coinsEl: HTMLElement;

  constructor(actions: PauseMenuActions) {
    this.element = document.createElement('div');
    this.element.className = 'pause-overlay hidden';
    this.element.innerHTML = `
      <div class="animate-modal-enter pause-bar" role="dialog" aria-label="Game Paused">
        <div class="pause-bar-meta">
          <div class="pause-bar-heading">
            <span class="pause-indicator" aria-hidden="true"></span>
            <div class="pause-title-stack">
              <h2 class="font-display pause-bar-title">Paused</h2>
              <span class="pause-bar-subtitle">Hold · City View</span>
            </div>
          </div>
          <div class="pause-bar-stats">
            <div class="pause-stat-chip">
              <span class="pause-stat-label">Score</span>
              <strong class="font-mono-num pause-stat-score" data-role="score">0</strong>
            </div>
            <div class="pause-stat-chip">
              <span class="pause-stat-label">Distance</span>
              <strong class="font-mono-num pause-stat-dist" data-role="distance">0 m</strong>
            </div>
            <div class="pause-stat-chip pause-stat-chip-coins">
              <span class="pause-stat-label">Coins</span>
              <strong class="font-mono-num pause-stat-coins" data-role="coins">+0</strong>
            </div>
          </div>
        </div>
        <div class="pause-bar-actions">
          <button type="button" class="pause-btn pause-btn-primary" data-role="resume-btn">${ICON_PLAY}<span>Resume</span></button>
          <button type="button" class="pause-btn pause-btn-restart" data-role="restart-btn">${ICON_RESTART}<span>Restart</span></button>
          <button type="button" class="pause-btn pause-btn-secondary" data-role="settings-btn">${ICON_SETTINGS}<span>Settings</span></button>
          <button type="button" class="pause-btn pause-btn-ghost" data-role="menu-btn">${ICON_HOME}<span>Menu</span></button>
        </div>
      </div>
    `;

    this.scoreEl = this.element.querySelector('[data-role="score"]')!;
    this.distanceEl = this.element.querySelector('[data-role="distance"]')!;
    this.coinsEl = this.element.querySelector('[data-role="coins"]')!;

    this.element.querySelector('[data-role="resume-btn"]')!.addEventListener('click', actions.onResume);
    this.element.querySelector('[data-role="restart-btn"]')!.addEventListener('click', actions.onRestart);
    this.element.querySelector('[data-role="settings-btn"]')!.addEventListener('click', actions.onOpenSettings);
    this.element.querySelector('[data-role="menu-btn"]')!.addEventListener('click', actions.onMainMenu);
  }

  public update(snapshot: GameSnapshot): void {
    this.scoreEl.textContent = snapshot.score.toLocaleString();
    this.distanceEl.textContent = `${snapshot.distance.toLocaleString()} m`;
    this.coinsEl.textContent = `+${snapshot.runCoins.toLocaleString()}`;
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
