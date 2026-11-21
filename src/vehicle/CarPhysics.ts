import { LaneSystem, LaneIndex } from '../track/LaneSystem';
import { clamp, damp } from '../utils/MathUtils';

export interface CarKinematics {
  x: number;
  suspensionOffset: number;
  roll: number;
  pitch: number;
  yaw: number;
  steerAngle: number;
  wheelAngle: number;
  phase: number;
  isCrashed: boolean;
}

export class CarPhysics {
  private targetLane: LaneIndex = 1;
  private x = LaneSystem.getLaneX(1);
  private roll = 0;
  private pitch = 0;
  private yaw = 0;
  private steerAngle = 0;
  private wheelAngle = 0;
  private suspensionOffset = 0;
  private phase = 0;
  private crashTimer = 0;
  private crashed = false;

  public reset(): void {
    this.targetLane = 1;
    this.x = LaneSystem.getLaneX(1);
    this.roll = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.steerAngle = 0;
    this.wheelAngle = 0;
    this.suspensionOffset = 0;
    this.phase = 0;
    this.crashTimer = 0;
    this.crashed = false;
  }

  public shiftLane(direction: -1 | 1): boolean {
    if (this.crashed) return false;
    const next = LaneSystem.clampLane(this.targetLane + direction);
    if (next === this.targetLane) return false;
    this.targetLane = next;
    return true;
  }

  public getCurrentX(): number {
    return this.x;
  }

  public isCrashed(): boolean {
    return this.crashed;
  }

  public triggerCrash(): void {
    this.crashed = true;
    this.crashTimer = 0;
  }

  public step(
    dt: number,
    worldSpeed: number,
    wheelRadius: number,
    isBoosting: boolean,
    isThrottling: boolean,
    isBraking: boolean,
    isAttractMode: boolean,
  ): CarKinematics {
    if (this.crashed) {
      this.crashTimer += dt;
      const decay = Math.exp(-this.crashTimer * 3.2);
      this.yaw += dt * 7.2 * decay;
      this.roll = Math.sin(this.crashTimer * 18) * 0.24 * decay;
      this.suspensionOffset = Math.abs(Math.sin(this.crashTimer * 10)) * 0.32 * decay;
      return {
        x: this.x,
        suspensionOffset: this.suspensionOffset,
        roll: this.roll,
        pitch: this.pitch,
        yaw: this.yaw,
        steerAngle: 0,
        wheelAngle: this.wheelAngle,
        phase: this.phase,
        isCrashed: true,
      };
    }

    const safeRadius = Math.max(0.25, wheelRadius);
    this.wheelAngle = (this.wheelAngle - (worldSpeed / safeRadius) * dt) % (Math.PI * 200);

    let lateralVelocity = 0;
    if (isAttractMode) {
      this.phase = (this.phase + dt * 2.1) % (Math.PI * 200);
      const driftX = Math.sin(this.phase * 0.52) * 1.35;
      const prevX = this.x;
      this.x = damp(this.x, driftX, 4, dt);
      lateralVelocity = (this.x - prevX) / Math.max(dt, 0.001);
      this.roll = damp(this.roll, clamp(-lateralVelocity * 0.015, -0.1, 0.1), 6, dt);
    } else {
      const targetX = LaneSystem.getLaneX(this.targetLane);
      const prevX = this.x;
      const steerDamping = 15.5 + clamp((worldSpeed - 36) / 150, 0, 1) * 3.0;
      this.x = damp(this.x, targetX, steerDamping, dt);
      lateralVelocity = (this.x - prevX) / Math.max(dt, 0.001);
      const targetRoll = clamp(-lateralVelocity * 0.011, -0.16, 0.16);
      this.roll = damp(this.roll, targetRoll, 13, dt);
      this.phase = (this.phase + dt * (isBoosting ? 9.5 : 5.5)) % (Math.PI * 200);
    }

    // Squat rear on boost/throttle, dive nose on brake
    const targetPitch = isBoosting ? 0.036 : isThrottling ? 0.02 : isBraking ? -0.04 : 0;
    this.pitch = damp(this.pitch, targetPitch, 10, dt);
    this.yaw = -this.roll * 0.45;
    this.steerAngle = damp(
      this.steerAngle,
      clamp(-lateralVelocity * 0.032, -0.34, 0.34),
      15,
      dt,
    );

    // Crisp subtle road-surface suspension ripple (keeps tires grounded while body breathes)
    this.suspensionOffset =
      Math.sin(this.phase * 2.1) * (isBoosting ? 0.014 : 0.008);

    return {
      x: this.x,
      suspensionOffset: this.suspensionOffset,
      roll: this.roll,
      pitch: this.pitch,
      yaw: this.yaw,
      steerAngle: this.steerAngle,
      wheelAngle: this.wheelAngle,
      phase: this.phase,
      isCrashed: false,
    };
  }
}
