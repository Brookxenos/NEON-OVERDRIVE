import * as THREE from 'three';

export class Lighting {
  public readonly group = new THREE.Group();

  constructor(isSoftwareGl: boolean) {
    const hemi = new THREE.HemisphereLight(0xfdba74, 0x3b2154, 0.78);
    this.group.add(hemi);

    // Low golden-hour sun angled from the front-right horizon
    const sunsetKey = new THREE.DirectionalLight(0xffbe7b, 1.95);
    sunsetKey.position.set(24, 12, -26);
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

    // Soft pastel lavender fill from front-left side so obstacles pop cleanly without rear glare
    const twilightRim = new THREE.DirectionalLight(0xc084fc, 0.38);
    twilightRim.position.set(-22, 14, -8);
    this.group.add(twilightRim);
  }
}
