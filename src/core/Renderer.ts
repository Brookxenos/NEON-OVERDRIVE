import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GraphicsQuality } from '../settings/GameSettings';

export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class Renderer {
  public readonly instance: THREE.WebGLRenderer;
  public readonly isSoftwareGl: boolean;

  private readonly container: HTMLElement;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private contextLost = false;
  private bloomEnabled = true;

  private readonly onContextLostCallback: () => void;
  private readonly onContextRestoredCallback: () => void;

  constructor(
    container: HTMLElement,
    quality: GraphicsQuality,
    onContextLost: () => void,
    onContextRestored: () => void,
  ) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.bloomEnabled = quality === 'high';
    this.onContextLostCallback = onContextLost;
    this.onContextRestoredCallback = onContextRestored;

    this.instance = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.0;
    this.instance.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5),
    );
    this.instance.shadowMap.enabled = !this.isSoftwareGl;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);
    this.instance.setSize(width, height);
    this.instance.domElement.style.display = 'block';
    this.instance.domElement.style.width = '100%';
    this.instance.domElement.style.height = '100%';
    container.appendChild(this.instance.domElement);

    this.instance.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.instance.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public initPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.isSoftwareGl) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);

    this.composer = new EffectComposer(this.instance);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(160, Math.floor(width * 0.5)), Math.max(120, Math.floor(height * 0.5))),
      0.16,
      0.22,
      1.04,
    );
    this.bloomPass.enabled = this.bloomEnabled;
    this.composer.addPass(this.bloomPass);
    this.instance.compile(scene, camera);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.bloomEnabled = quality === 'high';
    if (this.bloomPass) {
      this.bloomPass.enabled = this.bloomEnabled;
    }
  }

  public resize(width: number, height: number): void {
    this.instance.setSize(width, height);
    if (this.composer && this.bloomPass) {
      this.composer.setSize(width, height);
      this.bloomPass.resolution.set(
        Math.max(160, Math.floor(width * 0.5)),
        Math.max(120, Math.floor(height * 0.5)),
      );
    }
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.contextLost) return;
    if (this.isSoftwareGl || !this.composer || !this.bloomPass?.enabled) {
      this.instance.render(scene, camera);
    } else {
      this.composer.render();
    }
  }

  public getMaxAnisotropy(): number {
    return this.instance.capabilities.getMaxAnisotropy();
  }

  public getGlContext(): WebGL2RenderingContext {
    return this.instance.getContext() as WebGL2RenderingContext;
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.onContextLostCallback();
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    this.onContextRestoredCallback();
  };

  public dispose(): void {
    this.instance.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.instance.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.composer?.dispose();
    this.instance.dispose();
    if (this.instance.domElement.parentNode === this.container) {
      this.container.removeChild(this.instance.domElement);
    }
  }
}
