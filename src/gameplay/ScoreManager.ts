import {
  BASE_START_SPEED,
  BOOST_CELL_SCORE,
  CELL_COIN_VALUE,
  COMBO_DURATION,
  ENERGY_ORB_SCORE,
  GOLD_COIN_VALUE,
  MAX_MULTIPLIER,
  NEAR_MISS_SCORE,
  ORB_COIN_VALUE,
  SCORE_CRYSTAL_VALUE,
  SCORE_PER_METER,
  SPEED_TO_KMH,
} from '../utils/Constants';

export interface CollectibleReward {
  points: number;
  coins: number;
}

export class ScoreManager {
  private score = 0;
  private distance = 0;
  private multiplier = 1;
  private comboTimer = 0;
  private orbsCollected = 0;
  private runCoins = 0;
  private peakSpeedKmh = Math.round(BASE_START_SPEED * SPEED_TO_KMH);

  public reset(): void {
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.orbsCollected = 0;
    this.runCoins = 0;
    this.peakSpeedKmh = Math.round(BASE_START_SPEED * SPEED_TO_KMH);
  }

  public updateRun(
    dt: number,
    worldSpeed: number,
    isBoosting: boolean,
    isExpressZone = false,
  ): void {
    const deltaMeters = worldSpeed * dt;
    this.distance += deltaMeters;
    const zoneBonus = isExpressZone ? 1.5 : 1;
    this.score +=
      deltaMeters * SCORE_PER_METER * this.multiplier * (isBoosting ? 1.5 : 1) * zoneBonus;

    const kmh = Math.round(worldSpeed * SPEED_TO_KMH);
    if (kmh > this.peakSpeedKmh) {
      this.peakSpeedKmh = kmh;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.multiplier = 1;
      }
    }
  }

  public registerCollectible(
    kind: 'energy_orb' | 'score_crystal' | 'boost_cell',
    isExpressZone = false,
  ): CollectibleReward {
    this.orbsCollected += 1;
    this.comboTimer = COMBO_DURATION;
    this.multiplier = Math.min(MAX_MULTIPLIER, this.multiplier + 1);

    const baseValue =
      kind === 'score_crystal'
        ? SCORE_CRYSTAL_VALUE
        : kind === 'boost_cell'
          ? BOOST_CELL_SCORE
          : ENERGY_ORB_SCORE;

    const coinReward =
      kind === 'score_crystal'
        ? GOLD_COIN_VALUE
        : kind === 'boost_cell'
          ? CELL_COIN_VALUE
          : ORB_COIN_VALUE;

    const points = Math.round(baseValue * this.multiplier * (isExpressZone ? 1.5 : 1));
    this.score += points;
    this.runCoins += coinReward;
    return { points, coins: coinReward };
  }

  public addBonusCoins(coins: number): void {
    if (coins > 0) {
      this.runCoins += coins;
    }
  }

  public registerBoostPad(): number {
    const points = 180 * this.multiplier;
    this.score += points;
    return points;
  }

  public registerNearMiss(count: number): number {
    const points = NEAR_MISS_SCORE * count * this.multiplier;
    this.score += points;
    return points;
  }

  public getScore(): number {
    return Math.floor(this.score);
  }

  public getDistance(): number {
    return Math.floor(this.distance);
  }

  public getExactDistance(): number {
    return this.distance;
  }

  public getMultiplier(): number {
    return this.multiplier;
  }

  public getOrbsCollected(): number {
    return this.orbsCollected;
  }

  public getRunCoins(): number {
    return this.runCoins;
  }

  public getPeakSpeedKmh(): number {
    return this.peakSpeedKmh;
  }
}
