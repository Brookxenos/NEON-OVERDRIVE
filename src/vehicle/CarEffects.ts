import { ParticleSystem } from '../effects/ParticleSystem';

export class CarEffects {
  private sparkCooldown = 0;

  public reset(): void {
    this.sparkCooldown = 0;
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
    if (this.sparkCooldown > 0) {
      this.sparkCooldown = Math.max(0, this.sparkCooldown - dt);
    }
    if (isCrashed || flameIntensity <= 0.68 || this.sparkCooldown > 0) return;

    this.sparkCooldown = 0.055;
    const side = Math.random() > 0.5 ? -0.54 : 0.54;
    const pipeOffset = Math.random() > 0.5 ? -0.085 : 0.085;
    const color = Math.random() > 0.45 ? flameOuterColor : flameInnerColor;
    particles.spawn(
      carX + side + pipeOffset + (Math.random() - 0.5) * 0.04,
      0.34 + (Math.random() - 0.5) * 0.03,
      2.38 + Math.random() * 0.06,
      (Math.random() - 0.5) * 1.4,
      0.25 + Math.random() * 0.75,
      worldSpeed * 0.06 + 2.6 + Math.random() * 1.6,
      0.075 + Math.random() * 0.045,
      0.038 + Math.random() * 0.025,
      color,
      -1.8,
      0.9,
    );
  }
}
