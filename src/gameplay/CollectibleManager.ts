import * as THREE from 'three';
import { LaneIndex, LaneSystem } from '../track/LaneSystem';
import { DESPAWN_Z, SPAWN_Z } from '../utils/Constants';
import { ObjectPool, Poolable } from '../utils/ObjectPool';
import { TextureBundle } from '../utils/TextureFactory';

export type CollectibleType = 'energy_orb' | 'score_crystal' | 'boost_cell';

export interface CollectibleInstance extends Poolable {
  kind: CollectibleType;
  lane: LaneIndex;
  group: THREE.Group;
  phase: number;
}

export interface BoostPadInstance extends Poolable {
  lane: LaneIndex;
  mesh: THREE.Mesh;
}

export class CollectibleManager {
  public readonly group = new THREE.Group();

  private readonly collectiblePool: ObjectPool<CollectibleInstance>;
  private readonly padPool: ObjectPool<BoostPadInstance>;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private elapsed = 0;

  constructor(textures: TextureBundle) {
    const orbCoreGeo = new THREE.OctahedronGeometry(0.45, 0);
    const orbRingGeo = new THREE.TorusGeometry(0.66, 0.06, 8, 20);

    // Classic Arcade Gold Coin (upright spinning coin with embossed rim & center star bar)
    const coinDiscGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.14, 24);
    coinDiscGeo.rotateX(Math.PI / 2);
    const coinRimGeo = new THREE.TorusGeometry(0.54, 0.065, 10, 24);
    const coinEmblemGeo = new THREE.BoxGeometry(0.18, 0.56, 0.17);

    const cellGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.95, 12);
    const cellRingGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 18);
    const padGeo = new THREE.PlaneGeometry(2.7, 7.2);
    padGeo.rotateX(-Math.PI / 2);

    this.geometries.push(
      orbCoreGeo,
      orbRingGeo,
      coinDiscGeo,
      coinRimGeo,
      coinEmblemGeo,
      cellGeo,
      cellRingGeo,
      padGeo,
    );

    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.2,
    });
    const coinGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.85,
    });
    const coinRimMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
      roughness: 0.16,
      metalness: 0.9,
    });
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 1.2,
      roughness: 0.18,
      metalness: 0.3,
    });
    const whiteRingMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const padMat = new THREE.MeshBasicMaterial({
      map: textures.boostPad,
      transparent: true,
      opacity: 0.84,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.materials.push(orbMat, coinGoldMat, coinRimMat, cellMat, whiteRingMat, padMat);

    const kinds: CollectibleType[] = [
      'score_crystal',
      'energy_orb',
      'score_crystal',
      'boost_cell',
    ];
    const colItems: CollectibleInstance[] = [];

    for (let i = 0; i < 30; i++) {
      const kind = kinds[i % kinds.length];
      const cGroup = new THREE.Group();
      cGroup.visible = false;

      if (kind === 'energy_orb') {
        cGroup.add(
          new THREE.Mesh(orbCoreGeo, orbMat),
          new THREE.Mesh(orbRingGeo, whiteRingMat),
        );
      } else if (kind === 'score_crystal') {
        cGroup.add(
          new THREE.Mesh(coinDiscGeo, coinGoldMat),
          new THREE.Mesh(coinRimGeo, coinRimMat),
          new THREE.Mesh(coinEmblemGeo, coinRimMat),
        );
      } else {
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.rotation.z = 0.25;
        cGroup.add(cell, new THREE.Mesh(cellRingGeo, whiteRingMat));
      }

      this.group.add(cGroup);
      colItems.push({
        active: false,
        kind,
        lane: 1,
        group: cGroup,
        phase: i * 0.7,
      });
    }

    const padItems: BoostPadInstance[] = [];
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(padGeo, padMat);
      mesh.visible = false;
      mesh.position.y = 0.04;
      this.group.add(mesh);
      padItems.push({
        active: false,
        lane: 1,
        mesh,
      });
    }

    this.collectiblePool = new ObjectPool(colItems);
    this.padPool = new ObjectPool(padItems);
  }

  public spawnRewardInLane(lane: LaneIndex, spawnZ = SPAWN_Z): void {
    const roll = Math.random();
    if (roll < 0.16) {
      const pad = this.padPool.acquire();
      if (pad) {
        pad.active = true;
        pad.lane = lane;
        pad.mesh.position.set(LaneSystem.getLaneX(lane), 0.04, spawnZ);
        pad.mesh.visible = true;
      }
      return;
    }

    if (roll < 0.9) {
      const kindRoll = Math.random();
      const kind: CollectibleType =
        kindRoll < 0.16
          ? 'boost_cell'
          : kindRoll < 0.62
            ? 'score_crystal'
            : 'energy_orb';
      const count =
        kind === 'score_crystal'
          ? Math.random() < 0.55
            ? 3
            : 2
          : kind === 'energy_orb'
            ? 2
            : 1;

      for (let i = 0; i < count; i++) {
        const item = this.collectiblePool.acquire((c) => c.kind === kind);
        if (!item) break;
        item.active = true;
        item.lane = lane;
        item.group.position.set(LaneSystem.getLaneX(lane), 1.0, spawnZ - i * 5.0);
        item.group.visible = true;
      }
    }
  }

  public update(dt: number, worldSpeed: number): void {
    this.elapsed = (this.elapsed + dt) % (Math.PI * 200);

    this.collectiblePool.forEachActive((col) => {
      col.group.position.z += worldSpeed * dt;
      col.group.rotation.y =
        (col.group.rotation.y + dt * (col.kind === 'score_crystal' ? 3.8 : 3.0)) %
        (Math.PI * 2);
      col.group.position.y = 0.95 + Math.sin(this.elapsed * 4.5 + col.phase) * 0.14;

      if (col.group.position.z > DESPAWN_Z) {
        col.active = false;
        col.group.visible = false;
      }
    });

    this.padPool.forEachActive((pad) => {
      pad.mesh.position.z += worldSpeed * dt;
      if (pad.mesh.position.z > DESPAWN_Z) {
        pad.active = false;
        pad.mesh.visible = false;
      }
    });
  }

  public forEachActiveCollectible(callback: (col: CollectibleInstance) => void): void {
    this.collectiblePool.forEachActive(callback);
  }

  public forEachActivePad(callback: (pad: BoostPadInstance) => void): void {
    this.padPool.forEachActive(callback);
  }

  public reset(): void {
    this.elapsed = 0;
    this.collectiblePool.forEachAll((c) => {
      c.active = false;
      c.group.visible = false;
    });
    this.padPool.forEachAll((p) => {
      p.active = false;
      p.mesh.visible = false;
    });
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
