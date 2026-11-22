import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS } from '../utils/Constants';
import { clamp, damp } from '../utils/MathUtils';
import { TextureBundle } from '../utils/TextureFactory';
import { CameraController } from './CameraController';
import { Environment } from './Environment';
import { Lighting } from './Lighting';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly lighting: Lighting;
  public readonly environment: Environment;
  public readonly cameraController: CameraController;

  private readonly baseBgColor = new THREE.Color(COLORS.bgVoid);
  private readonly expressBgColor = new THREE.Color(0xd86f8c);
  private readonly baseFogColor = new THREE.Color(COLORS.fogNight);
  private readonly expressFogColor = new THREE.Color(0xa864a8);
  private readonly fog: THREE.FogExp2;
  private zoneBlend = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    textures: TextureBundle,
    isSoftwareGl: boolean,
    aspect: number,
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = this.baseBgColor.clone();
    this.fog = new THREE.FogExp2(COLORS.fogNight, 0.00145);
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
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.baseBgColor);
    }
    this.fog.color.copy(this.baseFogColor);
    this.lighting.setZoneBlend(0);
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean, distance = 0): void {
    const targetBlend = clamp((distance - 2500) / 800, 0, 1);
    this.zoneBlend = damp(this.zoneBlend, targetBlend, 1.8, dt);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.baseBgColor).lerp(this.expressBgColor, this.zoneBlend);
    }
    this.fog.color.copy(this.baseFogColor).lerp(this.expressFogColor, this.zoneBlend);
    this.lighting.setZoneBlend(this.zoneBlend);
    this.environment.update(dt, worldSpeed, isBoosting, this.zoneBlend);
  }

  public dispose(): void {
    this.environment.dispose();
  }
}
