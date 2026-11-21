import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0, score = 0): number {
    const progress =
      Math.max(0, distance) * 0.75 +
      Math.max(0, elapsedRunSeconds) * 14 +
      Math.max(0, score) * 0.16;
    return 1 + Math.floor(Math.pow(progress / 420, 0.56));
  }

  public getBaseSpeed(distance: number, elapsedRunSeconds = 0, score = 0): number {
    const effectiveScore = Math.max(
      Math.max(0, score),
      Math.max(0, distance) * 1.8 + Math.max(0, elapsedRunSeconds) * 28,
    );

    if (effectiveScore <= 20000) {
      // Calm opening pace (36 m/s = 130 km/h) rising smoothly to 84 m/s (302 km/h)
      return BASE_START_SPEED + (effectiveScore / 20000) * (84 - BASE_START_SPEED);
    }
    if (effectiveScore <= 150000) {
      // Mid-run parallel score-to-speed climb: 84 -> 136 m/s (302 -> 490 km/h)
      const midRatio = (effectiveScore - 20000) / 130000;
      return 84 + midRatio * 52;
    }
    // Long-run parallel score climb: 136 -> 190 m/s (490 -> 684 km/h)
    const tailRange = BASE_MAX_SPEED - 136;
    return 136 + tailRange * (1 - Math.exp(-(effectiveScore - 150000) / 900000));
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Continuous multi-minute arcade cadence escalation with human reaction + steer safety floor
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const tierProgress = 1 - Math.exp(-levelOffset / 12);
    const baseMinTime = 0.72 - tierProgress * 0.445; // 0.72s -> 0.275s
    const baseMaxTime = 0.94 - tierProgress * 0.56; // 0.94s -> 0.38s
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.165 : 0;
    const minSpacing = Math.max(24, currentSpeed * (baseMinTime + shiftTimeBonus) + 5);
    const maxSpacing = Math.max(minSpacing + 6, currentSpeed * (baseMaxTime + shiftTimeBonus) + 8);
    return randomRange(minSpacing, maxSpacing);
  }

  public getFormationCompression(difficultyLevel: number): number {
    const extraLevels = Math.max(0, difficultyLevel - 3);
    return Math.max(0.8, 1 - extraLevels * 0.0045);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.99, 0.54 + (1 - Math.exp(-levelOffset / 6)) * 0.45);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.98, 0.68 + (1 - Math.exp(-levelOffset / 8)) * 0.3);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 2) return 0;
    return Math.min(0.58, 0.08 + (1 - Math.exp(-(difficultyLevel - 2) / 14)) * 0.5);
  }
}
