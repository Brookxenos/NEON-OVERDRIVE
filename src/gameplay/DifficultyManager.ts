import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    return 1 + Math.floor((distance + elapsedRunSeconds * 12) / 190);
  }

  public getBaseSpeed(distance: number): number {
    return Math.min(BASE_MAX_SPEED, BASE_START_SPEED + distance * 0.034);
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Challenging, brisk arcade cadence with strict human-passable reaction + steer floor
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const baseMinTime = Math.max(0.36, 0.72 - levelOffset * 0.048);
    const baseMaxTime = Math.max(0.48, 0.94 - levelOffset * 0.054);
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.18 : 0;
    const minSpacing = Math.max(24, currentSpeed * (baseMinTime + shiftTimeBonus) + 5);
    const maxSpacing = Math.max(minSpacing + 6, currentSpeed * (baseMaxTime + shiftTimeBonus) + 8);
    return randomRange(minSpacing, maxSpacing);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.94, 0.52 + levelOffset * 0.06);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.96, 0.68 + levelOffset * 0.04);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 2) return 0;
    return Math.min(0.42, (difficultyLevel - 1) * 0.06);
  }
}
