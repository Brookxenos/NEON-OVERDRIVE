import * as THREE from 'three';

const SPEED_LINE_COUNT = 24;

export class SpeedEffects {
  public readonly group = new THREE.Group();

  private readonly speedLinesMesh: THREE.InstancedMesh;
  private readonly speedLinePositions: Array<{ x: number; y: number; z: number; len: number }> = [];
  private readonly speedLineGeo: THREE.BoxGeometry;
  private readonly speedLineMat: THREE.MeshBasicMaterial;

  private readonly dummy = new THREE.Object3D();

  constructor() {
    this.speedLineGeo = new THREE.BoxGeometry(0.04, 0.04, 1);
    this.speedLineMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.22,
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
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    const streakSpeed = worldSpeed * (isBoosting ? 1.65 : 1.05);
    this.speedLineMat.opacity = isBoosting
      ? 0.34
      : Math.min(0.2, Math.max(0.05, (worldSpeed - 45) / 240));
    this.speedLineMat.color.setHex(isBoosting ? 0x67e8f9 : 0xfde68a);

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
  }

  public dispose(): void {
    this.speedLineGeo.dispose();
    this.speedLineMat.dispose();
  }
}
