import * as THREE from 'three';
import { TextureBundle } from '../utils/TextureFactory';

export class Environment {
  public readonly group = new THREE.Group();

  private readonly shimmerPlane: THREE.Mesh;
  private readonly shimmerMat: THREE.MeshBasicMaterial;
  private readonly baseShimmerColor = new THREE.Color(0xf7b99b);
  private readonly expressShimmerColor = new THREE.Color(0xf472b6);
  private readonly apexShimmerColor = new THREE.Color(0x38bdf8);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private shimmerOffset = 0;

  constructor(textures: TextureBundle) {
    const skyGeo = new THREE.SphereGeometry(520, 28, 18);
    const skyMat = new THREE.MeshBasicMaterial({
      map: textures.skyBackdrop,
      side: THREE.BackSide,
      fog: false,
    });
    this.geometries.push(skyGeo);
    this.materials.push(skyMat);
    this.group.add(new THREE.Mesh(skyGeo, skyMat));

    const groundGeo = new THREE.PlaneGeometry(860, 960, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x76677f,
      roughness: 0.88,
      metalness: 0.04,
      envMapIntensity: 0.15,
    });
    this.geometries.push(groundGeo);
    this.materials.push(groundMat);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -1.2, 0);
    this.group.add(ground);

    const shimmerGeo = new THREE.PlaneGeometry(520, 920, 1, 1);
    shimmerGeo.rotateX(-Math.PI / 2);
    this.shimmerMat = new THREE.MeshBasicMaterial({
      color: 0xf7b99b,
      transparent: true,
      opacity: 0.12,
    });
    this.geometries.push(shimmerGeo);
    this.materials.push(this.shimmerMat);

    this.shimmerPlane = new THREE.Mesh(shimmerGeo, this.shimmerMat);
    this.shimmerPlane.position.set(0, -1.15, 0);
    this.group.add(this.shimmerPlane);

    this.buildDistantSkyline(textures);
  }

  private buildDistantSkyline(textures: TextureBundle): void {
    const silhouetteGeo = new THREE.BoxGeometry(1, 1, 1);
    const towerSunMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsCyan,
      color: 0xf3d4be,
      roughness: 0.72,
      metalness: 0.12,
      envMapIntensity: 0.2,
    });
    const towerLavenderMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsMagenta,
      color: 0xdcc8e8,
      roughness: 0.74,
      metalness: 0.12,
      envMapIntensity: 0.2,
    });
    const penthouseMat = new THREE.MeshStandardMaterial({
      color: 0xfde2c4,
      roughness: 0.65,
    });

    this.geometries.push(silhouetteGeo);
    this.materials.push(towerSunMat, towerLavenderMat, penthouseMat);

    const addTower = (xPos: number, zPos: number, w: number, h: number, d: number, isEven: boolean) => {
      const tower = new THREE.Mesh(
        silhouetteGeo,
        isEven ? towerSunMat : towerLavenderMat,
      );
      tower.scale.set(w, h, d);
      tower.position.set(xPos, h * 0.5 - 2, zPos);
      this.group.add(tower);

      const crown = new THREE.Mesh(silhouetteGeo, penthouseMat);
      crown.scale.set(w * 0.68, 2.4, d * 0.68);
      crown.position.set(xPos, h - 2 + 1.2, zPos);
      this.group.add(crown);
    };

    for (let i = -15; i <= 15; i++) {
      if (Math.abs(i) < 2) continue;
      const h = 24 + Math.abs(Math.sin(i * 1.47)) * 62;
      const w = 13 + (Math.abs(i * 3) % 11);
      const d = 14 + (Math.abs(i * 5) % 8);
      const xPos = i * 19;

      const zPosFront = -360 - (Math.abs(i) % 3) * 28;
      addTower(xPos, zPosFront, w, h, d, Math.abs(i) % 2 === 0);

      const zPosRear = 360 + ((Math.abs(i) + 1) % 3) * 28;
      const hRear = 24 + Math.abs(Math.sin((i + 3) * 1.47)) * 62;
      addTower(xPos, zPosRear, w, hRear, d, (Math.abs(i) + 1) % 2 === 0);
    }
  }

  public update(
    dt: number,
    worldSpeed: number,
    isBoosting: boolean,
    zoneBlend = 0,
    deepBlend = 0,
  ): void {
    this.shimmerOffset = (this.shimmerOffset + dt * worldSpeed * 0.4) % 21.8;
    this.shimmerPlane.position.z = this.shimmerOffset;
    this.shimmerMat.color
      .copy(this.baseShimmerColor)
      .lerp(this.expressShimmerColor, zoneBlend)
      .lerp(this.apexShimmerColor, deepBlend);
    this.shimmerMat.opacity = (isBoosting ? 0.16 : 0.1) + zoneBlend * 0.05 + deepBlend * 0.04;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
