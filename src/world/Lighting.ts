import * as THREE from 'three';

export class Lighting {
  public readonly group = new THREE.Group();

  private readonly hemi: THREE.HemisphereLight;
  private readonly sunsetKey: THREE.DirectionalLight;
  private readonly skyFill: THREE.DirectionalLight;

  private readonly baseHemiSky = new THREE.Color(0xffe1b8);
  private readonly expressHemiSky = new THREE.Color(0xf9b4c4);
  private readonly baseHemiGround = new THREE.Color(0x8578a8);
  private readonly expressHemiGround = new THREE.Color(0x5b4b8a);

  private readonly baseSunColor = new THREE.Color(0xffd49e);
  private readonly expressSunColor = new THREE.Color(0xffa96b);
  private readonly baseFillColor = new THREE.Color(0xa5b4fc);
  private readonly expressFillColor = new THREE.Color(0x818cf8);

  constructor(isSoftwareGl: boolean) {
    // Bright golden-peach sky light & soft periwinkle-lavender bounce (eliminates dark doom shadows)
    this.hemi = new THREE.HemisphereLight(0xffe1b8, 0x8578a8, 1.25);
    this.group.add(this.hemi);

    // Warm golden-hour sun angled from front-right horizon (matching reference sunset art)
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

    // Cool pastel lavender-blue sky fill on opposite side for realistic sunlit vs shaded building faces
    this.skyFill = new THREE.DirectionalLight(0xa5b4fc, 0.72);
    this.skyFill.position.set(-24, 15, -10);
    this.group.add(this.skyFill);
  }

  public setZoneBlend(blend: number): void {
    this.hemi.color.copy(this.baseHemiSky).lerp(this.expressHemiSky, blend);
    this.hemi.groundColor.copy(this.baseHemiGround).lerp(this.expressHemiGround, blend);
    this.sunsetKey.color.copy(this.baseSunColor).lerp(this.expressSunColor, blend);
    this.sunsetKey.intensity = 2.35 + blend * 0.25;
    this.skyFill.color.copy(this.baseFillColor).lerp(this.expressFillColor, blend);
    this.skyFill.intensity = 0.72 + blend * 0.22;
  }
}
