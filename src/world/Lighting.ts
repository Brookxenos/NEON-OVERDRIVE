import * as THREE from 'three';

export class Lighting {
  public readonly group = new THREE.Group();

  private readonly hemi: THREE.HemisphereLight;
  private readonly sunsetKey: THREE.DirectionalLight;
  private readonly skyFill: THREE.DirectionalLight;

  private readonly baseHemiSky = new THREE.Color(0xffe1b8);
  private readonly expressHemiSky = new THREE.Color(0xf9b4c4);
  private readonly apexHemiSky = new THREE.Color(0xfde68a);
  private readonly baseHemiGround = new THREE.Color(0x8578a8);
  private readonly expressHemiGround = new THREE.Color(0x5b4b8a);
  private readonly apexHemiGround = new THREE.Color(0x3b1d5e);

  private readonly baseSunColor = new THREE.Color(0xffd49e);
  private readonly expressSunColor = new THREE.Color(0xffa96b);
  private readonly apexSunColor = new THREE.Color(0xfb7185);
  private readonly baseFillColor = new THREE.Color(0xa5b4fc);
  private readonly expressFillColor = new THREE.Color(0x818cf8);
  private readonly apexFillColor = new THREE.Color(0x38bdf8);

  constructor(isSoftwareGl: boolean) {
    this.hemi = new THREE.HemisphereLight(0xffe1b8, 0x8578a8, 1.25);
    this.group.add(this.hemi);

    this.sunsetKey = new THREE.DirectionalLight(0xffd49e, 2.35);
    this.sunsetKey.position.set(28, 16, -24);
    this.sunsetKey.castShadow = !isSoftwareGl;
    this.sunsetKey.shadow.mapSize.set(1024, 1024);
    this.sunsetKey.shadow.camera.near = 2;
    this.sunsetKey.shadow.camera.far = 75;
    this.sunsetKey.shadow.camera.left = -18;
    this.sunsetKey.shadow.camera.right = 18;
    this.sunsetKey.shadow.camera.top = 18;
    this.sunsetKey.shadow.camera.bottom = -18;
    this.sunsetKey.shadow.bias = -0.0005;
    this.sunsetKey.shadow.normalBias = 0.02;
    this.group.add(this.sunsetKey);

    this.skyFill = new THREE.DirectionalLight(0xa5b4fc, 0.72);
    this.skyFill.position.set(-24, 15, -10);
    this.group.add(this.skyFill);
  }

  public setZoneBlend(expressBlend: number, deepBlend = 0): void {
    this.hemi.color
      .copy(this.baseHemiSky)
      .lerp(this.expressHemiSky, expressBlend)
      .lerp(this.apexHemiSky, deepBlend);
    this.hemi.groundColor
      .copy(this.baseHemiGround)
      .lerp(this.expressHemiGround, expressBlend)
      .lerp(this.apexHemiGround, deepBlend);
    this.sunsetKey.color
      .copy(this.baseSunColor)
      .lerp(this.expressSunColor, expressBlend)
      .lerp(this.apexSunColor, deepBlend);
    this.sunsetKey.intensity = 2.35 + expressBlend * 0.22 + deepBlend * 0.18;
    this.skyFill.color
      .copy(this.baseFillColor)
      .lerp(this.expressFillColor, expressBlend)
      .lerp(this.apexFillColor, deepBlend);
    this.skyFill.intensity = 0.72 + expressBlend * 0.2 + deepBlend * 0.18;
  }
}
