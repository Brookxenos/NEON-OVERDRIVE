import { GameSnapshot } from '../core/GameState';
import { CAR_CATALOG, getCarSpec } from '../vehicle/CarCatalog';

const ICON_TROPHY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const ICON_COIN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9.5 9.5h5"/><path d="M9.5 14.5h5"/></svg>`;
const ICON_GARAGE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const ICON_PLAY = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_VOLUME_ON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const ICON_VOLUME_OFF = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`;

export interface MainMenuActions {
  onStart: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenGarage: () => void;
}

export class MainMenu {
  public readonly element: HTMLElement;
  private readonly bestScoreEl: HTMLElement;
  private readonly bestDistanceEl: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly garageBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly carGoalCard: HTMLButtonElement;

  constructor(actions: MainMenuActions) {
    this.element = document.createElement('section');
    this.element.className = 'menu-screen';
    this.element.innerHTML = `
      <div class="menu-top-bar">
        <div class="record-badge">
          <span style="color:#67e8f9;display:inline-flex">${ICON_TROPHY}</span>
          <span class="record-label">Best</span>
          <span class="font-mono-num record-score" data-role="best-score">0</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span class="font-mono-num record-distance" data-role="best-distance">0 m</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span style="color:#fbbf24;display:inline-flex">${ICON_COIN}</span>
          <span class="font-mono-num" style="color:#fcd34d;font-weight:700;font-size:15px" data-role="wallet-coins">0</span>
        </div>
        <div class="menu-top-actions">
          <button type="button" class="icon-action-btn" data-role="garage-btn" aria-label="Open garage">
            ${ICON_GARAGE}
            <span>Cars</span>
          </button>
          <button type="button" class="icon-action-btn" data-role="mute-btn" aria-label="Toggle audio"></button>
          <button type="button" class="icon-action-btn" data-role="settings-btn" aria-label="Open settings">
            ${ICON_SETTINGS}
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div class="menu-hero">
        <p class="menu-kicker">Sunshine Boulevard Arcade Racer</p>
        <h1 class="font-display menu-title">NEON <span class="menu-title-accent">OVERDRIVE</span></h1>
      </div>

      <div class="menu-footer">
        <button type="button" class="menu-goal-card" data-role="car-goal-card"></button>
        <button type="button" class="btn-primary-cta" data-role="start-btn">
          ${ICON_PLAY}
          <span>Start Race</span>
        </button>
        <div class="controls-legend">
          <span><strong>A / D</strong> or <strong>← / →</strong> Switch Lanes</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span><strong>W / S</strong> Throttle / Brake</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span><strong>Space</strong> Overdrive Boost</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span><strong>Esc</strong> Pause</span>
          <span style="color:#475569" aria-hidden="true">·</span>
          <span style="color:#94a3b8">Mobile: Swipe or Touch Pads</span>
        </div>
      </div>
    `;

    this.bestScoreEl = this.element.querySelector('[data-role="best-score"]')!;
    this.bestDistanceEl = this.element.querySelector('[data-role="best-distance"]')!;
    this.coinsEl = this.element.querySelector('[data-role="wallet-coins"]')!;
    this.garageBtn = this.element.querySelector('[data-role="garage-btn"]')!;
    this.muteBtn = this.element.querySelector('[data-role="mute-btn"]')!;
    this.carGoalCard = this.element.querySelector('[data-role="car-goal-card"]')!;
    const startBtn = this.element.querySelector<HTMLButtonElement>('[data-role="start-btn"]')!;
    const settingsBtn = this.element.querySelector<HTMLButtonElement>('[data-role="settings-btn"]')!;

    startBtn.addEventListener('click', actions.onStart);
    this.garageBtn.addEventListener('click', actions.onOpenGarage);
    this.carGoalCard.addEventListener('click', actions.onOpenGarage);
    this.muteBtn.addEventListener('click', actions.onToggleMute);
    settingsBtn.addEventListener('click', actions.onOpenSettings);
  }

  public update(snapshot: GameSnapshot, muted: boolean): void {
    this.bestScoreEl.textContent = snapshot.bestScore.toLocaleString();
    this.bestDistanceEl.textContent = `${snapshot.bestDistance.toLocaleString()} m`;
    this.coinsEl.textContent = snapshot.totalCoins.toLocaleString();

    this.muteBtn.innerHTML = muted
      ? `${ICON_VOLUME_OFF}<span>Muted</span>`
      : `${ICON_VOLUME_ON}<span>Sound On</span>`;
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');

    const activeCar = getCarSpec(snapshot.selectedCarId);
    const goal = snapshot.nextCarGoal;
    const unlockReady = Boolean(
      goal &&
        snapshot.totalCoins >= goal.cost &&
        snapshot.bestDistance >= goal.minBestDistance,
    );
    this.garageBtn.classList.toggle('is-unlock-highlight', unlockReady);
    this.garageBtn.innerHTML = unlockReady
      ? `${ICON_GARAGE}<span>Unlock Car</span>`
      : `${ICON_GARAGE}<span>Cars (${snapshot.unlockedCars.length}/${CAR_CATALOG.length})</span>`;

    if (goal) {
      const coinRatio = Math.min(1, snapshot.totalCoins / Math.max(1, goal.cost));
      const distRatio = Math.min(
        1,
        snapshot.bestDistance / Math.max(1, goal.minBestDistance),
      );
      const pct = Math.round(((coinRatio + distRatio) * 0.5) * 100);
      const statusText = unlockReady
        ? `Ready to unlock ${goal.name}`
        : `${goal.name} · ${snapshot.totalCoins.toLocaleString()}/${goal.cost.toLocaleString()} Coins · ${snapshot.bestDistance.toLocaleString()}/${goal.minBestDistance.toLocaleString()} m`;
      this.carGoalCard.innerHTML = `
        <div class="menu-goal-row">
          <span>Car: <strong style="color:#ffffff">${activeCar.name}</strong></span>
          <span class="font-mono-num" style="color:${unlockReady ? '#4ade80' : '#fcd34d'}">${statusText}</span>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill ${unlockReady ? 'is-ready' : ''}" style="width:${pct}%"></div>
        </div>
      `;
    } else {
      this.carGoalCard.innerHTML = `
        <div class="menu-goal-row">
          <span>Car: <strong style="color:#ffffff">${activeCar.name}</strong></span>
          <span style="color:#4ade80;font-weight:700">All ${CAR_CATALOG.length} Cars Unlocked</span>
        </div>
      `;
    }
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
