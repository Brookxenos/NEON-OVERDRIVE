import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    return 1 + Math.floor((distance + elapsedRunSeconds * 11) / 220);
  }

  public getBaseSpeed(distance: number): number {
    return Math.min(BASE_MAX_SPEED, BASE_START_SPEED + distance * 0.028);
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Brisk, challenging arcade cadence while maintaining human reaction + steer clearance
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const baseMinTime = Math.max(0.42, 0.86 - levelOffset * 0.052);
    const baseMaxTime = Math.max(0.56, 1.12 - levelOffset * 0.058);
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.2 : 0;
    const minSpacing = Math.max(26, currentSpeed * (baseMinTime + shiftTimeBonus) + 6);
    const maxSpacing = Math.max(minSpacing + 7, currentSpeed * (baseMaxTime + shiftTimeBonus) + 10);
    return randomRange(minSpacing, maxSpacing);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.9, 0.36 + levelOffset * 0.07);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.94, 0.58 + levelOffset * 0.05);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 3) return 0;
    return Math.min(0.36, (difficultyLevel - 2) * 0.055);
  }
}
