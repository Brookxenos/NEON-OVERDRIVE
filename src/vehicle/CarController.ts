import { ParticleSystem } from '../effects/ParticleSystem';
import { TextureBundle } from '../utils/TextureFactory';
import { CAR_CATALOG, CarSpec } from './CarCatalog';
import { CarEffects } from './CarEffects';
import { CarPhysics } from './CarPhysics';
import { PlayerCar } from './PlayerCar';

export class CarController {
  public readonly model: PlayerCar;
  public readonly physics = new CarPhysics();
  public readonly effects = new CarEffects();

  private currentSpec: CarSpec = CAR_CATALOG[0];
  private throttling = false;
  private wasBoosting = false;
  private wasThrottling = false;
  private lastGearBand = 0;
  private upshiftCooldown = 0;
  private boostEnvelope = 0;
  private readonly pipePopTimers = [0, 0, 0, 0];
  private readonly pipePopDurations = [0.14, 0.14, 0.14, 0.14];
  private readonly pipePopStrengths = [0, 0, 0, 0];
  private readonly pipePopDelays = [0, 0, 0, 0];
  private readonly pipeFlameLevels = [0, 0, 0, 0];
  private onBackfirePop: ((strength: number) => void) | null = null;

  constructor(textures: TextureBundle, onBackfirePop?: (strength: number) => void) {
    this.model = new PlayerCar(textures, this.currentSpec);
    this.onBackfirePop = onBackfirePop ?? null;
  }

  public setCarSpec(spec: CarSpec): void {
    this.currentSpec = spec;
    this.model.applyCarSpec(spec);
  }

  public getCarSpec(): CarSpec {
    return this.currentSpec;
  }

  public setThrottle(active: boolean): void {
    this.throttling = active;
  }

  public isThrottling(): boolean {
    return this.throttling;
  }

  public triggerBackfire(
    strength = 0.95,
    duration = 0.15,
    staggered = true,
  ): void {
    if (this.physics.isCrashed()) return;
    const bankOrder = Math.random() > 0.5 ? [0, 1, 2, 3] : [2, 3, 0, 1];
    for (let k = 0; k < 4; k++) {
      const idx = bankOrder[k];
      const delay = staggered ? Math.floor(k / 2) * 0.032 + (k % 2) * 0.012 : 0;
      const pipeScale = staggered ? 0.86 + Math.random() * 0.24 : 1;
      this.pipePopDelays[idx] = delay;
      this.pipePopDurations[idx] = duration * (0.9 + Math.random() * 0.2);
      this.pipePopTimers[idx] = this.pipePopDurations[idx];
      this.pipePopStrengths[idx] = Math.max(this.pipePopStrengths[idx], strength * pipeScale);
    }
    this.onBackfirePop?.(strength);
  }

  public shiftLane(direction: -1 | 1): boolean {
    const shifted = this.physics.shiftLane(direction);
    if (shifted && this.throttling) {
      this.triggerBackfire(0.76, 0.12, true);
    }
    return shifted;
  }

  public getX(): number {
    return this.physics.getCurrentX();
  }

  public triggerCrash(crashX?: number): void {
    this.physics.triggerCrash(crashX);
    this.boostEnvelope = 0;
    for (let i = 0; i < 4; i++) {
      this.pipePopTimers[i] = 0;
      this.pipePopDelays[i] = 0;
      this.pipePopStrengths[i] = 0;
      this.pipeFlameLevels[i] = 0;
    }
    if (crashX !== undefined) {
      this.model.group.position.x = crashX;
    }
  }

  public reset(): void {
    this.throttling = false;
    this.wasBoosting = false;
    this.wasThrottling = false;
    this.lastGearBand = 0;
    this.upshiftCooldown = 0;
    this.boostEnvelope = 0;
    for (let i = 0; i < 4; i++) {
      this.pipePopTimers[i] = 0;
      this.pipePopDelays[i] = 0;
      this.pipePopStrengths[i] = 0;
      this.pipeFlameLevels[i] = 0;
    }
    this.physics.reset();
    this.effects.reset();
    const pose = this.physics.step(
      0,
      0,
      this.currentSpec.wheelRadius,
      false,
      false,
      false,
    );
    this.model.applyPose(
      pose.x,
      pose.suspensionOffset,
      pose.roll,
      pose.pitch,
      pose.yaw,
      pose.steerAngle,
      pose.wheelAngle,
      false,
      false,
      false,
      pose.phase,
      this.pipeFlameLevels,
    );
  }

  public update(
    dt: number,
    worldSpeed: number,
    isBoosting: boolean,
    isAttractMode: boolean,
    particles: ParticleSystem,
  ): void {
    const pose = this.physics.step(
      dt,
      worldSpeed,
      this.currentSpec.wheelRadius,
      isBoosting,
      this.throttling,
      isAttractMode,
    );

    if (this.upshiftCooldown > 0) {
      this.upshiftCooldown = Math.max(0, this.upshiftCooldown - dt);
    }

    const gearBand = Math.max(0, Math.floor((worldSpeed - 24) / 14));
    if (!pose.isCrashed && !isAttractMode) {
      if (isBoosting && !this.wasBoosting) {
        this.triggerBackfire(1.15, 0.2, false);
      } else if (this.throttling && !this.wasThrottling) {
        this.triggerBackfire(0.95, 0.15, true);
      } else if (!this.throttling && this.wasThrottling && worldSpeed > 44) {
        this.triggerBackfire(0.84, 0.13, true);
      } else if (this.throttling && gearBand > this.lastGearBand && this.upshiftCooldown <= 0) {
        this.upshiftCooldown = 0.42;
        this.triggerBackfire(0.9, 0.14, true);
      }
    }
    this.lastGearBand = gearBand;
    this.wasBoosting = isBoosting;
    this.wasThrottling = this.throttling;

    const targetBoost = isBoosting && !pose.isCrashed ? 0.74 : 0;
    const boostRate = targetBoost > this.boostEnvelope ? 20 : 12;
    const boostStep = 1 - Math.exp(-boostRate * dt);
    this.boostEnvelope += (targetBoost - this.boostEnvelope) * boostStep;
    if (this.boostEnvelope < 0.005 && targetBoost === 0) {
      this.boostEnvelope = 0;
    }

    let maxFlame = pose.isCrashed ? 0 : this.boostEnvelope;
    for (let i = 0; i < 4; i++) {
      let pop = 0;
      if (!pose.isCrashed && this.pipePopTimers[i] > 0) {
        if (this.pipePopDelays[i] > 0) {
          this.pipePopDelays[i] = Math.max(0, this.pipePopDelays[i] - dt);
        } else {
          this.pipePopTimers[i] = Math.max(0, this.pipePopTimers[i] - dt);
          const dur = Math.max(0.01, this.pipePopDurations[i]);
          const progress = 1 - this.pipePopTimers[i] / dur;
          const attack = Math.min(1, progress / 0.16);
          const decay = Math.pow(Math.max(0, 1 - progress), 1.5);
          pop = attack * decay * this.pipePopStrengths[i];
          if (this.pipePopTimers[i] === 0) {
            this.pipePopStrengths[i] = 0;
          }
        }
      }
      const level = pose.isCrashed ? 0 : Math.max(this.boostEnvelope, pop);
      this.pipeFlameLevels[i] = level;
      if (level > maxFlame) maxFlame = level;
    }

    this.model.applyPose(
      pose.x,
      pose.suspensionOffset,
      pose.roll,
      pose.pitch,
      pose.yaw,
      pose.steerAngle,
      pose.wheelAngle,
      isBoosting,
      this.throttling,
      pose.isCrashed,
      pose.phase,
      this.pipeFlameLevels,
    );

    this.effects.update(
      dt,
      worldSpeed,
      pose.x,
      maxFlame,
      pose.isCrashed,
      this.currentSpec.flameInnerColor,
      this.currentSpec.flameOuterColor,
      particles,
    );
  }

  public dispose(): void {
    this.model.dispose();
  }
}
