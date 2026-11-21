import { GameSnapshot } from '../core/GameState';

const ICON_PAUSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
const ICON_VOLUME_ON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const ICON_VOLUME_OFF = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`;
const ICON_ZAP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
const ICON_LEFT = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const ICON_RIGHT = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

export interface GameHUDActions {
  onPause: () => void;
  onToggleMute: () => void;
  onTouchSteer: (dir: -1 | 1) => void;
  onTouchBoost: (active: boolean) => void;
}

export class GameHUD {
  public readonly element: HTMLElement;

  private readonly scoreEl: HTMLElement;
  private readonly multiplierEl: HTMLElement;
  private readonly orbsEl: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly tierEl: HTMLElement;
  private readonly goalHintEl: HTMLElement;
  private readonly speedEl: HTMLElement;
  private readonly distanceEl: HTMLElement;
  private readonly boostStatusEl: HTMLElement;
  private readonly boostPercentEl: HTMLElement;
  private readonly boostFillEl: HTMLElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly bannerSlot: HTMLElement;
  private readonly bottomHint: HTMLElement;
  private readonly bottomBestEl: HTMLElement;
  private readonly touchBar: HTMLElement;
  private readonly touchBoostBtn: HTMLButtonElement;

  private lastBannerId = -1;

  constructor(actions: GameHUDActions) {
    this.element = document.createElement('section');
    this.element.className = 'hud-overlay hidden';
    this.element.innerHTML = `
      <div class="hud-top-row">
        <div class="hud-panel">
          <div class="hud-score-header">
            <span class="hud-kicker">Score</span>
            <span class="font-display hud-multiplier" data-role="multiplier">1x Multiplier</span>
          </div>
          <div class="font-mono-num hud-score-value" data-role="score">0</div>
          <div class="hud-sub-stats">
            <span>Orbs <strong class="font-mono-num" style="color:#67e8f9" data-role="orbs">0</strong></span>
            <span style="color:#475569" aria-hidden="true">·</span>
            <span>Coins <strong class="font-mono-num" style="color:#fcd34d" data-role="coins">0</strong></span>
            <span style="color:#475569" aria-hidden="true">·</span>
            <span>Tier <strong class="font-mono-num" style="color:#d8b4fe" data-role="tier">1</strong></span>
          </div>
          <div class="hud-goal-hint" data-role="goal-hint"></div>
        </div>

        <div class="hud-banner-slot" data-role="banner-slot"></div>

        <div class="hud-right-cluster">
          <div class="hud-panel hud-panel-right">
            <div class="hud-speed-row">
              <div>
                <div class="hud-kicker">Speed</div>
                <div class="font-mono-num hud-speed-value">
                  <span data-role="speed">166</span> <span class="hud-speed-unit">KM/H</span>
                </div>
              </div>
              <div style="text-align:right">
                <div class="hud-kicker">Distance</div>
                <div class="font-mono-num hud-distance-value" data-role="distance">0 m</div>
              </div>
            </div>
            <div class="hud-boost-wrap">
              <div class="hud-boost-labels">
                <span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#cbd5e1">
                  <span style="color:#22d3ee;display:inline-flex">${ICON_ZAP}</span>
                  <span data-role="boost-status">Boost Energy</span>
                </span>
                <span class="font-mono-num" style="color:#67e8f9;font-weight:700" data-role="boost-pct">100%</span>
              </div>
              <div class="hud-boost-track">
                <div class="hud-boost-fill" data-role="boost-fill" style="width:100%"></div>
              </div>
            </div>
          </div>

          <div class="hud-quick-buttons">
            <button type="button" class="hud-square-btn" data-role="pause-btn" aria-label="Pause game">${ICON_PAUSE}</button>
            <button type="button" class="hud-square-btn" data-role="mute-btn" aria-label="Toggle audio">${ICON_VOLUME_ON}</button>
          </div>
        </div>
      </div>

      <div>
        <div class="hud-bottom-hint" data-role="bottom-hint">
          <div class="hud-bottom-pill">
            <span>Best: <strong class="font-mono-num" style="color:#e2e8f0" data-role="bottom-best">0</strong></span>
            <span style="margin:0 8px;color:#475569" aria-hidden="true">·</span>
            <span>Space: Boost · Esc: Pause</span>
          </div>
        </div>

        <div class="touch-controls-bar hidden" data-role="touch-bar">
          <div class="touch-steer-group">
            <button type="button" class="touch-steer-btn" data-role="touch-left" aria-label="Move left lane">${ICON_LEFT}</button>
            <button type="button" class="touch-steer-btn" data-role="touch-right" aria-label="Move right lane">${ICON_RIGHT}</button>
          </div>
          <button type="button" class="touch-boost-btn" data-role="touch-boost" aria-label="Hold to boost">
            ${ICON_ZAP}
            <span>Boost</span>
          </button>
        </div>
      </div>
    `;

    this.scoreEl = this.element.querySelector('[data-role="score"]')!;
    this.multiplierEl = this.element.querySelector('[data-role="multiplier"]')!;
    this.orbsEl = this.element.querySelector('[data-role="orbs"]')!;
    this.coinsEl = this.element.querySelector('[data-role="coins"]')!;
    this.tierEl = this.element.querySelector('[data-role="tier"]')!;
    this.goalHintEl = this.element.querySelector('[data-role="goal-hint"]')!;
    this.speedEl = this.element.querySelector('[data-role="speed"]')!;
    this.distanceEl = this.element.querySelector('[data-role="distance"]')!;
    this.boostStatusEl = this.element.querySelector('[data-role="boost-status"]')!;
    this.boostPercentEl = this.element.querySelector('[data-role="boost-pct"]')!;
    this.boostFillEl = this.element.querySelector('[data-role="boost-fill"]')!;
    this.muteBtn = this.element.querySelector('[data-role="mute-btn"]')!;
    this.bannerSlot = this.element.querySelector('[data-role="banner-slot"]')!;
    this.bottomHint = this.element.querySelector('[data-role="bottom-hint"]')!;
    this.bottomBestEl = this.element.querySelector('[data-role="bottom-best"]')!;
    this.touchBar = this.element.querySelector('[data-role="touch-bar"]')!;
    this.touchBoostBtn = this.element.querySelector('[data-role="touch-boost"]')!;

    const pauseBtn = this.element.querySelector<HTMLButtonElement>('[data-role="pause-btn"]')!;
    const touchLeft = this.element.querySelector<HTMLButtonElement>('[data-role="touch-left"]')!;
    const touchRight = this.element.querySelector<HTMLButtonElement>('[data-role="touch-right"]')!;

    pauseBtn.addEventListener('click', actions.onPause);
    this.muteBtn.addEventListener('click', actions.onToggleMute);

    touchLeft.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      actions.onTouchSteer(-1);
    });
    touchRight.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      actions.onTouchSteer(1);
    });

    this.touchBoostBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      actions.onTouchBoost(true);
    });
    const endBoost = () => actions.onTouchBoost(false);
    this.touchBoostBtn.addEventListener('pointerup', endBoost);
    this.touchBoostBtn.addEventListener('pointercancel', endBoost);
    this.touchBoostBtn.addEventListener('pointerleave', endBoost);
  }

  public update(snapshot: GameSnapshot, muted: boolean, showTouchPad: boolean): void {
    this.scoreEl.textContent = snapshot.score.toLocaleString();
    this.multiplierEl.textContent = `${snapshot.multiplier}x Multiplier`;
    this.multiplierEl.classList.toggle('is-active', snapshot.multiplier > 1);
    this.orbsEl.textContent = String(snapshot.orbsCollected);
    this.coinsEl.textContent = `+${snapshot.runCoins}`;
    this.tierEl.textContent = String(snapshot.difficultyLevel);

    if (snapshot.nextCarGoal) {
      const ready = snapshot.totalCoins >= snapshot.nextCarGoal.cost;
      this.goalHintEl.textContent = ready
        ? `Goal Reached: ${snapshot.nextCarGoal.name} Ready!`
        : `Next Car: ${snapshot.nextCarGoal.name} (${snapshot.totalCoins}/${snapshot.nextCarGoal.cost})`;
      this.goalHintEl.classList.toggle('is-ready', ready);
    } else {
      this.goalHintEl.textContent = 'Garage: All Cars Unlocked';
      this.goalHintEl.classList.remove('is-ready');
    }

    this.speedEl.textContent = String(snapshot.speedKmh);
    this.distanceEl.textContent = `${snapshot.distance.toLocaleString()} m`;

    const pct = Math.max(0, Math.min(100, snapshot.boostMeter));
    this.boostStatusEl.textContent = snapshot.isBoosting ? 'Overdrive Active' : 'Boost Energy';
    this.boostPercentEl.textContent = `${pct}%`;
    this.boostFillEl.style.width = `${pct}%`;
    this.boostFillEl.classList.toggle('is-boosting', snapshot.isBoosting);
    this.boostFillEl.classList.toggle('is-low', !snapshot.isBoosting && pct < 20);

    this.muteBtn.innerHTML = muted ? ICON_VOLUME_OFF : ICON_VOLUME_ON;
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');

    this.bottomBestEl.textContent = snapshot.bestScore.toLocaleString();
    this.touchBar.classList.toggle('hidden', !showTouchPad);
    this.bottomHint.classList.toggle('hidden', showTouchPad);
    this.touchBoostBtn.classList.toggle('is-active', snapshot.isBoosting);

    if (snapshot.eventBanner) {
      if (snapshot.eventBanner.id !== this.lastBannerId) {
        this.lastBannerId = snapshot.eventBanner.id;
        const banner = document.createElement('div');
        banner.className = `animate-hud-pop hud-event-banner tone-${snapshot.eventBanner.tone}`;
        banner.textContent = snapshot.eventBanner.text;
        this.bannerSlot.replaceChildren(banner);
      }
    } else if (this.bannerSlot.childElementCount > 0) {
      this.bannerSlot.replaceChildren();
    }
  }

  public setVisible(visible: boolean): void {
    this.element.classList.toggle('hidden', !visible);
  }
}
