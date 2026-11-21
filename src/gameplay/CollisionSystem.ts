import * as THREE from 'three';
import { PLAYER_Z } from '../utils/Constants';
import { aabbIntersects2D } from '../utils/MathUtils';
import { CollectibleManager, CollectibleType } from './CollectibleManager';
import { ObstacleManager } from './ObstacleManager';

export interface CollectedEvent {
  kind: CollectibleType;
  position: THREE.Vector3;
}

export interface CollisionReport {
  crashed: boolean;
  crashCause: string;
  crashPosition: THREE.Vector3;
  collected: CollectedEvent[];
  hitBoostPad: boolean;
  nearMissCount: number;
}

export class CollisionSystem {
  private readonly playerHalfW = 0.78;
  private readonly playerHalfZ = 1.55;

  public evaluate(
    playerX: number,
    obstacles: ObstacleManager,
    collectibles: CollectibleManager,
    report: CollisionReport,
  ): void {
    report.crashed = false;
    report.crashCause = '';
    report.collected.length = 0;
    report.hitBoostPad = false;
    report.nearMissCount = 0;

    obstacles.forEachActive((obs) => {
      const ox = obs.group.position.x;
      const oz = obs.group.position.z;

      if (
        aabbIntersects2D(
          playerX,
          PLAYER_Z,
          this.playerHalfW,
          this.playerHalfZ,
          ox,
          oz,
          obs.halfW,
          obs.halfZ,
        )
      ) {
        report.crashed = true;
        report.crashCause = obstacles.describeObstacle(obs.kind);
        report.crashPosition.set(playerX, 0.9, PLAYER_Z);
        return;
      }

      const dx = Math.abs(playerX - ox);
      if (
        !obs.nearMissed &&
        oz > PLAYER_Z &&
        oz < PLAYER_Z + 4.5 &&
        dx < this.playerHalfW + obs.halfW + 1.35 &&
        dx >= this.playerHalfW + obs.halfW
      ) {
        obs.nearMissed = true;
        report.nearMissCount += 1;
      }
    });

    collectibles.forEachActiveCollectible((col) => {
      if (
        aabbIntersects2D(
          playerX,
          PLAYER_Z,
          1.1,
          1.4,
          col.group.position.x,
          col.group.position.z,
          0.45,
          0.75,
        )
      ) {
        col.active = false;
        col.group.visible = false;
        report.collected.push({
          kind: col.kind,
          position: col.group.position.clone(),
        });
      }
    });

    collectibles.forEachActivePad((pad) => {
      if (
        aabbIntersects2D(
          playerX,
          PLAYER_Z,
          0.9,
          1.2,
          pad.mesh.position.x,
          pad.mesh.position.z,
          0.65,
          2.4,
        )
      ) {
        pad.active = false;
        pad.mesh.visible = false;
        report.hitBoostPad = true;
      }
    });
  }
}
