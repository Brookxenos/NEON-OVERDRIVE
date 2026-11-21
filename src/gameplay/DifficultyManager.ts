import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    const progress = Math.max(0, distance) + Math.max(0, elapsedRunSeconds) * 20;
    return 1 + Math.floor(Math.pow(progress / 420, 0.56));
  }

  public getBaseSpeed(distance: number, elapsedRunSeconds = 0): number {
    const d = Math.max(0, distance);
    const t = Math.max(0, elapsedRunSeconds);
    if (d <= 2500) {
      return BASE_START_SPEED + d * 0.0224; // 60 -> 116 m/s (418 km/h)
    }
    if (d <= 25000) {
      const midProgress = (d - 2500) / 22500;
      return 116 + midProgress * 24; // 116 -> 140 m/s (504 km/h)
    }
    const extraProgress = (d - 25000) / 240000 + Math.max(0, t - 200) / 1800;
    const tailRange = BASE_MAX_SPEED - 140; // 140 -> 180 m/s (648 km/h) asymptotically
    return 140 + tailRange * (1 - Math.exp(-extraProgress));
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Continuous arcade cadence escalation with human reaction + steer safety floor
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const tierProgress = 1 - Math.exp(-levelOffset / 14);
    const baseMinTime = 0.72 - tierProgress * 0.42; // 0.72s -> 0.30s
    const baseMaxTime = 0.94 - tierProgress * 0.54; // 0.94s -> 0.40s
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.17 : 0;
    const minSpacing = Math.max(24, currentSpeed * (baseMinTime + shiftTimeBonus) + 5);
    const maxSpacing = Math.max(minSpacing + 6, currentSpeed * (baseMaxTime + shiftTimeBonus) + 8);
    return randomRange(minSpacing, maxSpacing);
  }

  public getFormationCompression(difficultyLevel: number): number {
    const extraLevels = Math.max(0, difficultyLevel - 3);
    return Math.max(0.82, 1 - extraLevels * 0.004);
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
