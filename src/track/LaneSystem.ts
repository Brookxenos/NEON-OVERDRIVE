import { LANE_POSITIONS } from '../utils/Constants';
import { clamp } from '../utils/MathUtils';

export type LaneIndex = 0 | 1 | 2;

export class LaneSystem {
  public static readonly LANE_COUNT = 3;

  public static clampLane(index: number): LaneIndex {
    return clamp(Math.round(index), 0, 2) as LaneIndex;
  }

  public static getLaneX(lane: LaneIndex): number {
    return LANE_POSITIONS[lane];
  }

  public static getAllLanes(): LaneIndex[] {
    return [0, 1, 2];
  }
}
