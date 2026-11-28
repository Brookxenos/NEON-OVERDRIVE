import * as THREE from 'three';
import { COLORS } from '../utils/Constants';

interface ParticleSlot {
  active: boolean;
  needsClear: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  gravity: number;
  stretchZ: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 180;

export class ParticleSystem {
  public readonly mesh: THREE.InstancedMesh;

  private readonly particles: ParticleSlot[] = [];
  private readonly geometry: THREE.IcosahedronGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly instanceTransform = new THREE.Object3D();
  private readonly scratchColor = new THREE.Color();

  constructor() {
    this.geometry = new THREE.IcosahedronGeometry(0.068, 1);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        needsClear: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        gravity: 9.5,
        stretchZ: 1,
        color: new THREE.Color(COLORS.neonCyan),
      });
      this.instanceTransform.position.set(0, -50, 0);
      this.instanceTransform.scale.set(0, 0, 0);
      this.instanceTransform.updateMatrix();
      this.mesh.setMatrixAt(i, this.instanceTransform.matrix);
      this.mesh.setColorAt(i, this.scratchColor.setHex(COLORS.neonCyan));
    }
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    maxLife: number,
    scale: number,
    hex: number,
    gravity = 9.5,
    stretchZ = 1,
  ): void {
    const slot = this.particles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.needsClear = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.scale = scale;
    slot.gravity = gravity;
    slot.stretchZ = stretchZ;
    slot.color.setHex(hex);
  }

  public emitBurst(pos: THREE.Vector3, hex: number, count = 18, force = 9): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.15) * force;
      const radial = (0.3 + Math.random() * 0.7) * force;
      this.spawn(
        pos.x,
        pos.y,
        pos.z,
        Math.cos(angle) * radial,
        up,
        Math.sin(angle) * radial,
        0.35 + Math.random() * 0.35,
        0.75 + Math.random() * 0.9,
        hex,
      );
    }
  }

  public emitCrashExplosion(pos: THREE.Vector3): void {
    this.emitBurst(pos, COLORS.neonMagenta, 38, 16);
    this.emitBurst(pos, COLORS.neonCyan, 24, 13);
    this.emitBurst(pos, COLORS.energyAmber, 18, 11);
  }

  public update(dt: number): void {
    let matrixDirty = false;
    let colorDirty = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        if (p.needsClear) {
          p.needsClear = false;
          this.instanceTransform.position.set(0, -50, 0);
          this.instanceTransform.scale.set(0, 0, 0);
          this.instanceTransform.updateMatrix();
          this.mesh.setMatrixAt(i, this.instanceTransform.matrix);
          matrixDirty = true;
        }
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.needsClear = false;
        this.instanceTransform.position.set(0, -50, 0);
        this.instanceTransform.scale.set(0, 0, 0);
        this.instanceTransform.updateMatrix();
        this.mesh.setMatrixAt(i, this.instanceTransform.matrix);
        matrixDirty = true;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= p.gravity * dt;

      const lifeRatio = 1 - p.life / p.maxLife;
      const s = p.scale * lifeRatio * lifeRatio;
      this.instanceTransform.position.set(p.x, p.y, p.z);
      this.instanceTransform.rotation.set(0, 0, 0);
      this.instanceTransform.scale.set(s, s, s * p.stretchZ);
      this.instanceTransform.updateMatrix();
      this.mesh.setMatrixAt(i, this.instanceTransform.matrix);
      this.mesh.setColorAt(i, p.color);
      matrixDirty = true;
      colorDirty = true;
    }

    if (matrixDirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    if (colorDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public reset(): void {
    for (const p of this.particles) {
      if (p.active) {
        p.active = false;
        p.needsClear = true;
      }
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
