import * as THREE from 'three';

export interface TextureBundle {
  roadAlbedo: THREE.CanvasTexture;
  roadRoughness: THREE.CanvasTexture;
  roadNormal: THREE.CanvasTexture;
  carbonNormal: THREE.CanvasTexture;
  boostPad: THREE.CanvasTexture;
  hazardStripes: THREE.CanvasTexture;
  buildingWindowsCyan: THREE.CanvasTexture;
  buildingWindowsMagenta: THREE.CanvasTexture;
  headlightBeam: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skyBackdrop: THREE.CanvasTexture;
  theBrookSign: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  tex: THREE.CanvasTexture,
  maxAnisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRoadAlbedoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#11131d';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(148, 163, 184, 0.035)' : 'rgba(4, 6, 12, 0.35)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle asphalt expansion joints
  ctx.fillStyle = 'rgba(4, 6, 12, 0.6)';
  ctx.fillRect(0, 0, 512, 3);
  ctx.fillRect(0, 256, 512, 3);

  // Subtle tire-wear darkening along the three lanes
  const laneCenters = [104, 256, 408];
  for (const lx of laneCenters) {
    const grad = ctx.createLinearGradient(lx - 48, 0, lx + 48, 0);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(5, 7, 14, 0.42)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - 48, 0, 96, 512);
  }

  // Warm coastal amber shoulder stripe (left) & crisp silver-white shoulder stripe (right)
  ctx.fillStyle = 'rgba(217, 119, 6, 0.72)';
  ctx.fillRect(10, 0, 5, 512);
  ctx.fillStyle = 'rgba(203, 213, 225, 0.62)';
  ctx.fillRect(497, 0, 5, 512);

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, true, 1, 2);
}

function createRoadRoughnessTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#bcbcbc';
  ctx.fillRect(0, 0, 512, 512);

  const laneCenters = [104, 256, 408];
  for (const lx of laneCenters) {
    const grad = ctx.createLinearGradient(lx - 44, 0, lx + 44, 0);
    grad.addColorStop(0, '#bcbcbc');
    grad.addColorStop(0.5, '#8a8a8a');
    grad.addColorStop(1, '#bcbcbc');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - 44, 0, 88, 512);
  }

  for (let i = 0; i < 14; i++) {
    const px = 40 + Math.random() * 432;
    const py = Math.random() * 512;
    const rx = 18 + Math.random() * 32;
    const ry = 28 + Math.random() * 56;
    const pGrad = ctx.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
    pGrad.addColorStop(0, '#5a5a5a');
    pGrad.addColorStop(0.65, '#7a7a7a');
    pGrad.addColorStop(1, 'rgba(188, 188, 188, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, false, 1, 2);
}

function createRoadNormalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    const groove = y < 3 || (y >= 128 && y < 131);
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      data[idx] = groove ? 128 : 128 + (Math.random() - 0.5) * 34;
      data[idx + 1] = groove ? 90 : 128 + (Math.random() - 0.5) * 34;
      data[idx + 2] = 245;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, false, 2, 4);
}

function createCarbonNormalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cell = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2) === 0;
      data[idx] = cell ? 148 : 108;
      data[idx + 1] = cell ? 142 : 114;
      data[idx + 2] = 248;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, false, 6, 6);
}

function createBoostPadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#041224';
  ctx.fillRect(0, 0, 256, 512);

  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(8, 0, 14, 512);
  ctx.fillRect(234, 0, 14, 512);

  for (let y = 52; y < 480; y += 110) {
    ctx.beginPath();
    ctx.moveTo(42, y + 66);
    ctx.lineTo(128, y);
    ctx.lineTo(214, y + 66);
    ctx.lineTo(214, y + 98);
    ctx.lineTo(128, y + 32);
    ctx.lineTo(42, y + 98);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, y, 0, y + 98);
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.4, '#0891b2');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, true, 1, 1);
}

function createHazardStripesTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#fde047';
  for (let i = -256; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 26, 0);
    ctx.lineTo(i + 282, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp top/bottom high-visibility cream warning edge lines
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 240, 256, 16);

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, true, 2, 1);
}

function createBuildingWindowTexture(
  maxAnisotropy: number,
  primaryHex: string,
  secondaryHex: string,
  wallTopHex = '#4a3048',
  wallBottomHex = '#23172d',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pastel Art Deco stucco wall gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 512);
  wallGrad.addColorStop(0, wallTopHex);
  wallGrad.addColorStop(0.55, '#2d2038');
  wallGrad.addColorStop(1, wallBottomHex);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 256, 512);

  // Art Deco vertical fluted pilasters & floor cornice bands
  ctx.fillStyle = 'rgba(255, 224, 194, 0.08)';
  for (let x = 0; x < 256; x += 64) {
    ctx.fillRect(x, 0, 5, 512);
  }
  ctx.fillStyle = 'rgba(15, 10, 25, 0.36)';
  for (let y = 0; y < 512; y += 28) {
    ctx.fillRect(0, y, 256, 3);
  }

  // Recessed hotel window bays (warm amber / sunset reflection / dark glass)
  for (let y = 10; y < 498; y += 28) {
    for (let x = 14; x < 242; x += 22) {
      // Dark glass frame
      ctx.fillStyle = '#120e21';
      ctx.fillRect(x, y, 13, 17);

      const roll = Math.random();
      if (roll < 0.38) {
        ctx.fillStyle = primaryHex;
        ctx.globalAlpha = 0.42 + Math.random() * 0.25;
        ctx.fillRect(x + 2, y + 2, 9, 13);
      } else if (roll < 0.56) {
        ctx.fillStyle = secondaryHex;
        ctx.globalAlpha = 0.28 + Math.random() * 0.22;
        ctx.fillRect(x + 2, y + 2, 9, 13);
      } else {
        // Subtle sunset sky reflection on dark glass
        ctx.fillStyle = '#473059';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x + 2, y + 2, 9, 6);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Top Art Deco cornice trim
  ctx.fillStyle = primaryHex;
  ctx.globalAlpha = 0.48;
  ctx.fillRect(0, 0, 256, 5);
  ctx.globalAlpha = 1;

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, true, 1, 2);
}

function createHeadlightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
  grad.addColorStop(0.45, 'rgba(14, 165, 233, 0.09)');
  grad.addColorStop(1, 'rgba(8, 145, 178, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  ctx.globalCompositeOperation = 'destination-in';
  const sideGrad = ctx.createLinearGradient(0, 0, 128, 0);
  sideGrad.addColorStop(0, 'rgba(0,0,0,0)');
  sideGrad.addColorStop(0.35, 'rgba(0,0,0,1)');
  sideGrad.addColorStop(0.65, 'rgba(0,0,0,1)');
  sideGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, 0, 128, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRadialTexture(innerColor: string, outerColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.45, outerColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSkyBackdropTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pastel lavender-to-apricot Vice sunset gradient (equator is y = 256)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#36265e');
  skyGrad.addColorStop(0.22, '#624894');
  skyGrad.addColorStop(0.37, '#b56394');
  skyGrad.addColorStop(0.46, '#eb7b78');
  skyGrad.addColorStop(0.52, '#faaa68');
  skyGrad.addColorStop(0.57, '#fde49e');
  skyGrad.addColorStop(0.65, '#6a386c');
  skyGrad.addColorStop(1, '#241438');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Soft setting sun in the front-right sky (u ~ 0.68 -> x ~ 696, just above horizon y = 256)
  const sunX = 696;
  const sunY = 212;
  const sunHalo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  sunHalo.addColorStop(0, 'rgba(255, 243, 196, 0.92)');
  sunHalo.addColorStop(0.16, 'rgba(253, 186, 116, 0.55)');
  sunHalo.addColorStop(0.45, 'rgba(244, 114, 182, 0.18)');
  sunHalo.addColorStop(1, 'rgba(244, 114, 182, 0)');
  ctx.fillStyle = sunHalo;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 17, 0, Math.PI * 2);
  ctx.fill();

  // Warm wispy sunset clouds
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * 1024;
    const cy = 140 + Math.random() * 105;
    const w = 90 + Math.random() * 180;
    const h = 8 + Math.random() * 16;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, w);
    cloudGrad.addColorStop(
      0,
      i % 2 === 0 ? 'rgba(253, 186, 116, 0.14)' : 'rgba(244, 114, 182, 0.12)',
    );
    cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint twilight stars high near the zenith
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 120;
    ctx.fillStyle = `rgba(255, 241, 242, ${0.14 + Math.random() * 0.25})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Distant silhouette plane + faint contrail in upper-left sky (u ~ 0.80)
  ctx.strokeStyle = 'rgba(255, 228, 214, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(810, 155);
  ctx.lineTo(860, 165);
  ctx.stroke();
  ctx.fillStyle = 'rgba(42, 20, 56, 0.65)';
  ctx.fillRect(806, 153, 7, 2);
  ctx.fillRect(808, 150, 2, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createTheBrookSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
  bgGrad.addColorStop(0, '#072a24');
  bgGrad.addColorStop(1, '#041a18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 128);

  // Crisp highway sign outer border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  // Subtle top accent bar
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(14, 14, 484, 4);

  // Subtle traffic-signal indicator dots on left & right of signboard
  const dotColors = ['#fb7185', '#fbbf24', '#34d399'];
  for (let i = 0; i < dotColors.length; i++) {
    const cy = 42 + i * 22;
    ctx.fillStyle = dotColors[i];
    ctx.beginPath();
    ctx.arc(38, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(474, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main overhead traffic-bar title: "The Brook"
  ctx.font = '700 54px "Chakra Petch", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('The Brook', 256, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class TextureFactory {
  public static createBundle(maxAnisotropy: number): TextureBundle {
    const roadAlbedo = createRoadAlbedoTexture(maxAnisotropy);
    const roadRoughness = createRoadRoughnessTexture(maxAnisotropy);
    const roadNormal = createRoadNormalTexture(maxAnisotropy);
    const carbonNormal = createCarbonNormalTexture(maxAnisotropy);
    const boostPad = createBoostPadTexture(maxAnisotropy);
    const hazardStripes = createHazardStripesTexture(maxAnisotropy);
    const buildingWindowsCyan = createBuildingWindowTexture(
      maxAnisotropy,
      '#fde68a',
      '#2dd4bf',
      '#844e69',
      '#39224a',
    );
    const buildingWindowsMagenta = createBuildingWindowTexture(
      maxAnisotropy,
      '#fdba74',
      '#f472b6',
      '#5c4c86',
      '#2a224d',
    );
    const headlightBeam = createHeadlightBeamTexture();
    const contactShadow = createRadialTexture('rgba(0, 0, 0, 0.9)', 'rgba(24, 24, 48, 0.22)');
    const skyBackdrop = createSkyBackdropTexture();
    const theBrookSign = createTheBrookSignTexture(maxAnisotropy);

    return {
      roadAlbedo,
      roadRoughness,
      roadNormal,
      carbonNormal,
      boostPad,
      hazardStripes,
      buildingWindowsCyan,
      buildingWindowsMagenta,
      headlightBeam,
      contactShadow,
      skyBackdrop,
      theBrookSign,
      dispose: () => {
        roadAlbedo.dispose();
        roadRoughness.dispose();
        roadNormal.dispose();
        carbonNormal.dispose();
        boostPad.dispose();
        hazardStripes.dispose();
        buildingWindowsCyan.dispose();
        buildingWindowsMagenta.dispose();
        headlightBeam.dispose();
        contactShadow.dispose();
        skyBackdrop.dispose();
        theBrookSign.dispose();
      },
    };
  }
}
