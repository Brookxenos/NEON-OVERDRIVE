import { GameSnapshot } from '../core/GameState';
import { SPEED_TO_KMH } from '../utils/Constants';
import { CAR_CATALOG, CarId, CarSpec, getCarSpec } from '../vehicle/CarCatalog';

const ICON_CLOSE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_COIN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9.5 9.5h5"/><path d="M9.5 14.5h5"/></svg>`;
const ICON_EYE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_RESET = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`;

export type ShowcaseCameraMode = 'auto' | 'front' | 'side' | 'rear';
type GarageFilter = 'all' | 'featured' | 'magnetar' | 'drift' | 'racing' | 'rally' | 'ev';

export interface GarageModalActions {
  onPreviewCar: (carId: CarId) => void;
  onSelectCar: (carId: CarId) => void;
  onUnlockCar: (carId: CarId) => void;
  onResetGarage: () => void;
  onSetCameraView: (mode: ShowcaseCameraMode) => void;
  getCameraView: () => ShowcaseCameraMode;
  onClose: () => void;
}

function toHexColor(num: number): string {
  return `#${num.toString(16).padStart(6, '0')}`;
}

function matchesFilter(car: CarSpec, filter: GarageFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'featured':
      return car.featured === true;
    case 'magnetar':
      return car.bodyStyle === 'magnetar_super';
    case 'drift':
      return car.bodyStyle === 'drift_widebody' || car.bodyStyle === 'muscle_blower';
    case 'racing':
      return (
        car.bodyStyle === 'cerbero_racer' ||
        car.bodyStyle === 'spectra_wtype' ||
        car.bodyStyle === 'janus_racer' ||
        car.bodyStyle === 'chronos_proto'
      );
    case 'rally':
      return car.bodyStyle === 'chiron_rally';
    case 'ev':
      return car.bodyStyle === 'ourea_electric';
  }
}

function renderCarCardIllustration(car: CarSpec): string {
  const body = toHexColor(car.primaryColor);
  const trim = toHexColor(car.secondaryColor);
  const accent = toHexColor(car.stripeColor);
  const rim = toHexColor(car.rimColor);
  const glass = toHexColor(car.glassColor);
  const lamp = toHexColor(car.headlightColor);

  let kitOverlay = '';
  if (car.bodyStyle === 'muscle_blower') {
    kitOverlay = `
      <rect x="64" y="18" width="12" height="5" rx="1.5" fill="#94a3b8" stroke="#1e293b" stroke-width="0.8"/>
      <polygon points="76,19 81,20 81,22 76,23" fill="#ef4444"/>
      <polygon points="10,20 17,20 15,24 10,24" fill="${trim}"/>
    `;
  } else if (car.bodyStyle === 'drift_widebody') {
    kitOverlay = `
      <path d="M12 16 L22 22 L15 24 L8 18 Z" fill="${trim}" stroke="${accent}" stroke-width="0.8"/>
      <rect x="60" y="21" width="10" height="2.2" rx="1" fill="${trim}"/>
    `;
  } else if (car.bodyStyle === 'ourea_electric') {
    kitOverlay = `
      <path d="M22 25 L82 25" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <polygon points="36,12 44,12 41,15 35,15" fill="${accent}"/>
    `;
  } else if (car.bodyStyle === 'magnetar_super') {
    kitOverlay = `
      <polygon points="10,16 21,18 19,23 12,23" fill="${trim}" stroke="${accent}" stroke-width="0.7"/>
      <polygon points="44,24 58,23 56,31 44,30" fill="${trim}"/>
    `;
  } else if (car.bodyStyle === 'cerbero_racer' || car.bodyStyle === 'janus_racer') {
    kitOverlay = `
      <path d="M7 13 L21 15 L20 17 L8 16 Z" fill="${trim}" stroke="${accent}" stroke-width="0.7"/>
      <rect x="13" y="16" width="2.2" height="7" fill="${trim}"/>
      <polygon points="84,29 92,28 92,31 84,31" fill="${accent}"/>
    `;
  } else if (car.bodyStyle === 'spectra_wtype') {
    kitOverlay = `
      <path d="M9 17 L20 19 L19 22 L10 21 Z" fill="${body}" stroke="${accent}" stroke-width="0.7"/>
      <rect x="13" y="21" width="2" height="4" fill="${trim}"/>
      <rect x="62" y="21" width="9" height="2" rx="0.8" fill="${trim}"/>
    `;
  } else if (car.bodyStyle === 'chronos_proto') {
    kitOverlay = `
      <path d="M18 22 L38 12 L46 12 L24 22 Z" fill="${accent}"/>
      <path d="M7 12 L21 14 L20 17 L8 15 Z" fill="${trim}" stroke="${accent}" stroke-width="0.8"/>
      <rect x="13" y="17" width="2.5" height="6" fill="${trim}"/>
    `;
  } else if (car.bodyStyle === 'chiron_rally') {
    kitOverlay = `
      <rect x="34" y="10" width="24" height="3" rx="1" fill="${trim}"/>
      <circle cx="57" cy="11.5" r="1.6" fill="#fef08a"/>
      <circle cx="88" cy="28" r="2" fill="#fef08a"/>
    `;
  }

  return `
    <div class="garage-car-visual">
      <svg viewBox="0 0 98 46" width="90" height="42" aria-hidden="true">
        <ellipse cx="49" cy="40" rx="40" ry="3.2" fill="rgba(2, 6, 23, 0.82)"/>
        ${kitOverlay}
        <path d="M10 31 L12 23 L24 21 L34 13 L56 13 L71 21 L88 24 L91 29 L88 33 L12 33 Z" fill="${body}" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
        <path d="M27 21 L36 14.5 L55 14.5 L67 21 Z" fill="${glass}" stroke="#1e293b" stroke-width="0.9"/>
        <line x1="45" y1="14.5" x2="46" y2="21" stroke="${trim}" stroke-width="1.5"/>
        <rect x="12" y="26.5" width="76" height="2" rx="1" fill="${accent}" opacity="0.92"/>
        <rect x="8" y="31.5" width="82" height="2.6" rx="1.2" fill="${trim}"/>
        <rect x="85" y="25" width="5.5" height="2.6" rx="1" fill="${lamp}"/>
        <rect x="9.5" y="24" width="4.5" height="3" rx="1" fill="#ef4444"/>
        <rect x="47" y="23.5" width="5" height="1.6" rx="0.8" fill="#cbd5e1"/>
        <circle cx="26" cy="34" r="7.5" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
        <circle cx="26" cy="34" r="4.5" fill="${rim}"/>
        <circle cx="26" cy="34" r="1.8" fill="#0f172a"/>
        <circle cx="72" cy="34" r="7.5" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
        <circle cx="72" cy="34" r="4.5" fill="${rim}"/>
        <circle cx="72" cy="34" r="1.8" fill="#0f172a"/>
      </svg>
    </div>
  `;
}

export class GarageModal {
  public readonly element: HTMLElement;
  private readonly walletEl: HTMLElement;
  private readonly countEl: HTMLElement;
  private readonly goalBannerEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly stageBadgeEl: HTMLElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly filterBtns: HTMLButtonElement[];
  private readonly cameraBtns: HTMLButtonElement[];
  private readonly actions: GarageModalActions;
  private activeFilter: GarageFilter = 'all';
  private lastSnapshot: GameSnapshot | null = null;
  private confirmResetPending = false;
  private confirmTimer: number | null = null;

  constructor(actions: GarageModalActions) {
    this.actions = actions;
    this.element = document.createElement('div');
    this.element.className = 'garage-backdrop hidden';
    const featuredCount = CAR_CATALOG.filter((c) => c.featured).length;
    this.element.innerHTML = `
      <aside class="animate-modal-enter modal-card modal-card-garage-dock">
        <div class="settings-header-row" style="margin-bottom:10px">
          <div>
            <p class="modal-kicker">3D Car Showroom · <span data-role="car-count">${CAR_CATALOG.length} Cars</span></p>
            <h2 class="font-display modal-title" style="font-size:21px">Garage & Unlocks</h2>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="wallet-readout">
              <span style="color:#fbbf24;display:inline-flex">${ICON_COIN}</span>
              <span class="font-mono-num" data-role="wallet-coins">0</span>
            </div>
            <button type="button" class="hud-square-btn" style="width:36px;height:36px" data-role="close-btn" aria-label="Close garage">${ICON_CLOSE}</button>
          </div>
        </div>

        <div class="garage-goal-banner" data-role="goal-banner"></div>

        <div class="garage-filter-bar" data-role="filter-bar">
          <button type="button" class="garage-filter-btn is-active" data-garage-filter="all">All (${CAR_CATALOG.length})</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="featured">New (${featuredCount})</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="racing">Racing</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="magnetar">Magnetar</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="drift">Drift</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="ev">Electric</button>
          <button type="button" class="garage-filter-btn" data-garage-filter="rally">Rally</button>
        </div>

        <div class="garage-car-list" data-role="car-list"></div>

        <div class="garage-footer-row">
          <button type="button" class="btn-garage-reset" data-role="reset-btn">
            ${ICON_RESET}
            <span>Reset Cars</span>
          </button>
          <button type="button" class="btn-modal-primary" style="flex:1;height:42px" data-role="done-btn">Done</button>
        </div>
      </aside>

      <div class="garage-stage-controls">
        <div class="garage-preview-badge" data-role="stage-badge"></div>
        <div class="garage-cam-bar" data-role="cam-bar">
          <button type="button" class="garage-cam-btn" data-cam-mode="auto">360° Spin</button>
          <button type="button" class="garage-cam-btn" data-cam-mode="front">Front</button>
          <button type="button" class="garage-cam-btn" data-cam-mode="side">Side</button>
          <button type="button" class="garage-cam-btn" data-cam-mode="rear">Rear</button>
        </div>
      </div>
    `;

    this.walletEl = this.element.querySelector('[data-role="wallet-coins"]')!;
    this.countEl = this.element.querySelector('[data-role="car-count"]')!;
    this.goalBannerEl = this.element.querySelector('[data-role="goal-banner"]')!;
    this.listEl = this.element.querySelector('[data-role="car-list"]')!;
    this.stageBadgeEl = this.element.querySelector('[data-role="stage-badge"]')!;
    this.resetBtn = this.element.querySelector('[data-role="reset-btn"]')!;
    this.filterBtns = Array.from(
      this.element.querySelectorAll<HTMLButtonElement>('[data-garage-filter]'),
    );
    this.cameraBtns = Array.from(
      this.element.querySelectorAll<HTMLButtonElement>('[data-cam-mode]'),
    );

    this.element.querySelector('[data-role="close-btn"]')!.addEventListener('click', actions.onClose);
    this.element.querySelector('[data-role="done-btn"]')!.addEventListener('click', actions.onClose);

    for (const btn of this.filterBtns) {
      btn.addEventListener('click', () => {
        this.activeFilter = (btn.dataset.garageFilter as GarageFilter) ?? 'all';
        for (const other of this.filterBtns) {
          other.classList.toggle('is-active', other === btn);
        }
        this.listEl.scrollTop = 0;
        if (this.lastSnapshot) {
          this.update(this.lastSnapshot);
        }
      });
    }

    this.resetBtn.addEventListener('click', () => {
      if (!this.confirmResetPending) {
        this.confirmResetPending = true;
        this.resetBtn.classList.add('is-confirm');
        this.resetBtn.innerHTML = `${ICON_RESET}<span>Confirm Reset?</span>`;
        if (this.confirmTimer !== null) {
          window.clearTimeout(this.confirmTimer);
        }
        this.confirmTimer = window.setTimeout(() => {
          this.clearResetConfirm();
        }, 3200);
        return;
      }

      this.clearResetConfirm();
      this.actions.onResetGarage();
    });

    for (const btn of this.cameraBtns) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.camMode as ShowcaseCameraMode;
        this.actions.onSetCameraView(mode);
        this.syncCameraButtons();
      });
    }

    this.listEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const actionBtn = target.closest<HTMLButtonElement>('[data-car-action]');
      if (actionBtn) {
        event.stopPropagation();
        const carId = actionBtn.dataset.carId as CarId | undefined;
        const mode = actionBtn.dataset.carAction;
        if (!carId) return;
        if (mode === 'unlock') {
          this.actions.onUnlockCar(carId);
        } else if (mode === 'select') {
          this.actions.onSelectCar(carId);
        } else if (mode === 'preview') {
          this.actions.onPreviewCar(carId);
        }
        return;
      }

      const card = target.closest<HTMLElement>('[data-card-car-id]');
      const cardCarId = card?.dataset.cardCarId as CarId | undefined;
      if (cardCarId) {
        this.actions.onPreviewCar(cardCarId);
      }
    });
  }

  private clearResetConfirm(): void {
    this.confirmResetPending = false;
    if (this.confirmTimer !== null) {
      window.clearTimeout(this.confirmTimer);
      this.confirmTimer = null;
    }
    this.resetBtn.classList.remove('is-confirm');
    this.resetBtn.innerHTML = `${ICON_RESET}<span>Reset Cars</span>`;
  }

  private syncCameraButtons(): void {
    const activeMode = this.actions.getCameraView();
    for (const btn of this.cameraBtns) {
      btn.classList.toggle('is-active', btn.dataset.camMode === activeMode);
    }
  }

  public update(snapshot: GameSnapshot): void {
    this.lastSnapshot = snapshot;
    this.syncCameraButtons();
    this.walletEl.textContent = `${snapshot.totalCoins.toLocaleString()} Coins`;

    const visibleCars = CAR_CATALOG.filter((car) => matchesFilter(car, this.activeFilter));
    this.countEl.textContent =
      this.activeFilter === 'all'
        ? `${CAR_CATALOG.length} Cars · Scroll ↓`
        : `${visibleCars.length} of ${CAR_CATALOG.length} Cars`;

    if (snapshot.nextCarGoal) {
      const coinsMet = snapshot.totalCoins >= snapshot.nextCarGoal.cost;
      const distMet = snapshot.bestDistance >= snapshot.nextCarGoal.minBestDistance;
      const readyToUnlock = coinsMet && distMet;
      const coinRatio = Math.min(1, snapshot.totalCoins / Math.max(1, snapshot.nextCarGoal.cost));
      const distRatio = Math.min(
        1,
        snapshot.bestDistance / Math.max(1, snapshot.nextCarGoal.minBestDistance),
      );
      const pct = Math.round(((coinRatio + distRatio) * 0.5) * 100);
      this.goalBannerEl.innerHTML = `
        <div class="garage-goal-top">
          <span>Next: <strong style="color:#fef08a">${snapshot.nextCarGoal.name}</strong></span>
          <span class="font-mono-num" style="color:${readyToUnlock ? '#4ade80' : '#cbd5e1'}">
            ${
              readyToUnlock
                ? 'Ready to Unlock'
                : `<span style="color:${coinsMet ? '#4ade80' : '#fcd34d'}">${snapshot.totalCoins.toLocaleString()}/${snapshot.nextCarGoal.cost.toLocaleString()} Coins</span> · <span style="color:${distMet ? '#4ade80' : '#67e8f9'}">${snapshot.bestDistance.toLocaleString()}/${snapshot.nextCarGoal.minBestDistance.toLocaleString()}m</span>`
            }
          </span>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill ${readyToUnlock ? 'is-ready' : ''}" style="width:${pct}%"></div>
        </div>
      `;
    } else {
      this.goalBannerEl.innerHTML = `
        <div class="garage-goal-top">
          <span style="color:#4ade80;font-weight:700">All ${CAR_CATALOG.length} Cars Unlocked</span>
          <span class="font-mono-num" style="color:#67e8f9">${CAR_CATALOG.length} / ${CAR_CATALOG.length}</span>
        </div>
      `;
    }

    const unlockedSet = new Set(snapshot.unlockedCars);
    const previewCar = getCarSpec(snapshot.previewCarId);
    const previewUnlocked = unlockedSet.has(previewCar.id);
    const previewEquipped = snapshot.selectedCarId === previewCar.id;
    const previewBonus = Math.round(previewCar.speedBonus * SPEED_TO_KMH);

    this.stageBadgeEl.innerHTML = `
      <div class="garage-stage-title-row">
        <span class="font-display" style="font-size:17px;color:#ffffff">${previewCar.name}</span>
        <span class="garage-meta-sep" aria-hidden="true">·</span>
        <span class="garage-meta-text">${previewCar.series}</span>
        ${previewBonus > 0 ? `<span class="garage-meta-sep" aria-hidden="true">·</span><span class="font-mono-num garage-speed-text">+${previewBonus} KM/H</span>` : ''}
        <span class="garage-meta-sep" aria-hidden="true">·</span>
        <span class="garage-stage-status ${previewEquipped ? 'is-equipped' : previewUnlocked ? 'is-owned' : 'is-locked'}">
          ${
            previewEquipped
              ? 'Equipped'
              : previewUnlocked
                ? 'Unlocked'
                : `${previewCar.costCoins.toLocaleString()} Coins · ${previewCar.minBestDistance.toLocaleString()}m Best`
          }
        </span>
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:3px">${previewCar.tagline}</div>
    `;

    this.listEl.innerHTML = visibleCars
      .map((car) => {
        const isUnlocked = unlockedSet.has(car.id);
        const isSelected = snapshot.selectedCarId === car.id;
        const isPreviewing = snapshot.previewCarId === car.id;
        const canAfford = snapshot.totalCoins >= car.costCoins;
        const meetsDistance = snapshot.bestDistance >= car.minBestDistance;
        const canUnlock = canAfford && meetsDistance;
        const bonusKmh = Math.round(car.speedBonus * SPEED_TO_KMH);
        const coinRatio = Math.min(1, snapshot.totalCoins / Math.max(1, car.costCoins));
        const distRatio = Math.min(
          1,
          car.minBestDistance <= 0 ? 1 : snapshot.bestDistance / car.minBestDistance,
        );
        const pct = isUnlocked ? 100 : Math.round(((coinRatio + distRatio) * 0.5) * 100);

        let actionsHtml = '';
        if (isSelected) {
          actionsHtml = `<button type="button" class="garage-action-btn is-equipped" data-car-action="preview" data-car-id="${car.id}">${ICON_CHECK}<span>Equipped</span></button>`;
        } else if (isUnlocked) {
          actionsHtml = `<button type="button" class="garage-action-btn is-select" data-car-action="select" data-car-id="${car.id}">Drive</button>`;
        } else if (canUnlock) {
          actionsHtml = `
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
            <button type="button" class="garage-action-btn is-unlock-ready" data-car-action="unlock" data-car-id="${car.id}">${ICON_COIN}<span>Unlock · ${car.costCoins.toLocaleString()}</span></button>
          </div>
        `;
        } else {
          actionsHtml = `
          <button type="button" class="garage-action-btn ${isPreviewing ? 'is-preview-active' : 'is-preview'}" data-car-action="preview" data-car-id="${car.id}">
            ${ICON_EYE}
            <span>${isPreviewing ? 'Viewing' : 'Preview'}</span>
          </button>
        `;
        }

        return `
        <div class="garage-car-card ${isSelected ? 'is-selected' : ''} ${isPreviewing ? 'is-previewing' : ''}" data-card-car-id="${car.id}">
          ${renderCarCardIllustration(car)}
          <div class="garage-car-info">
            <div class="garage-car-title-row">
              <span class="font-display garage-car-name">${car.name}</span>
              <span class="garage-meta-sep" aria-hidden="true">·</span>
              <span class="garage-meta-text">${car.series}</span>
              <span class="garage-meta-sep" aria-hidden="true">·</span>
              ${bonusKmh > 0 ? `<span class="font-mono-num garage-speed-text">+${bonusKmh} KM/H</span>` : '<span class="garage-speed-text">Starter</span>'}
            </div>
            <div class="garage-car-tagline">${car.tagline}</div>
            ${
              !isUnlocked
                ? `<div class="garage-locked-meta">
                    <span class="font-mono-num" style="color:${canAfford ? '#4ade80' : '#fcd34d'}">${snapshot.totalCoins.toLocaleString()}/${car.costCoins.toLocaleString()} Coins</span>
                    <span class="garage-meta-sep" aria-hidden="true">·</span>
                    <span class="font-mono-num" style="color:${meetsDistance ? '#4ade80' : '#67e8f9'}">${snapshot.bestDistance.toLocaleString()}/${car.minBestDistance.toLocaleString()}m Best</span>
                   </div>
                   <div class="goal-progress-track" style="margin-top:4px;height:4px"><div class="goal-progress-fill ${canUnlock ? 'is-ready' : ''}" style="width:${pct}%"></div></div>`
                : ''
            }
          </div>
          ${actionsHtml}
        </div>
      `;
      })
      .join('');
  }

  public setVisible(visible: boolean): void {
    if (!visible) {
      this.clearResetConfirm();
    }
    this.element.classList.toggle('hidden', !visible);
  }
}
