import * as THREE from 'three';
import { TextureBundle } from '../utils/TextureFactory';

export class Environment {
  public readonly group = new THREE.Group();

  private readonly shimmerPlane: THREE.Mesh;
  private readonly shimmerMat: THREE.MeshBasicMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private elapsed = 0;

  constructor(textures: TextureBundle) {
    // Sunset Vice City sky dome
    const skyGeo = new THREE.SphereGeometry(440, 28, 18);
    const skyMat = new THREE.MeshBasicMaterial({
      map: textures.skyBackdrop,
      side: THREE.BackSide,
      fog: false,
    });
    this.geometries.push(skyGeo);
    this.materials.push(skyMat);
    this.group.add(new THREE.Mesh(skyGeo, skyMat));

    // Coastal ground & twilight bay horizon plane beneath the boulevard
    const groundGeo = new THREE.PlaneGeometry(680, 560, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x191128,
      roughness: 0.72,
      metalness: 0.18,
      envMapIntensity: 0.25,
    });
    this.geometries.push(groundGeo);
    this.materials.push(groundMat);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -14, -200);
    this.group.add(ground);

    // Subtle sunset water/boulevard grid shimmer strip
    const shimmerGeo = new THREE.PlaneGeometry(420, 480, 18, 22);
    shimmerGeo.rotateX(-Math.PI / 2);
    this.shimmerMat = new THREE.MeshBasicMaterial({
      color: 0x9d4edd,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    this.geometries.push(shimmerGeo);
    this.materials.push(this.shimmerMat);

    this.shimmerPlane = new THREE.Mesh(shimmerGeo, this.shimmerMat);
    this.shimmerPlane.position.set(0, -13.8, -190);
    this.group.add(this.shimmerPlane);

    this.buildDistantSkyline();
  }

  private buildDistantSkyline(): void {
    const silhouetteGeo = new THREE.BoxGeometry(1, 1, 1);
    const spireMat = new THREE.MeshBasicMaterial({ color: 0x2a183b });
    const horizonRimMat = new THREE.MeshBasicMaterial({
      color: 0xf59e56,
      transparent: true,
      opacity: 0.28,
    });

    this.geometries.push(silhouetteGeo);
    this.materials.push(spireMat, horizonRimMat);

    for (let i = -14; i <= 14; i++) {
      if (Math.abs(i) < 2) continue;
      const h = 30 + Math.abs(Math.sin(i * 1.47)) * 68;
      const w = 14 + (Math.abs(i * 3) % 12);

      const tower = new THREE.Mesh(silhouetteGeo, spireMat);
      tower.scale.set(w, h, 14);
      tower.position.set(i * 19, h * 0.5 - 22, -355 - (Math.abs(i) % 3) * 24);
      this.group.add(tower);

      const crown = new THREE.Mesh(silhouetteGeo, horizonRimMat);
      crown.scale.set(w * 0.85, 0.7, 14.2);
      crown.position.set(tower.position.x, h - 22 - 1.2, tower.position.z);
      this.group.add(crown);
    }
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    this.elapsed += dt;
    this.shimmerPlane.position.z = -190 + ((this.elapsed * worldSpeed * 0.4) % 21.8);
    this.shimmerMat.opacity = isBoosting ? 0.1 : 0.05;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
