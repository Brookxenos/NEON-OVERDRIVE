import * as THREE from 'three';
import { DayNightSample } from './DayNightCycle';

export class Lighting {
  public readonly group = new THREE.Group();

  private readonly hemi: THREE.HemisphereLight;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly skyFill: THREE.DirectionalLight;

  private readonly expressHemiSky = new THREE.Color(0xf9b4c4);
  private readonly apexHemiSky = new THREE.Color(0xfde68a);
  private readonly expressHemiGround = new THREE.Color(0x5b4b8a);
  private readonly apexHemiGround = new THREE.Color(0x3b1d5e);

  private readonly expressKeyColor = new THREE.Color(0xffa96b);
  private readonly apexKeyColor = new THREE.Color(0xfb7185);
  private readonly expressFillColor = new THREE.Color(0x818cf8);
  private readonly apexFillColor = new THREE.Color(0x38bdf8);

  constructor(isSoftwareGl: boolean) {
    this.hemi = new THREE.HemisphereLight(0xffe1b8, 0x8578a8, 1.25);
    this.group.add(this.hemi);

    this.keyLight = new THREE.DirectionalLight(0xffd49e, 2.35);
    this.keyLight.position.set(28, 16, -24);
    this.keyLight.castShadow = !isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 75;
    this.keyLight.shadow.camera.left = -18;
    this.keyLight.shadow.camera.right = 18;
    this.keyLight.shadow.camera.top = 18;
    this.keyLight.shadow.camera.bottom = -18;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.group.add(this.keyLight);

    this.skyFill = new THREE.DirectionalLight(0xa5b4fc, 0.72);
    this.skyFill.position.set(-24, 15, -10);
    this.group.add(this.skyFill);
  }

  public updateAtmosphere(
    dayNight: DayNightSample,
    expressBlend: number,
    deepBlend = 0,
  ): void {
    const zoneScale = 0.25 * (1 - dayNight.nightAmount * 0.5);

    this.hemi.color
      .copy(dayNight.hemiSky)
      .lerp(this.expressHemiSky, expressBlend * zoneScale)
      .lerp(this.apexHemiSky, deepBlend * zoneScale);
    this.hemi.groundColor
      .copy(dayNight.hemiGround)
      .lerp(this.expressHemiGround, expressBlend * zoneScale)
      .lerp(this.apexHemiGround, deepBlend * zoneScale);
    this.hemi.intensity =
      dayNight.hemiIntensity +
      expressBlend * 0.05 * zoneScale +
      deepBlend * 0.04 * zoneScale;

    this.keyLight.color
      .copy(dayNight.keyColor)
      .lerp(this.expressKeyColor, expressBlend * zoneScale)
      .lerp(this.apexKeyColor, deepBlend * zoneScale);
    this.keyLight.intensity =
      dayNight.keyIntensity +
      expressBlend * 0.14 * zoneScale +
      deepBlend * 0.12 * zoneScale;
    this.keyLight.position.copy(dayNight.keyPosition);

    this.skyFill.color
      .copy(dayNight.fillColor)
      .lerp(this.expressFillColor, expressBlend * 0.35)
      .lerp(this.apexFillColor, deepBlend * 0.35);
    this.skyFill.intensity =
      dayNight.fillIntensity + expressBlend * 0.1 + deepBlend * 0.08;
  }
}
