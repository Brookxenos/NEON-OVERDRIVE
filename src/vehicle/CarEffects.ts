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
    flameInnerColor: number,
    flameOuterColor: number,
    particles: ParticleSystem,
  ): void {
    if (isCrashed || !isBoosting) return;

    const emissionRate = 0.042;
    this.exhaustAccumulator += dt;

    while (this.exhaustAccumulator >= emissionRate) {
      this.exhaustAccumulator -= emissionRate;
      const side = Math.random() > 0.5 ? -0.54 : 0.54;
      const pipeOffset = Math.random() > 0.5 ? -0.085 : 0.085;
      const color = Math.random() > 0.45 ? flameOuterColor : flameInnerColor;
      particles.spawn(
        carX + side + pipeOffset + (Math.random() - 0.5) * 0.12,
        0.34 + (Math.random() - 0.5) * 0.06,
        2.56 + Math.random() * 0.16,
        (Math.random() - 0.5) * 2.8,
        0.35 + Math.random() * 1.15,
        worldSpeed * 0.12 + 4.5 + Math.random() * 3.0,
        0.07 + Math.random() * 0.05,
        0.13 + Math.random() * 0.12,
        color,
        -2.2,
        1.0,
      );
    }
  }
}
