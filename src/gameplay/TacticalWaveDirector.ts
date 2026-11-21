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

type OpeningFormationId =
  | 'gate_gauntlet'
  | 'sunset_slalom'
  | 'convoy_ambush'
  | 'emp_corridor'
  | 'armor_lockdown'
  | 'split_apex'
  | 'turbo_chicane';

type FormationId =
  | 'center_funnel'
  | 'slalom_weave'
  | 'traffic_convoy'
  | 'checkpoint_lockdown'
  | 'hazard_chicane'
  | 'double_squeeze'
  | 'apex_sweep'
  | 'twin_convoy_cut'
  | 'emp_laser_combo'
  | 'fortress_corridor'
  | 'gauntlet_crossfire'
  | 'phantom_zig_zag'
  | 'velocity_choke'
  | 'overdrive_blitz'
  | 'rush_hour_convoy'
  | 'apex_hellstorm';

const OPENING_FORMATION_LABELS: Record<OpeningFormationId, string> = {
  gate_gauntlet: 'GATE GAUNTLET',
  sunset_slalom: 'SUNSET SLALOM',
  convoy_ambush: 'CONVOY AMBUSH',
  emp_corridor: 'EMP CORRIDOR',
  armor_lockdown: 'ARMOR LOCKDOWN',
  split_apex: 'SPLIT APEX',
  turbo_chicane: 'TURBO CHICANE',
};

export class TacticalWaveDirector {
  private queue: QueuedStep[] = [];
  private lastSafeLane: LaneIndex = 1;
  private lastFormation: FormationId | null = null;
  private lastOpeningFormation: OpeningFormationId | null = null;

  public reset(): void {
    this.queue.length = 0;
    this.lastSafeLane = 1;
    this.lastFormation = null;
  }

  public seedOpeningFormation(): string {
    this.reset();

    const openingPool: OpeningFormationId[] = [
      'gate_gauntlet',
      'sunset_slalom',
      'convoy_ambush',
      'emp_corridor',
      'armor_lockdown',
      'split_apex',
      'turbo_chicane',
    ];
    const nonRepeating = openingPool.filter((id) => id !== this.lastOpeningFormation);
    const candidates = nonRepeating.length > 0 ? nonRepeating : openingPool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastOpeningFormation = chosen;

    const flank: LaneIndex = Math.random() < 0.5 ? 0 : 2;
    const oppFlank: LaneIndex = flank === 0 ? 2 : 0;

    switch (chosen) {
      case 'gate_gauntlet': {
        this.queue.push(
          {
            safeLane: 1,
            blockCount: 1,
            preferredBlocked: [oppFlank],
            obstacleKind: 'barrier',
            spacingScale: 0.92,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'laser_gate',
            spacingScale: 0.9,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'roadblock',
            spacingScale: 0.9,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'laser_gate',
            spacingScale: 0.9,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: oppFlank,
            blockCount: 2,
            preferredBlocked: [flank, 1],
            obstacleKind: 'barrier',
            spacingScale: 0.98,
            preferRewardInSafeLane: true,
          },
        );
        this.lastFormation = 'checkpoint_lockdown';
        break;
      }

      case 'sunset_slalom': {
        const sequence: LaneIndex[] = [flank, 1, oppFlank, 1, flank];
        sequence.forEach((lane, idx) => {
          const isLast = idx === sequence.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: idx === 0 ? 1 : 2,
            obstacleKind: idx % 2 === 0 ? 'barrier' : 'laser_gate',
            spacingScale: isLast ? 0.98 : 0.86,
            preferRewardInSafeLane: true,
          });
        });
        this.lastFormation = 'slalom_weave';
        break;
      }

      case 'convoy_ambush': {
        const convoySpeed = -3.2;
        const sequence: LaneIndex[] = [1, flank, 1, oppFlank, 1];
        sequence.forEach((lane, idx) => {
          const isLast = idx === sequence.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: idx === 0 ? 1 : 2,
            obstacleKind: 'traffic',
            relativeSpeedOverride: convoySpeed,
            spacingScale: isLast ? 1.0 : 0.92,
            preferRewardInSafeLane: true,
          });
        });
        this.lastFormation = 'traffic_convoy';
        break;
      }

      case 'emp_corridor': {
        const sequence: LaneIndex[] = [flank, 1, oppFlank, 1, flank];
        sequence.forEach((lane, idx) => {
          const isLast = idx === sequence.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: idx === 0 ? 1 : 2,
            obstacleKind: 'hazard_zone',
            spacingScale: isLast ? 0.98 : 0.88,
            preferRewardInSafeLane: true,
          });
        });
        this.lastFormation = 'hazard_chicane';
        break;
      }

      case 'armor_lockdown': {
        this.queue.push(
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'roadblock',
            spacingScale: 0.9,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'barrier',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'roadblock',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: oppFlank,
            blockCount: 2,
            preferredBlocked: [flank, 1],
            obstacleKind: 'roadblock',
            spacingScale: 0.9,
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
        this.lastFormation = 'fortress_corridor';
        break;
      }

      case 'split_apex': {
        this.queue.push(
          {
            safeLane: flank,
            blockCount: 1,
            preferredBlocked: [1],
            obstacleKind: 'barrier',
            spacingScale: 0.92,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: flank,
            blockCount: 2,
            preferredBlocked: [1, oppFlank],
            obstacleKind: 'laser_gate',
            spacingScale: 0.88,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'traffic',
            relativeSpeedOverride: -2.8,
            spacingScale: 0.92,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: oppFlank,
            blockCount: 2,
            preferredBlocked: [flank, 1],
            obstacleKind: 'roadblock',
            spacingScale: 0.9,
            preferRewardInSafeLane: true,
          },
          {
            safeLane: 1,
            blockCount: 2,
            preferredBlocked: [0, 2],
            obstacleKind: 'barrier',
            spacingScale: 0.98,
            preferRewardInSafeLane: true,
          },
        );
        this.lastFormation = 'center_funnel';
        break;
      }

      case 'turbo_chicane': {
        const sequence: LaneIndex[] = [flank, 1, oppFlank, 1, oppFlank];
        const kinds: ObstacleType[] = [
          'laser_gate',
          'hazard_zone',
          'laser_gate',
          'hazard_zone',
          'laser_gate',
        ];
        sequence.forEach((lane, idx) => {
          const isLast = idx === sequence.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: idx === 0 ? 1 : 2,
            obstacleKind: kinds[idx],
            spacingScale: isLast ? 0.98 : 0.86,
            preferRewardInSafeLane: true,
          });
        });
        this.lastFormation = 'emp_laser_combo';
        break;
      }
    }

    return OPENING_FORMATION_LABELS[chosen];
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
    const available: FormationId[] =
      difficultyLevel >= 8
        ? ['checkpoint_lockdown', 'fortress_corridor']
        : [
            'center_funnel',
            'slalom_weave',
            'checkpoint_lockdown',
            'traffic_convoy',
            'fortress_corridor',
          ];
    if (difficultyLevel >= 2) {
      available.push('hazard_chicane', 'double_squeeze', 'emp_laser_combo', 'twin_convoy_cut');
    }
    if (difficultyLevel >= 3 && allowTwoLaneJump) available.push('apex_sweep');
    if (difficultyLevel >= 5) available.push('gauntlet_crossfire');
    if (difficultyLevel >= 8 && allowTwoLaneJump) available.push('phantom_zig_zag', 'phantom_zig_zag');
    if (difficultyLevel >= 10) available.push('velocity_choke', 'velocity_choke');
    if (difficultyLevel >= 12) available.push('overdrive_blitz', 'overdrive_blitz');
    if (difficultyLevel >= 15) available.push('rush_hour_convoy', 'rush_hour_convoy');
    if (difficultyLevel >= 18) available.push('apex_hellstorm', 'apex_hellstorm');

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
        const convoySpeed = -Math.min(15.5, 3.2 + (difficultyLevel - 1) * 0.42);
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

      case 'twin_convoy_cut': {
        const convoySpeed = -Math.min(16.5, 3.6 + (difficultyLevel - 1) * 0.45);
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank, 1];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: 'traffic',
            relativeSpeedOverride: convoySpeed,
            spacingScale: isLast ? 1.0 : 0.88,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'emp_laser_combo': {
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank, 1];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: idx % 2 === 0 ? 'hazard_zone' : 'laser_gate',
            spacingScale: isLast ? 1.0 : 0.86,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'fortress_corridor': {
        const lanesOrder: LaneIndex[] = [1, oppFlank, 1, flank];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: idx % 2 === 0 ? 'roadblock' : 'barrier',
            spacingScale: isLast ? 1.0 : 0.86,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'gauntlet_crossfire': {
        const fastConvoy = -Math.min(17.5, 4.2 + (difficultyLevel - 1) * 0.45);
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank, 1, flank];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          const useTraffic = idx % 2 === 0;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: useTraffic ? 'traffic' : 'laser_gate',
            relativeSpeedOverride: useTraffic ? fastConvoy : undefined,
            spacingScale: isLast ? 0.98 : 0.84,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'phantom_zig_zag': {
        const lanesOrder: LaneIndex[] = [flank, oppFlank, 1, flank, oppFlank];
        const kinds: ObstacleType[] = [
          'laser_gate',
          'roadblock',
          'hazard_zone',
          'laser_gate',
          'roadblock',
        ];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: kinds[idx],
            spacingScale: isLast ? 1.0 : 0.9,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'overdrive_blitz': {
        const convoySpeed = -Math.min(18, 5.0 + (difficultyLevel - 1) * 0.45);
        const lanesOrder: LaneIndex[] = [1, flank, 1, oppFlank, 1, flank];
        const kinds: ObstacleType[] = [
          'hazard_zone',
          'traffic',
          'laser_gate',
          'traffic',
          'roadblock',
          'hazard_zone',
        ];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          const kind = kinds[idx];
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: kind,
            relativeSpeedOverride: kind === 'traffic' ? convoySpeed : undefined,
            spacingScale: isLast ? 0.98 : 0.82,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'velocity_choke': {
        const fastConvoy = -Math.min(18.5, 4.8 + (difficultyLevel - 1) * 0.45);
        const lanesOrder: LaneIndex[] = [1, flank, oppFlank, 1, flank, 1];
        const kinds: ObstacleType[] = [
          'roadblock',
          'traffic',
          'laser_gate',
          'roadblock',
          'traffic',
          'hazard_zone',
        ];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          const kind = kinds[idx];
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: kind,
            relativeSpeedOverride: kind === 'traffic' ? fastConvoy : undefined,
            spacingScale: isLast ? 0.98 : 0.82,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'rush_hour_convoy': {
        const fastSpeed = -Math.min(19.5, 5.5 + (difficultyLevel - 1) * 0.45);
        const slowSpeed = -Math.min(11, 2.8 + (difficultyLevel - 1) * 0.25);
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank, 1, flank, oppFlank, 1];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: idx === 3 ? 'laser_gate' : 'traffic',
            relativeSpeedOverride: idx === 3 ? undefined : idx % 2 === 0 ? fastSpeed : slowSpeed,
            spacingScale: isLast ? 1.0 : 0.84,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }

      case 'apex_hellstorm': {
        const baseDelta = Math.min(18, 5.5 + (difficultyLevel - 1) * 0.42);
        const lanesOrder: LaneIndex[] = [flank, 1, oppFlank, flank, 1, oppFlank];
        const kinds: ObstacleType[] = [
          'traffic',
          'roadblock',
          'traffic',
          'laser_gate',
          'hazard_zone',
          'traffic',
        ];
        lanesOrder.forEach((lane, idx) => {
          const isLast = idx === lanesOrder.length - 1;
          const kind = kinds[idx];
          this.queue.push({
            safeLane: lane,
            blockCount: 2,
            obstacleKind: kind,
            relativeSpeedOverride:
              kind === 'traffic' ? -(baseDelta * (idx % 2 === 0 ? 1.0 : 0.65)) : undefined,
            spacingScale: isLast ? 1.0 : 0.84,
            preferRewardInSafeLane: true,
          });
        });
        break;
      }
    }
  }
}
