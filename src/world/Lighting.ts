import * as THREE from 'three';

export class Lighting {
  public readonly group = new THREE.Group();

  constructor(isSoftwareGl: boolean) {
    // Bright golden-peach sky light & soft periwinkle-lavender bounce (eliminates dark doom shadows)
    const hemi = new THREE.HemisphereLight(0xffe1b8, 0x8578a8, 1.25);
    this.group.add(hemi);

    // Warm golden-hour sun angled from front-right horizon (matching reference sunset art)
    const sunsetKey = new THREE.DirectionalLight(0xffd49e, 2.35);
    sunsetKey.position.set(28, 16, -24);
    sunsetKey.castShadow = !isSoftwareGl;
    sunsetKey.shadow.mapSize.set(1024, 1024);
    sunsetKey.shadow.camera.near = 2;
    sunsetKey.shadow.camera.far = 75;
    sunsetKey.shadow.camera.left = -18;
    sunsetKey.shadow.camera.right = 18;
    sunsetKey.shadow.camera.top = 18;
    sunsetKey.shadow.camera.bottom = -18;
    sunsetKey.shadow.bias = -0.0005;
    sunsetKey.shadow.normalBias = 0.02;
    this.group.add(sunsetKey);

    // Cool pastel lavender-blue sky fill on opposite side for realistic sunlit vs shaded building faces
    const skyFill = new THREE.DirectionalLight(0xa5b4fc, 0.72);
    skyFill.position.set(-24, 15, -10);
    this.group.add(skyFill);
  }
}
