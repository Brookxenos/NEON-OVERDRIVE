import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { SpeedEffects } from './SpeedEffects';

export class VisualEffects {
  public readonly group = new THREE.Group();
  public readonly particles = new ParticleSystem();
  public readonly speedEffects = new SpeedEffects();

  constructor() {
    this.group.add(this.particles.mesh);
    this.group.add(this.speedEffects.group);
  }

  public emitCollectibleBurst(pos: THREE.Vector3, hex: number, count = 18, force = 9): void {
    this.particles.emitBurst(pos, hex, count, force);
  }

  public emitCrashExplosion(pos: THREE.Vector3): void {
    this.particles.emitCrashExplosion(pos);
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    this.particles.update(dt);
    this.speedEffects.update(dt, worldSpeed, isBoosting);
  }

  public reset(): void {
    this.particles.reset();
  }

  public dispose(): void {
    this.particles.dispose();
    this.speedEffects.dispose();
  }
}
