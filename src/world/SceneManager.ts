import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS } from '../utils/Constants';
import { TextureBundle } from '../utils/TextureFactory';
import { CameraController } from './CameraController';
import { Environment } from './Environment';
import { Lighting } from './Lighting';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly lighting: Lighting;
  public readonly environment: Environment;
  public readonly cameraController: CameraController;

  constructor(
    renderer: THREE.WebGLRenderer,
    textures: TextureBundle,
    isSoftwareGl: boolean,
    aspect: number,
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bgVoid);
    this.scene.fog = new THREE.FogExp2(COLORS.fogNight, 0.0026);

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

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    this.environment.update(dt, worldSpeed, isBoosting);
  }

  public dispose(): void {
    this.environment.dispose();
  }
}
