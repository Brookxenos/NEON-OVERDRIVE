import { LaneIndex, LaneSystem } from '../track/LaneSystem';
import { ObstacleType } from './ObstacleManager';

export interface TacticalWavePlan {
  safeLane: LaneIndex;
  blockedLanes: LaneIndex[];
  obstacleKind: ObstacleType;
  relativeSpeedOverride?: number;
  spacingScale: number;
  laneShiftSteps: number;
  preferRewardInSafeLane: boolean;
}

interface QueuedStep {
  safeLane: LaneIndex;
  blockCount: 1 | 2;
  preferredBlocked?: LaneIndex[];
  obstacleKind: ObstacleType;
  relativeSpeedOverride?: number;
  spacingScale: number;
  preferRewardInSafeLane: boolean;
}

type FormationId =
  | 'center_funnel'
  | 'slalom_weave'
  | 'traffic_convoy'
  | 'checkpoint_lockdown'
  | 'hazard_chicane'
  | 'double_squeeze'
  | 'apex_sweep';

export class TacticalWaveDirector {
  private queue: QueuedStep[] = [];
  private lastSafeLane: LaneIndex = 1;
  private lastFormation: FormationId | null = null;

  public reset(): void {
    this.queue.length = 0;
    this.lastSafeLane = 1;
    this.lastFormation = null;
  }

  public seedOpeningFormation(): void {
    this.reset();
    // Crisp 3-wave opening sequence: barrier nudge -> twin laser gate -> flank roadblock squeeze
    const openFlank: LaneIndex = Math.random() < 0.5 ? 0 : 2;
    const oppFlank: LaneIndex = openFlank === 0 ? 2 : 0;
    this.queue.push(
      {
        safeLane: 1,
        blockCount: 1,
        preferredBlocked: [oppFlank],
        obstacleKind: 'barrier',
        spacingScale: 0.94,
        preferRewardInSafeLane: true,
      },
      {
        safeLane: 1,
        blockCount: 2,
        preferredBlocked: [0, 2],
        obstacleKind: 'laser_gate',
        spacingScale: 0.92,
        preferRewardInSafeLane: true,
      },
      {
        safeLane: openFlank,
        blockCount: 2,
        preferredBlocked: [1, oppFlank],
        obstacleKind: 'roadblock',
        spacingScale: 1.0,
        preferRewardInSafeLane: true,
      },
    );
    this.lastFormation = 'center_funnel';
  }

  public nextWave(
    difficultyLevel: number,
    clearLanes: LaneIndex[],
    allowTwoLaneJump: boolean,
  ): TacticalWavePlan {
    if (this.queue.length === 0) {
      this.enqueueFormation(difficultyLevel, allowTwoLaneJump);
    }

    const step = this.queue.shift()!;
    const allLanes = LaneSystem.getAllLanes();
    const corridorPool = clearLanes.length > 0 ? clearLanes : allLanes;

    let safeLane = step.safeLane;
    if (!corridorPool.includes(safeLane)) {
      const adjacent = corridorPool.filter((l) => Math.abs(l - this.lastSafeLane) <= 1);
      const fallback = adjacent.length > 0 ? adjacent : corridorPool;
      safeLane = fallback[Math.floor(Math.random() * fallback.length)];
    }

    const laneShiftSteps = Math.abs(safeLane - this.lastSafeLane);
    this.lastSafeLane = safeLane;

    let blockedLanes: LaneIndex[];
    if (
      step.preferredBlocked &&
      !step.preferredBlocked.includes(safeLane) &&
      step.preferredBlocked.length === step.blockCount
    ) {
      blockedLanes = [...step.preferredBlocked];
    } else {
      const others = allLanes.filter((l) => l !== safeLane);
      if (step.blockCount === 1 && others.length === 2) {
        const pick = Math.random() < 0.5 ? others[0] : others[1];
        blockedLanes = [pick];
      } else {
        blockedLanes = others.slice(0, step.blockCount);
      }
    }

    return {
      safeLane,
      blockedLanes,
      obstacleKind: step.obstacleKind,
      relativeSpeedOverride: step.relativeSpeedOverride,
      spacingScale: step.spacingScale,
      laneShiftSteps,
      preferRewardInSafeLane: step.preferRewardInSafeLane,
    };
  }

  private enqueueFormation(difficultyLevel: number, allowTwoLaneJump: boolean): void {
    const available: FormationId[] = [
      'center_funnel',
      'slalom_weave',
      'checkpoint_lockdown',
      'traffic_convoy',
    ];
    if (difficultyLevel >= 2) available.push('hazard_chicane', 'double_squeeze');
    if (difficultyLevel >= 3 && allowTwoLaneJump) available.push('apex_sweep');

    const nonRepeating = available.filter((id) => id !== this.lastFormation);
    const pool = nonRepeating.length > 0 ? nonRepeating : available;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.lastFormation = chosen;

    const dir: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
    const flank: LaneIndex = dir === -1 ? 0 : 2;
    const oppFlank: LaneIndex = dir === -1 ? 2 : 0;

    switch (chosen) {
      case 'center_funnel': {
        this.queue.push(
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'barrier',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'roadblock',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'laser_gate',
            spacingScale: 0.98,
            preferRewardInSafeLane: true,
          },
        );
        break;
      }

      case 'slalom_weave': {
        const sequence: LaneIndex[] = [flank, 1, oppFlank, 1];
        const kind: ObstacleType = difficultyLevel >= 2 ? 'laser_gate' : 'barrier';
        sequence.forEach((lane, idx) => {
          const isLast = idx === sequence.length - 1;
          const blockCount: 1 | 2 = difficultyLevel >= 2 || idx >= 1 ? 2 : 1;
          this.queue.push({
            safeLane: lane,
            blockCount,
            obstacleKind: kind,
            spacingScale: isLast ? 0.98 : 0.84,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'traffic_convoy': {
        const convoySpeed = -Math.min(8.5, 3.2 + (difficultyLevel - 1) * 0.6);
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: difficultyLevel >= 2 || idx >= 1 ? 2 : 1,
            obstacleKind: 'traffic',
            relativeSpeedOverride: convoySpeed,
            spacingScale: isLast ? 1.0 : 0.9,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'checkpoint_lockdown': {
        this.queue.push(
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'roadblock',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'laser_gate',
            spacingScale: 0.86,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'roadblock',
            spacingScale: 0.98,
            preferRewardInSafeLane: true,
          },
        );
        break;
      }

      case 'hazard_chicane': {
        const lanesOrder: LaneIndex[] = [1, flank, 1, oppFlank];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: 'hazard_zone',
            spacingScale: isLast ? 1.0 : 0.88,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'double_squeeze': {
        const lanesOrder: LaneIndex[] = [flank, 1, flank, 1];
        const kind: ObstacleType = Math.random() < 0.5 ? 'barrier' : 'laser_gate';
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: kind,
            spacingScale: isLast ? 1.0 : 0.82,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'apex_sweep': {
        this.queue.push(
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'barrier',
            spacingScale: 0.94,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: oppFlank,
            blockCount: 2,
            preferredBlocked: [flank, 1],
            obstacleKind: 'laser_gate',
            spacingScale: 0.95,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'roadblock',
            spacingScale: 1.02,
            preferRewardInSafeLane: true,
          },
        );
        break;
      }
    }
  }
}
