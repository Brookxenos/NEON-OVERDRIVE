import * as THREE from 'three';

interface CoinPopupSlot {
  active: boolean;
  life: number;
  maxLife: number;
  startX: number;
  startY: number;
  startZ: number;
  coinGroup: THREE.Group;
  coinMat: THREE.MeshStandardMaterial;
  rimMat: THREE.MeshStandardMaterial;
}

const POPUP_POOL_SIZE = 8;

export class CoinPopupEffects {
  public readonly group = new THREE.Group();

  private readonly slots: CoinPopupSlot[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor() {
    const discGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.13, 24);
    discGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(0.52, 0.06, 10, 24);
    const emblemGeo = new THREE.BoxGeometry(0.16, 0.52, 0.16);

    this.geometries.push(discGeo, rimGeo, emblemGeo);

    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xd97706,
        emissiveIntensity: 1.05,
        roughness: 0.18,
        metalness: 0.85,
        transparent: true,
        opacity: 1,
      });
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.25,
        roughness: 0.16,
        metalness: 0.9,
        transparent: true,
        opacity: 1,
      });

      this.materials.push(coinMat, rimMat);

      const coinGroup = new THREE.Group();
      coinGroup.add(
        new THREE.Mesh(discGeo, coinMat),
        new THREE.Mesh(rimGeo, rimMat),
        new THREE.Mesh(emblemGeo, rimMat),
      );
      coinGroup.visible = false;

      this.group.add(coinGroup);

      this.slots.push({
        active: false,
        life: 0,
        maxLife: 0.34,
        startX: 0,
        startY: 1,
        startZ: 0,
        coinGroup,
        coinMat,
        rimMat,
      });
    }
  }

  public emit(pos: THREE.Vector3): void {
    let slot = this.slots.find((s) => !s.active);
    if (!slot) {
      slot = this.slots.reduce((oldest, current) =>
        current.life > oldest.life ? current : oldest,
      );
    }

    slot.active = true;
    slot.life = 0;
    slot.maxLife = 0.34;
    slot.startX = pos.x;
    slot.startY = Math.max(1.0, pos.y);
    slot.startZ = Math.min(0.25, pos.z);

    slot.coinGroup.position.set(slot.startX, slot.startY, slot.startZ);
    slot.coinGroup.rotation.set(0, 0, 0);
    slot.coinGroup.scale.setScalar(1);
    slot.coinGroup.visible = true;

    slot.coinMat.opacity = 1;
    slot.rimMat.opacity = 1;
  }

  public update(dt: number): void {
    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;

      slot.life += dt;
      const t = slot.life / slot.maxLife;
      if (t >= 1) {
        slot.active = false;
        slot.coinGroup.visible = false;
        continue;
      }

      const easeOut = 1 - Math.pow(1 - t, 3);
      const y = slot.startY + easeOut * 1.15;
      const z = slot.startZ - slot.life * 1.6;
      const scale = 1.0 - t * 0.65;
      const fade = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.55);

      slot.coinGroup.position.set(slot.startX, y, z);
      slot.coinGroup.rotation.y += 14 * dt;
      slot.coinGroup.scale.setScalar(scale);
      slot.coinMat.opacity = fade;
      slot.rimMat.opacity = fade;
    }
  }

  public reset(): void {
    for (const slot of this.slots) {
      slot.active = false;
      slot.coinGroup.visible = false;
    }
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
