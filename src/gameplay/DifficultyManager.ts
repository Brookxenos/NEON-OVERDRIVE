import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    const progDist = Math.max(0, distance) + Math.max(0, elapsedRunSeconds) * 3;
    return 1 + Math.floor(Math.pow(progDist / 650, 0.62));
  }

  public getBaseSpeed(distance: number, elapsedRunSeconds = 0): number {
    // Smooth warmup 0..500m (28 -> 34 m/s = 101 -> 122 km/h) for comfortable control learning,
    // then noticeably faster distance-driven acceleration past 500m up to BASE_MAX_SPEED (96 m/s = 346 km/h)
    const progDist = Math.max(0, distance) + Math.max(0, elapsedRunSeconds) * 3;
    const warmup = Math.min(progDist, 500) / 500;
    const earlySpeed = BASE_START_SPEED + 6 * Math.pow(warmup, 1.15);
    const extraDist = Math.max(0, progDist - 500);
    const postFactor = extraDist / (extraDist + 2400);
    const postCurve = Math.pow(postFactor, 0.92);
    return earlySpeed + (BASE_MAX_SPEED - (BASE_START_SPEED + 6)) * postCurve;
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Fair reaction window across speed progression without sudden cadence spikes
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const tierProgress = 1 - Math.exp(-levelOffset / 10);
    const baseMinTime = 1.05 - tierProgress * 0.62; // 1.05s early -> 0.43s late
    const baseMaxTime = 1.32 - tierProgress * 0.76; // 1.32s early -> 0.56s late
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.2 : 0;
    const minSpacing = Math.max(28, currentSpeed * (baseMinTime + shiftTimeBonus) + 6);
    const maxSpacing = Math.max(minSpacing + 6, currentSpeed * (baseMaxTime + shiftTimeBonus) + 9);
    return randomRange(minSpacing, maxSpacing);
  }

  public getFormationCompression(difficultyLevel: number): number {
    const extraLevels = Math.max(0, difficultyLevel - 3);
    return Math.max(0.84, 1 - extraLevels * 0.004);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.96, 0.45 + (1 - Math.exp(-levelOffset / 6)) * 0.51);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.95, 0.58 + (1 - Math.exp(-levelOffset / 7)) * 0.37);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 2) return 0;
    return Math.min(0.48, 0.06 + (1 - Math.exp(-(difficultyLevel - 2) / 14)) * 0.42);
  }
}
