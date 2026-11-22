import * as THREE from 'three';
import { damp } from '../utils/MathUtils';

const SPEED_LINE_COUNT = 8;

export class SpeedEffects {
  public readonly group = new THREE.Group();

  private readonly speedLinesMesh: THREE.InstancedMesh;
  private readonly speedLinePositions: Array<{ x: number; y: number; z: number; len: number }> = [];
  private readonly speedLineGeo: THREE.BoxGeometry;
  private readonly speedLineMat: THREE.MeshBasicMaterial;
  private currentOpacity = 0;
  private currentStretch = 1;

  private readonly dummy = new THREE.Object3D();

  constructor() {
    this.speedLineGeo = new THREE.BoxGeometry(0.022, 0.022, 1);
    this.speedLineMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0,
    });
    this.speedLinesMesh = new THREE.InstancedMesh(
      this.speedLineGeo,
      this.speedLineMat,
      SPEED_LINE_COUNT,
    );
    this.speedLinesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.speedLinesMesh.frustumCulled = false;

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.speedLinePositions.push({
        x: side * (8.6 + Math.random() * 5.6),
        y: 0.9 + Math.random() * 4.4,
        z: -Math.random() * 140,
        len: 2.0 + Math.random() * 3.0,
      });
    }
    this.group.add(this.speedLinesMesh);
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    const speedRatio = Math.max(0, Math.min(1, (worldSpeed - 62) / 62));
    const targetOpacity = isBoosting ? 0.18 : speedRatio * 0.11;
    const targetStretch = isBoosting ? 1.85 : 1.0 + speedRatio * 0.45;
    this.currentOpacity = damp(this.currentOpacity, targetOpacity, 7.5, dt);
    this.currentStretch = damp(this.currentStretch, targetStretch, 7.5, dt);

    this.speedLineMat.opacity = this.currentOpacity;
    this.speedLineMat.color.setHex(isBoosting ? 0x67e8f9 : 0xfde68a);

    const streakSpeed = worldSpeed * (isBoosting ? 1.45 : 1.0);
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const line = this.speedLinePositions[i];
      line.z += streakSpeed * dt;
      if (line.z > 18) {
        line.z = -125 - Math.random() * 40;
      }
      const stretch = line.len * this.currentStretch;
      this.dummy.position.set(line.x, line.y, line.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, stretch);
      this.dummy.updateMatrix();
      this.speedLinesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.speedLinesMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.speedLineGeo.dispose();
    this.speedLineMat.dispose();
  }
}
