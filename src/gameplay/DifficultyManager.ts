import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number): number {
    return 1 + Math.floor(distance / 400);
  }

  public getBaseSpeed(distance: number): number {
    return Math.min(BASE_MAX_SPEED, BASE_START_SPEED + distance * 0.015);
  }

  public getNextWaveSpacing(
    difficultyLevel: number,
    currentSpeed = BASE_START_SPEED,
    laneShiftSteps = 1,
  ): number {
    // Guarantee minimum human reaction + lane-transition time even while boosting at top speed
    const baseMinTime = Math.max(0.64, 1.12 - difficultyLevel * 0.05);
    const baseMaxTime = Math.max(0.86, 1.44 - difficultyLevel * 0.055);
    const shiftTimeBonus = laneShiftSteps >= 2 ? 0.24 : 0;
    const minSpacing = Math.max(32, currentSpeed * (baseMinTime + shiftTimeBonus) + 10);
    const maxSpacing = Math.max(minSpacing + 10, currentSpeed * (baseMaxTime + shiftTimeBonus) + 14);
    return randomRange(minSpacing, maxSpacing);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    return Math.min(0.68, 0.24 + difficultyLevel * 0.07);
  }
}
