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
  private boostEnvelope = 0;
  private backfireTimer = 0;
  private backfireDuration = 0.18;
  private backfireStrength = 0;

  constructor(textures: TextureBundle) {
    this.model = new PlayerCar(textures, this.currentSpec);
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

  public triggerBackfire(strength = 0.95, duration = 0.17): void {
    if (this.physics.isCrashed()) return;
    this.backfireStrength = Math.max(this.backfireStrength, strength);
    this.backfireDuration = duration;
    this.backfireTimer = duration;
  }

  public shiftLane(direction: -1 | 1): boolean {
    const shifted = this.physics.shiftLane(direction);
    if (shifted && this.throttling) {
      this.triggerBackfire(0.85, 0.14);
    }
    return shifted;
  }

  public getX(): number {
    return this.physics.getCurrentX();
  }

  public triggerCrash(crashX?: number): void {
    this.physics.triggerCrash(crashX);
    this.boostEnvelope = 0;
    this.backfireTimer = 0;
    this.backfireStrength = 0;
    if (crashX !== undefined) {
      this.model.group.position.x = crashX;
    }
  }

  public reset(): void {
    this.throttling = false;
    this.wasBoosting = false;
    this.wasThrottling = false;
    this.boostEnvelope = 0;
    this.backfireTimer = 0;
    this.backfireStrength = 0;
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
      0,
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

    if (!pose.isCrashed && !isAttractMode) {
      if (isBoosting && !this.wasBoosting) {
        this.triggerBackfire(1.18, 0.2);
      } else if (this.throttling && !this.wasThrottling) {
        this.triggerBackfire(0.92, 0.16);
      }
    }
    this.wasBoosting = isBoosting;
    this.wasThrottling = this.throttling;

    const targetBoost = isBoosting && !pose.isCrashed ? 1 : 0;
    const boostRate = targetBoost > this.boostEnvelope ? 18 : 11;
    const boostStep = 1 - Math.exp(-boostRate * dt);
    this.boostEnvelope += (targetBoost - this.boostEnvelope) * boostStep;
    if (this.boostEnvelope < 0.005 && targetBoost === 0) {
      this.boostEnvelope = 0;
    }

    let backfirePop = 0;
    if (this.backfireTimer > 0 && !pose.isCrashed) {
      this.backfireTimer = Math.max(0, this.backfireTimer - dt);
      const progress = 1 - this.backfireTimer / Math.max(0.01, this.backfireDuration);
      const rise = Math.min(1, progress / 0.18);
      const decay = Math.pow(Math.max(0, 1 - progress), 1.45);
      backfirePop = rise * decay * this.backfireStrength;
      if (this.backfireTimer === 0) {
        this.backfireStrength = 0;
      }
    }

    const flameIntensity = pose.isCrashed
      ? 0
      : Math.max(this.boostEnvelope, backfirePop);

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
      flameIntensity,
    );

    this.effects.update(
      dt,
      worldSpeed,
      pose.x,
      flameIntensity,
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
