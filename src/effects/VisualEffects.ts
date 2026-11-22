import * as THREE from 'three';
import { COLORS } from '../utils/Constants';
import { CoinPopupEffects } from './CoinPopupEffects';
import { ParticleSystem } from './ParticleSystem';
import { SpeedEffects } from './SpeedEffects';

export class VisualEffects {
  public readonly group = new THREE.Group();
  public readonly particles = new ParticleSystem();
  public readonly speedEffects = new SpeedEffects();
  public readonly coinPopups = new CoinPopupEffects();

  constructor() {
    this.group.add(this.particles.mesh);
    this.group.add(this.speedEffects.group);
    this.group.add(this.coinPopups.group);
  }

  public emitCollectibleBurst(pos: THREE.Vector3, hex: number, count = 18, force = 9): void {
    this.particles.emitBurst(pos, hex, count, force);
  }

  public emitCoinClaimPopup(pos: THREE.Vector3): void {
    this.coinPopups.emit(pos);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      const radial = 1.1 + Math.random() * 1.2;
      this.particles.spawn(
        pos.x,
        Math.max(1.0, pos.y),
        pos.z,
        Math.cos(angle) * radial,
        4.2 + Math.random() * 1.8,
        Math.sin(angle) * radial * 0.4 - 1.0,
        0.26,
        0.65,
        COLORS.energyAmber,
      );
    }
  }

  public emitCrashExplosion(pos: THREE.Vector3): void {
    this.particles.emitCrashExplosion(pos);
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    this.particles.update(dt);
    this.coinPopups.update(dt);
    this.speedEffects.update(dt, worldSpeed, isBoosting);
  }

  public reset(): void {
    this.particles.reset();
    this.coinPopups.reset();
  }

  public dispose(): void {
    this.particles.dispose();
    this.coinPopups.dispose();
    this.speedEffects.dispose();
  }
}
