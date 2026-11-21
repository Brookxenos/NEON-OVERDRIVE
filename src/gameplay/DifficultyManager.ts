import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number, elapsedRunSeconds = 0): number {
    return 1 + Math.floor((distance + elapsedRunSeconds * 10) / 280);
  }

  public getBaseSpeed(distance: number): number {
    return Math.min(BASE_MAX_SPEED, BASE_START_SPEED + distance * 0.022);
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Tightens steadily as you play longer while preserving human reaction + steer margin
    const levelOffset = Math.max(0, difficultyLevel - 1);
    const baseMinTime = Math.max(0.48, 1.14 - levelOffset * 0.055);
    const baseMaxTime = Math.max(0.66, 1.46 - levelOffset * 0.062);
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.22 : 0;
    const minSpacing = Math.max(28, currentSpeed * (baseMinTime + shiftTimeBonus) + 8);
    const maxSpacing = Math.max(minSpacing + 8, currentSpeed * (baseMaxTime + shiftTimeBonus) + 12);
    return randomRange(minSpacing, maxSpacing);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.86, 0.24 + levelOffset * 0.065);
  }

  public getForcedWeaveChance(difficultyLevel: number): number {
    const levelOffset = Math.max(0, difficultyLevel - 1);
    return Math.min(0.92, 0.45 + levelOffset * 0.05);
  }

  public getTwoLaneJumpChance(difficultyLevel: number): number {
    if (difficultyLevel < 4) return 0;
    return Math.min(0.32, (difficultyLevel - 3) * 0.045);
  }
}
