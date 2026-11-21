import * as THREE from 'three';
import { COLORS } from '../utils/Constants';

const SPEED_LINE_COUNT = 22;
const RAIN_STREAK_COUNT = 28;

export class SpeedEffects {
  public readonly group = new THREE.Group();

  private readonly speedLinesMesh: THREE.InstancedMesh;
  private readonly speedLinePositions: Array<{ x: number; y: number; z: number; len: number }> = [];
  private readonly speedLineGeo: THREE.BoxGeometry;
  private readonly speedLineMat: THREE.MeshBasicMaterial;

  private readonly rainMesh: THREE.InstancedMesh;
  private readonly rainPositions: Array<{ x: number; y: number; z: number }> = [];
  private readonly rainGeo: THREE.BoxGeometry;
  private readonly rainMat: THREE.MeshBasicMaterial;

  private readonly dummy = new THREE.Object3D();

  constructor() {
    this.speedLineGeo = new THREE.BoxGeometry(0.045, 0.045, 1);
    this.speedLineMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.24,
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
        x: side * (7.6 + Math.random() * 6.4),
        y: 0.8 + Math.random() * 5.2,
        z: -Math.random() * 140,
        len: 2.8 + Math.random() * 4.5,
      });
    }
    this.group.add(this.speedLinesMesh);

    this.rainGeo = new THREE.BoxGeometry(0.02, 0.45, 0.2);
    this.rainMat = new THREE.MeshBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.14,
    });
    this.rainMesh = new THREE.InstancedMesh(
      this.rainGeo,
      this.rainMat,
      RAIN_STREAK_COUNT,
    );
    this.rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rainMesh.frustumCulled = false;

    for (let i = 0; i < RAIN_STREAK_COUNT; i++) {
      this.rainPositions.push({
        x: (Math.random() - 0.5) * 24,
        y: 0.4 + Math.random() * 10,
        z: -Math.random() * 75 + 6,
      });
    }
    this.group.add(this.rainMesh);
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    const streakSpeed = worldSpeed * (isBoosting ? 1.65 : 1.05);
    this.speedLineMat.opacity = isBoosting ? 0.36 : Math.min(0.22, Math.max(0.06, (worldSpeed - 30) / 220));
    this.speedLineMat.color.setHex(isBoosting ? 0x38bdf8 : COLORS.neonCyan);

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const line = this.speedLinePositions[i];
      line.z += streakSpeed * dt;
      if (line.z > 18) {
        line.z = -125 - Math.random() * 40;
      }
      const stretch = line.len * (isBoosting ? 2.1 : 1.0);
      this.dummy.position.set(line.x, line.y, line.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, stretch);
      this.dummy.updateMatrix();
      this.speedLinesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.speedLinesMesh.instanceMatrix.needsUpdate = true;

    const rainFall = 14;
    const rainForward = Math.max(12, worldSpeed * 0.72);
    for (let i = 0; i < RAIN_STREAK_COUNT; i++) {
      const r = this.rainPositions[i];
      r.y -= rainFall * dt;
      r.z += rainForward * dt;
      if (r.y < 0.2 || r.z > 12) {
        r.x = (Math.random() - 0.5) * 24;
        r.y = 7 + Math.random() * 5;
        r.z = -Math.random() * 68;
      }
      this.dummy.position.set(r.x, r.y, r.z);
      this.dummy.rotation.set(0.65, 0, 0);
      this.dummy.scale.set(1, 1, isBoosting ? 1.9 : 1.1);
      this.dummy.updateMatrix();
      this.rainMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.speedLineGeo.dispose();
    this.speedLineMat.dispose();
    this.rainGeo.dispose();
    this.rainMat.dispose();
  }
}
