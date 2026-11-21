import { BASE_MAX_SPEED, BASE_START_SPEED } from '../utils/Constants';
import { randomRange } from '../utils/MathUtils';

export class DifficultyManager {
  public getLevel(distance: number): number {
    return 1 + Math.floor(distance / 360);
  }

  public getBaseSpeed(distance: number): number {
    return Math.min(BASE_MAX_SPEED, BASE_START_SPEED + distance * 0.017);
  }

  public getNextWaveSpacing(difficultyLevel: number): number {
    const minSpacing = Math.max(20, 36 - difficultyLevel * 2.2);
    const maxSpacing = Math.max(30, 50 - difficultyLevel * 2.5);
    return randomRange(minSpacing, maxSpacing);
  }

  public getDoubleBlockChance(difficultyLevel: number): number {
    return Math.min(0.82, 0.28 + difficultyLevel * 0.09);
  }
}
