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
    flameIntensity: number,
    isCrashed: boolean,
    flameInnerColor: number,
    flameOuterColor: number,
    particles: ParticleSystem,
  ): void {
    if (isCrashed || flameIntensity <= 0.35) return;

    const emissionRate = 0.068;
    this.exhaustAccumulator += dt;

    while (this.exhaustAccumulator >= emissionRate) {
      this.exhaustAccumulator -= emissionRate;
      const side = Math.random() > 0.5 ? -0.54 : 0.54;
      const pipeOffset = Math.random() > 0.5 ? -0.085 : 0.085;
      const color = Math.random() > 0.45 ? flameOuterColor : flameInnerColor;
      particles.spawn(
        carX + side + pipeOffset + (Math.random() - 0.5) * 0.14,
        0.34 + (Math.random() - 0.5) * 0.06,
        2.44 + Math.random() * 0.12,
        (Math.random() - 0.5) * 2.4,
        0.4 + Math.random() * 1.1,
        worldSpeed * 0.08 + 3.2 + Math.random() * 2.2,
        0.06 + Math.random() * 0.045,
        0.065 + Math.random() * 0.05,
        color,
        -2.4,
        1.0,
      );
    }
  }
}
