import * as THREE from 'three';
import { damp } from '../utils/MathUtils';

export class CameraController {
  public readonly camera: THREE.PerspectiveCamera;
  private attractAngle = 0;
  private showcaseAngle = 0.65;
  private showcaseMode: 'auto' | 'front' | 'side' | 'rear' = 'auto';
  private shakeIntensity = 0;
  private readonly lookTarget = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 520);
    this.camera.position.set(-3.2, 1.7, 5.8);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public triggerShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public setShowcaseMode(mode: 'auto' | 'front' | 'side' | 'rear'): void {
    this.showcaseMode = mode;
    if (mode === 'front') this.showcaseAngle = -0.62;
    else if (mode === 'side') this.showcaseAngle = Math.PI * 0.5;
    else if (mode === 'rear') this.showcaseAngle = Math.PI - 0.55;
  }

  public getShowcaseMode(): 'auto' | 'front' | 'side' | 'rear' {
    return this.showcaseMode;
  }

  public reset(): void {
    this.shakeIntensity = 0;
  }

  public updateAttract(dt: number, playerX: number): void {
    this.attractAngle += dt * 0.28;
    const camX = Math.sin(this.attractAngle) * 3.6;
    const camY = 1.62 + Math.cos(this.attractAngle * 0.8) * 0.24;
    const camZ = 5.4 + Math.cos(this.attractAngle) * 0.85;

    this.camera.position.x = damp(this.camera.position.x, camX, 4.5, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 4.5, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 4.5, dt);

    const nextFov = damp(this.camera.fov, 58, 5, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.005) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.lookTarget.set(playerX * 0.45, 1.45, -32);
    this.camera.lookAt(this.lookTarget);
  }

  public updateGarageShowcase(dt: number, playerX: number, isNarrowScreen: boolean): void {
    if (this.showcaseMode === 'auto') {
      this.showcaseAngle += dt * 0.48;
    }

    const radius = isNarrowScreen ? 5.6 : 4.9;
    const camX = playerX + Math.sin(this.showcaseAngle) * radius;
    const camY = isNarrowScreen ? 1.85 : 1.55;
    const camZ = Math.cos(this.showcaseAngle) * radius;

    this.camera.position.x = damp(this.camera.position.x, camX, 7.5, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 7.5, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 7.5, dt);

    const nextFov = damp(this.camera.fov, 48, 6, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.005) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    // Offset look target slightly left on desktop so the docked left Garage panel leaves the 3D car centered in the open right view
    const offsetX = isNarrowScreen ? 0 : -1.05;
    this.lookTarget.set(playerX + offsetX, 0.58, 0);
    this.camera.lookAt(this.lookTarget);
  }

  public updateChase(dt: number, playerX: number, speedNorm: number, isBoosting: boolean): void {
    const targetCamX = playerX * 0.66;
    const targetCamY = isBoosting ? 2.58 : 2.88;
    const targetCamZ = isBoosting ? 6.65 : 7.15 - speedNorm * 0.35;
    const targetFov = 62 + speedNorm * 8 + (isBoosting ? 7 : 0);

    this.camera.position.x = damp(this.camera.position.x, targetCamX, 10, dt);
    this.camera.position.y = damp(this.camera.position.y, targetCamY, 8, dt);
    this.camera.position.z = damp(this.camera.position.z, targetCamZ, 8, dt);

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.6);
    }

    const nextFov = damp(this.camera.fov, targetFov, 7, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.005) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.lookTarget.set(playerX * 0.42, 1.25, -34);
    this.camera.lookAt(this.lookTarget);
  }
}
