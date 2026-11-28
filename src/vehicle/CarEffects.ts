import { ParticleSystem } from '../effects/ParticleSystem';

export class CarEffects {
  public reset(): void {}

  public update(
    _dt: number,
    _worldSpeed: number,
    _carX: number,
    _flameIntensity: number,
    _isCrashed: boolean,
    _flameInnerColor: number,
    _flameOuterColor: number,
    _particles: ParticleSystem,
  ): void {}
}
