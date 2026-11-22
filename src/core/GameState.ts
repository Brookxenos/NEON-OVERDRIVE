import { BASE_START_SPEED, BOOST_MAX, SPEED_TO_KMH } from '../utils/Constants';
import { CarId, getNextLockedCar } from '../vehicle/CarCatalog';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';

export type BannerTone = 'cyan' | 'blue' | 'magenta' | 'amber';

export interface GameEventBanner {
  id: number;
  text: string;
  tone: BannerTone;
}

export interface NextCarGoal {
  id: CarId;
  name: string;
  cost: number;
}

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  distance: number;
  speedKmh: number;
  boostMeter: number;
  isBoosting: boolean;
  multiplier: number;
  orbsCollected: number;
  runCoins: number;
  totalCoins: number;
  selectedCarId: CarId;
  previewCarId: CarId;
  unlockedCars: CarId[];
  nextCarGoal: NextCarGoal | null;
  difficultyLevel: number;
  bestScore: number;
  bestDistance: number;
  isNewRecord: boolean;
  peakSpeedKmh: number;
  crashCause: string;
  eventBanner: GameEventBanner | null;
  webglError: string | null;
}

export type GameStateListener = (snapshot: GameSnapshot) => void;

export class GameState {
  private snapshot: GameSnapshot;
  private readonly listeners = new Set<GameStateListener>();
  private bannerCounter = 0;
  private bannerTimeRemaining = 0;

  constructor(
    bestScore: number,
    bestDistance: number,
    totalCoins: number,
    selectedCarId: CarId,
    unlockedCars: CarId[],
  ) {
    const nextLocked = getNextLockedCar(unlockedCars);
    this.snapshot = {
      status: 'menu',
      score: 0,
      distance: 0,
      speedKmh: Math.round(BASE_START_SPEED * SPEED_TO_KMH),
      boostMeter: BOOST_MAX,
      isBoosting: false,
      multiplier: 1,
      orbsCollected: 0,
      runCoins: 0,
      totalCoins,
      selectedCarId,
      previewCarId: selectedCarId,
      unlockedCars: [...unlockedCars],
      nextCarGoal: nextLocked
        ? { id: nextLocked.id, name: nextLocked.name, cost: nextLocked.costCoins }
        : null,
      difficultyLevel: 1,
      bestScore,
      bestDistance,
      isNewRecord: false,
      peakSpeedKmh: Math.round(BASE_START_SPEED * SPEED_TO_KMH),
      crashCause: '',
      eventBanner: null,
      webglError: null,
    };
  }

  public getStatus(): GameStatus {
    return this.snapshot.status;
  }

  public getSnapshot(): GameSnapshot {
    return { ...this.snapshot };
  }

  public setStatus(status: GameStatus): void {
    this.snapshot.status = status;
    this.notify();
  }

  public pushBanner(text: string, tone: BannerTone): void {
    this.bannerCounter += 1;
    this.snapshot.eventBanner = {
      id: this.bannerCounter,
      text,
      tone,
    };
    this.bannerTimeRemaining = 1.15;
    this.notify();
  }

  public tickBanner(dt: number): void {
    if (this.bannerTimeRemaining <= 0) return;
    this.bannerTimeRemaining -= dt;
    if (this.bannerTimeRemaining <= 0) {
      this.snapshot.eventBanner = null;
      this.notify();
    }
  }

  public updateTelemetry(patch: Partial<GameSnapshot>): void {
    Object.assign(this.snapshot, patch);
  }

  public setWebGLError(message: string | null): void {
    this.snapshot.webglError = message;
    this.notify();
  }

  public notify(): void {
    const copy = this.getSnapshot();
    this.listeners.forEach((listener) => listener(copy));
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }
}
