import { GameSnapshot } from '../core/GameState';

const ICON_TROPHY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const ICON_RESTART = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
const ICON_GARAGE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const ICON_HOME = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

export interface GameOverActions {
  onRestart: () => void;
  onMainMenu: () => void;
  onOpenGarage: () => void;
}

export class GameOverScreen {
  public readonly element: HTMLElement;
  private readonly causeEl: HTMLElement;
  private readonly recordBadgeEl: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly bestScoreEl: HTMLElement;
  private readonly distanceEl: HTMLElement;
  private readonly peakSpeedEl: HTMLElement;
  private readonly goalBoxEl: HTMLElement;
  private readonly garageBtn: HTMLButtonElement;

  constructor(actions: GameOverActions) {
    this.element = document.createElement('div');
    this.element.className = 'modal-backdrop hidden';
    this.element.innerHTML = `
      <div class="animate-modal-enter modal-card modal-card-wide modal-card-danger">
        <div class="modal-header">
          <p class="modal-kicker modal-kicker-danger" data-role="cause">Collision</p>
          <h2 class="font-display modal-title">Race Over</h2>
          <div class="new-record-line hidden" data-role="record-badge">
            ${ICON_TROPHY}
            <span>New Best Score</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Final Score</div>
            <div class="font-mono-num stat-tile-value" data-role="score">0</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Best Score</div>
            <div class="font-mono-num stat-tile-value" style="color:#67e8f9" data-role="best-score">0</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Distance</div>
            <div class="font-mono-num stat-tile-value" style="font-size:19px" data-role="distance">0 m</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Peak Speed</div>
            <div class="font-mono-num stat-tile-value" style="font-size:19px;color:#d8b4fe" data-role="peak-speed">0 KM/H</div>
          </div>
        </div>

        <div class="garage-goal-banner" style="margin-bottom:18px" data-role="goal-box"></div>

        <div class="modal-row-actions">
          <button type="button" class="btn-modal-primary" style="flex:1" data-role="restart-btn">${ICON_RESTART}<span>Race Again</span></button>
          <button type="button" class="btn-modal-secondary" style="width:auto;padding:0 16px" data-role="garage-btn">${ICON_GARAGE}<span>Cars</span></button>
          <button type="button" class="btn-modal-secondary" style="width:auto;padding:0 16px" data-role="menu-btn">${ICON_HOME}<span>Menu</span></button>
        </div>
      </div>
    `;

    this.causeEl = this.element.querySelector('[data-role="cause"]')!;
    this.recordBadgeEl = this.element.querySelector('[data-role="record-badge"]')!;
    this.scoreEl = this.element.querySelector('[data-role="score"]')!;
    this.bestScoreEl = this.element.querySelector('[data-role="best-score"]')!;
    this.distanceEl = this.element.querySelector('[data-role="distance"]')!;
    this.peakSpeedEl = this.element.querySelector('[data-role="peak-speed"]')!;
    this.goalBoxEl = this.element.querySelector('[data-role="goal-box"]')!;
    this.garageBtn = this.element.querySelector('[data-role="garage-btn"]')!;

    this.element.querySelector('[data-role="restart-btn"]')!.addEventListener('click', actions.onRestart);
    this.garageBtn.addEventListener('click', actions.onOpenGarage);
    this.element.querySelector('[data-role="menu-btn"]')!.addEventListener('click', actions.onMainMenu);
  }

  public update(snapshot: GameSnapshot): void {
    this.causeEl.textContent = snapshot.crashCause || 'Collision';
    this.recordBadgeEl.classList.toggle('hidden', !snapshot.isNewRecord);
    this.scoreEl.textContent = snapshot.score.toLocaleString();
    this.bestScoreEl.textContent = snapshot.bestScore.toLocaleString();
    this.distanceEl.textContent = `${snapshot.distance.toLocaleString()} m`;
    this.peakSpeedEl.textContent = `${snapshot.peakSpeedKmh} KM/H`;

    const goal = snapshot.nextCarGoal;
    const unlockReady = Boolean(
      goal &&
        snapshot.totalCoins >= goal.cost &&
        snapshot.bestDistance >= goal.minBestDistance,
    );
    this.garageBtn.classList.toggle('is-unlock-highlight', unlockReady);
    this.garageBtn.innerHTML = unlockReady
      ? `${ICON_GARAGE}<span>Unlock</span>`
      : `${ICON_GARAGE}<span>Cars</span>`;

    if (goal) {
      const coinRatio = Math.min(1, snapshot.totalCoins / Math.max(1, goal.cost));
      const distRatio = Math.min(
        1,
        snapshot.bestDistance / Math.max(1, goal.minBestDistance),
      );
      const pct = Math.round(((coinRatio + distRatio) * 0.5) * 100);
      this.goalBoxEl.innerHTML = `
        <div class="garage-goal-top">
          <span>Run: <strong style="color:#fcd34d">+${snapshot.runCoins} Coins</strong> · Wallet: <strong style="color:#ffffff">${snapshot.totalCoins.toLocaleString()}</strong></span>
          <span class="font-mono-num" style="color:${unlockReady ? '#4ade80' : '#fcd34d'}">
            ${
              unlockReady
                ? `${goal.name} Ready`
                : `${goal.name}: ${snapshot.totalCoins.toLocaleString()}/${goal.cost.toLocaleString()} · ${snapshot.bestDistance.toLocaleString()}/${goal.minBestDistance.toLocaleString()}m`
            }
          </span>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill ${unlockReady ? 'is-ready' : ''}" style="width:${pct}%"></div>
        </div>
      `;
    } else {
      this.goalBoxEl.innerHTML = `
        <div class="garage-goal-top">
          <span>Run: <strong style="color:#fcd34d">+${snapshot.runCoins} Coins</strong> · Wallet: <strong style="color:#ffffff">${snapshot.totalCoins.toLocaleString()}</strong></span>
          <span style="color:#4ade80;font-weight:700">All Cars Unlocked</span>
        </div>
      `;
    }
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
