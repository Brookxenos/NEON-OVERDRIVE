import { ParticleSystem } from '../effects/ParticleSystem';

export class CarEffects {
  private exhaustAccumulator = 0;

  public reset(): void {
    this.exhaustAccumulator = 0;
  }

  public update(
    dt: number,
    worldSpeed: number,
    carX: number,
    isBoosting: boolean,
    isCrashed: boolean,
    exhaustColor: number,
    particles: ParticleSystem,
  ): void {
    if (isCrashed || !isBoosting) return;

    const emissionRate = 0.028;
    this.exhaustAccumulator += dt;

    while (this.exhaustAccumulator >= emissionRate) {
      this.exhaustAccumulator -= emissionRate;
      const side = Math.random() > 0.5 ? -0.52 : 0.52;
      particles.spawn(
        carX + side + (Math.random() - 0.5) * 0.08,
        0.31 + (Math.random() - 0.5) * 0.04,
        2.38,
        (Math.random() - 0.5) * 0.5,
        0.18 + Math.random() * 0.28,
        worldSpeed * 0.35 + 4,
        0.2,
        0.58,
        exhaustColor,
      );
    }
  }
}
