import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    const progDist = Math.max(0, distance) + Math.max(0, elapsedRunSeconds) * 4;
    return 1 + Math.floor(Math.pow(progDist / 450, 0.64));
  }

  public getBaseSpeed(distance: number, elapsedRunSeconds = 0): number {
    const progDist = Math.max(0, distance) + Math.max(0, elapsedRunSeconds) * 4;
    const warmup = Math.min(progDist, 500) / 500;
    const earlySpeed = BASE_START_SPEED + 8 * Math.pow(warmup, 1.1);
    const extraDist = Math.max(0, progDist - 500);
    const postFactor = extraDist / (extraDist + 2050);
    const postCurve = Math.pow(postFactor, 0.88);
    return earlySpeed + (BASE_MAX_SPEED - (BASE_START_SPEED + 8)) * postCurve;
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const tierProgress = 1 - Math.exp(-levelOffset / 8);
    const baseMinTime = 0.78 - tierProgress * 0.42;
    const baseMaxTime = 1.0 - tierProgress * 0.52;
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.17 : 0;
    const minSpacing = Math.max(24, currentSpeed * (baseMinTime + shiftTimeBonus) + 5);
    const maxSpacing = Math.max(minSpacing + 5, currentSpeed * (baseMaxTime + shiftTimeBonus) + 8);
    return randomRange(minSpacing, maxSpacing);
  }

  public getFormationCompression(difficultyLevel: number): number {
    const extraLevels = Math.max(0, difficultyLevel - 2);
    return Math.max(0.8, 1 - extraLevels * 0.005);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.98, 0.68 + (1 - Math.exp(-levelOffset / 5)) * 0.3);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.97, 0.72 + (1 - Math.exp(-levelOffset / 6)) * 0.25);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 2) return 0;
    return Math.min(0.58, 0.16 + (1 - Math.exp(-(difficultyLevel - 2) / 10)) * 0.42);
  }
}
