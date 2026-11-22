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
  private braking = false;

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

  public setBrake(active: boolean): void {
    this.braking = active;
  }

  public isThrottling(): boolean {
    return this.throttling;
  }

  public isBraking(): boolean {
    return this.braking;
  }

  public shiftLane(direction: -1 | 1): boolean {
    return this.physics.shiftLane(direction);
  }

  public getX(): number {
    return this.physics.getCurrentX();
  }

  public triggerCrash(crashX?: number): void {
    this.physics.triggerCrash(crashX);
    if (crashX !== undefined) {
      this.model.group.position.x = crashX;
    }
  }

  public reset(): void {
    this.throttling = false;
    this.braking = false;
    this.physics.reset();
    this.effects.reset();
    const pose = this.physics.step(
      0,
      0,
      this.currentSpec.wheelRadius,
      false,
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
      false,
      pose.phase,
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
      this.braking,
      isAttractMode,
    );

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
      this.braking,
      pose.isCrashed,
      pose.phase,
    );

    this.effects.update(
      dt,
      worldSpeed,
      pose.x,
      isBoosting,
      pose.isCrashed,
      this.currentSpec.flameInnerColor,
      particles,
    );
  }

  public dispose(): void {
    this.model.dispose();
  }
}
