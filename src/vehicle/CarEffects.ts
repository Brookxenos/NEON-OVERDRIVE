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

    const emissionRate = 0.022;
    this.exhaustAccumulator += dt;

    while (this.exhaustAccumulator >= emissionRate) {
      this.exhaustAccumulator -= emissionRate;
      const side = Math.random() > 0.5 ? -0.54 : 0.54;
      const pipeOffset = Math.random() > 0.5 ? -0.085 : 0.085;
      const color = Math.random() > 0.45 ? flameOuterColor : flameInnerColor;
      particles.spawn(
        carX + side + pipeOffset + (Math.random() - 0.5) * 0.05,
        0.34 + (Math.random() - 0.5) * 0.04,
        2.44 + Math.random() * 0.14,
        (Math.random() - 0.5) * 1.4,
        0.25 + Math.random() * 0.75,
        worldSpeed * 0.18 + 5.5 + Math.random() * 3.5,
        0.09 + Math.random() * 0.07,
        0.2 + Math.random() * 0.18,
        color,
        -1.6,
        2.4,
      );
    }
  }
}
