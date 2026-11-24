import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS } from '../utils/Constants';
import { clamp, damp } from '../utils/MathUtils';
import { TextureBundle } from '../utils/TextureFactory';
import { CameraController } from './CameraController';
import { createDayNightSample, sampleDayNightCycle } from './DayNightCycle';
import { Environment } from './Environment';
import { Lighting } from './Lighting';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly lighting: Lighting;
  public readonly environment: Environment;
  public readonly cameraController: CameraController;

  private readonly expressBgColor = new THREE.Color(0xd86f8c);
  private readonly overclockBgColor = new THREE.Color(0x7e3af2);
  private readonly expressFogColor = new THREE.Color(0xa864a8);
  private readonly overclockFogColor = new THREE.Color(0x4c1d95);
  private readonly fog: THREE.FogExp2;
  private readonly dayNightSample = createDayNightSample();
  private zoneBlend = 0;
  private deepBlend = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    textures: TextureBundle,
    isSoftwareGl: boolean,
    aspect: number,
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.skyHorizon);
    this.fog = new THREE.FogExp2(COLORS.fogHorizon, 0.00145);
    this.scene.fog = this.fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.12;
    pmremGenerator.dispose();

    this.lighting = new Lighting(isSoftwareGl);
    this.environment = new Environment(textures);
    this.cameraController = new CameraController(aspect);

    this.scene.add(this.lighting.group);
    this.scene.add(this.environment.group);
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public resetAtmosphere(): void {
    this.zoneBlend = 0;
    this.deepBlend = 0;
    sampleDayNightCycle(0, this.dayNightSample);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.dayNightSample.bgColor);
    }
    this.fog.color.copy(this.dayNightSample.fogColor);
    this.scene.environmentIntensity = this.dayNightSample.envIntensity;
    this.lighting.updateAtmosphere(this.dayNightSample, 0, 0);
    this.environment.resetAtmosphere();
  }

  public update(
    dt: number,
    worldSpeed: number,
    isBoosting: boolean,
    distance = 0,
    raceDuration = 0,
  ): void {
    const targetBlend = clamp((distance - 2500) / 800, 0, 1);
    const targetDeep = clamp((distance - 5000) / 1400, 0, 1);
    this.zoneBlend = damp(this.zoneBlend, targetBlend, 1.8, dt);
    this.deepBlend = damp(this.deepBlend, targetDeep, 1.4, dt);

    sampleDayNightCycle(raceDuration, this.dayNightSample);
    const zoneScale = 0.22 * (1 - this.dayNightSample.nightAmount * 0.5);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background
        .copy(this.dayNightSample.bgColor)
        .lerp(this.expressBgColor, this.zoneBlend * zoneScale)
        .lerp(this.overclockBgColor, this.deepBlend * 0.72 * zoneScale);
    }
    this.fog.color
      .copy(this.dayNightSample.fogColor)
      .lerp(this.expressFogColor, this.zoneBlend * zoneScale)
      .lerp(this.overclockFogColor, this.deepBlend * 0.72 * zoneScale);
    this.scene.environmentIntensity = this.dayNightSample.envIntensity;

    this.lighting.updateAtmosphere(this.dayNightSample, this.zoneBlend, this.deepBlend);
    this.environment.update(
      dt,
      worldSpeed,
      isBoosting,
      this.zoneBlend,
      this.deepBlend,
      this.dayNightSample.skyTint,
      this.dayNightSample.shimmerColor,
    );
  }

  public dispose(): void {
    this.environment.dispose();
  }
}
