import * as THREE from 'three';
import { PLAYER_Z } from '../utils/Constants';
import { sweptAabbIntersects2D } from '../utils/MathUtils';
import { CollectibleManager, CollectibleType } from './CollectibleManager';
import { ObstacleManager } from './ObstacleManager';

export interface CollectedEvent {
  kind: CollectibleType;
  position: THREE.Vector3;
  hitTime: number;
}

export interface CollisionReport {
  crashed: boolean;
  crashTime: number;
  crashCause: string;
  crashPosition: THREE.Vector3;
  collected: CollectedEvent[];
  hitBoostPad: boolean;
  nearMissCount: number;
}

export class CollisionSystem {
  private readonly playerHalfW = 0.95;
  private readonly playerHalfZ = 2.2;

  public evaluate(
    prevPlayerX: number,
    currPlayerX: number,
    obstacles: ObstacleManager,
    collectibles: CollectibleManager,
    report: CollisionReport,
  ): void {
    report.crashed = false;
    report.crashTime = 1;
    report.crashCause = '';
    report.collected.length = 0;
    report.hitBoostPad = false;
    report.nearMissCount = 0;

    let earliestCrashTime = Infinity;

    obstacles.forEachActive((obs) => {
      const ox = obs.group.position.x;
      const oz = obs.group.position.z;

      const hitTime = sweptAabbIntersects2D(
        prevPlayerX,
        PLAYER_Z,
        currPlayerX,
        PLAYER_Z,
        this.playerHalfW,
        this.playerHalfZ,
        obs.prevX,
        obs.prevZ,
        ox,
        oz,
        obs.halfW,
        obs.halfZ,
      );

      if (hitTime !== null) {
        if (hitTime < earliestCrashTime) {
          earliestCrashTime = hitTime;
          report.crashed = true;
          report.crashTime = hitTime;
          report.crashCause = obstacles.describeObstacle(obs.kind);
          const hitX = prevPlayerX + (currPlayerX - prevPlayerX) * hitTime;
          report.crashPosition.set(hitX, 0.9, PLAYER_Z);
        }
        return;
      }

      if (!report.crashed && !obs.nearMissed) {
        const dx = Math.abs(currPlayerX - ox);
        const sumW = this.playerHalfW + obs.halfW;
        if (
          oz > PLAYER_Z &&
          (oz < PLAYER_Z + 4.5 || obs.prevZ <= PLAYER_Z + 4.5) &&
          dx >= sumW &&
          dx < sumW + 1.15
        ) {
          obs.nearMissed = true;
          report.nearMissCount += 1;
        }
      }
    });

    collectibles.forEachActiveCollectible((col) => {
      const hitTime = sweptAabbIntersects2D(
        prevPlayerX,
        PLAYER_Z,
        currPlayerX,
        PLAYER_Z,
        1.05,
        1.85,
        col.prevX,
        col.prevZ,
        col.group.position.x,
        col.group.position.z,
        0.5,
        0.8,
      );
      if (hitTime !== null && (!report.crashed || hitTime < report.crashTime)) {
        col.active = false;
        col.group.visible = false;
        report.collected.push({
          kind: col.kind,
          position: col.group.position.clone(),
          hitTime,
        });
      }
    });

    if (!report.crashed) {
      collectibles.forEachActivePad((pad) => {
        const hitTime = sweptAabbIntersects2D(
          prevPlayerX,
          PLAYER_Z,
          currPlayerX,
          PLAYER_Z,
          0.95,
          1.6,
          pad.mesh.position.x,
          pad.prevZ,
          pad.mesh.position.x,
          pad.mesh.position.z,
          0.9,
          2.8,
        );
        if (hitTime !== null) {
          pad.active = false;
          pad.mesh.visible = false;
          report.hitBoostPad = true;
        }
      });
    }
  }
}
