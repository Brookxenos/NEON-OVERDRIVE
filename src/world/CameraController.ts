import * as THREE from 'three';
import { damp } from '../utils/MathUtils';

export type ShowcaseCameraMode = 'auto' | 'front' | 'side' | 'rear' | 'manual';

const FRONT_VIEW_ANGLE = Math.PI - 0.52;
const SIDE_VIEW_ANGLE = Math.PI * 0.5;
const REAR_VIEW_ANGLE = 0.52;

function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export class CameraController {
  public readonly camera: THREE.PerspectiveCamera;
  private attractAngle = 0;
  private showcaseAngle = 0.65;
  private showcaseTargetAngle = 0.65;
  private showcaseMode: ShowcaseCameraMode = 'auto';
  private shakeIntensity = 0;
  private currentAspect: number;
  private readonly lookTarget = new THREE.Vector3();
  private readonly desiredLookTarget = new THREE.Vector3();

  constructor(aspect: number) {
    this.currentAspect = Math.max(aspect, 0.35);
    this.camera = new THREE.PerspectiveCamera(this.getResponsiveFov(62), aspect, 0.1, 660);
    this.camera.position.set(-3.2, 1.7, 5.8);
  }

  private getResponsiveFov(baseFov: number): number {
    if (this.currentAspect >= 1) return baseFov;
    const portraitBoost = (1 - this.currentAspect) * 44;
    return Math.min(92, baseFov + portraitBoost);
  }

  public resize(width: number, height: number): void {
    this.currentAspect = Math.max(width / Math.max(height, 1), 0.35);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public triggerShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public setShowcaseMode(mode: ShowcaseCameraMode): void {
    this.showcaseMode = mode;
    if (mode === 'front') this.showcaseTargetAngle = FRONT_VIEW_ANGLE;
    else if (mode === 'side') this.showcaseTargetAngle = SIDE_VIEW_ANGLE;
    else if (mode === 'rear') this.showcaseTargetAngle = REAR_VIEW_ANGLE;
    else if (mode === 'manual') this.showcaseTargetAngle = this.showcaseAngle;
  }

  public orbitShowcaseBy(deltaRadians: number): void {
    if (this.showcaseMode !== 'manual') {
      this.showcaseMode = 'manual';
      this.showcaseTargetAngle = this.showcaseAngle;
    }
    this.showcaseTargetAngle =
      (this.showcaseTargetAngle + deltaRadians + Math.PI * 2) % (Math.PI * 2);
  }

  public getShowcaseMode(): ShowcaseCameraMode {
    return this.showcaseMode;
  }

  public reset(): void {
    this.shakeIntensity = 0;
  }

  public updateAttract(dt: number, playerX: number): void {
    this.attractAngle = (this.attractAngle + dt * 0.28) % (Math.PI * 2);
    const camX = Math.sin(this.attractAngle) * 3.6;
    const camY = 1.62 + Math.cos(this.attractAngle * 0.8) * 0.24;
    const camZ = 5.4 + Math.cos(this.attractAngle) * 0.85;

    this.camera.position.x = damp(this.camera.position.x, camX, 4.5, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 4.5, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 4.5, dt);

    const nextFov = damp(this.camera.fov, this.getResponsiveFov(58), 5, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.02) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.lookTarget.set(playerX * 0.45, 1.45, -32);
    this.camera.lookAt(this.lookTarget);
  }

  public updateGarageShowcase(dt: number, playerX: number, isBottomDock: boolean): void {
    if (this.showcaseMode === 'auto') {
      this.showcaseAngle = (this.showcaseAngle + dt * 0.45) % (Math.PI * 2);
      this.showcaseTargetAngle = this.showcaseAngle;
    } else {
      let delta = shortestAngleDelta(this.showcaseAngle, this.showcaseTargetAngle);
      if (Math.abs(Math.abs(delta) - Math.PI) < 0.05) {
        delta = delta >= 0 ? delta - 0.08 : delta + 0.08;
      }
      const rate = this.showcaseMode === 'manual' ? 14 : 6.5;
      const stepFactor = 1 - Math.exp(-rate * dt);
      this.showcaseAngle = (this.showcaseAngle + delta * stepFactor + Math.PI * 2) % (Math.PI * 2);
    }

    const radius = isBottomDock ? 5.35 : 4.85;
    const camX = playerX + Math.sin(this.showcaseAngle) * radius;
    const camY = isBottomDock ? 1.68 : 1.52;
    const camZ = Math.cos(this.showcaseAngle) * radius;

    const posLambda = this.showcaseMode === 'manual' ? 14 : 9;
    this.camera.position.x = damp(this.camera.position.x, camX, posLambda, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, posLambda, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, posLambda, dt);

    const nextFov = damp(this.camera.fov, this.getResponsiveFov(47), 6.5, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.005) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    const sideShift = isBottomDock ? 0 : 1.02;
    const screenRightX = Math.cos(this.showcaseAngle);
    const screenRightZ = -Math.sin(this.showcaseAngle);
    // Lower look target on mobile portrait raises the car comfortably into the upper showroom stage
    const targetY = isBottomDock ? -0.35 : 0.56;

    this.desiredLookTarget.set(
      playerX - screenRightX * sideShift,
      targetY,
      -screenRightZ * sideShift,
    );
    this.lookTarget.x = damp(this.lookTarget.x, this.desiredLookTarget.x, posLambda, dt);
    this.lookTarget.y = damp(this.lookTarget.y, this.desiredLookTarget.y, posLambda, dt);
    this.lookTarget.z = damp(this.lookTarget.z, this.desiredLookTarget.z, posLambda, dt);
    this.camera.lookAt(this.lookTarget);
  }

  public updateChase(dt: number, playerX: number, speedNorm: number, isBoosting: boolean): void {
    const targetCamX = playerX * 0.66;
    const targetCamY = isBoosting ? 2.58 : 2.88;
    const targetCamZ = isBoosting ? 6.65 : 7.15 - speedNorm * 0.35;
    const targetFov = this.getResponsiveFov(62 + speedNorm * 8 + (isBoosting ? 7 : 0));

    this.camera.position.x = damp(this.camera.position.x, targetCamX, 10, dt);
    this.camera.position.y = damp(this.camera.position.y, targetCamY, 8, dt);
    this.camera.position.z = damp(this.camera.position.z, targetCamZ, 8, dt);

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.6);
    }

    const nextFov = damp(this.camera.fov, targetFov, 7, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.02) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.lookTarget.set(playerX * 0.42, 1.25, -34);
    this.camera.lookAt(this.lookTarget);
  }
}
