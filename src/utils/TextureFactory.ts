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
  exhaustFlame: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skyBackdrop: THREE.CanvasTexture;
  gantrySigns: readonly THREE.CanvasTexture[];
  sideBanners: readonly THREE.CanvasTexture[];
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

  ctx.fillStyle = '#2c2e38';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(226, 210, 198, 0.05)' : 'rgba(22, 20, 30, 0.28)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = 'rgba(20, 18, 28, 0.48)';
  ctx.fillRect(0, 0, 512, 3);
  ctx.fillRect(0, 256, 512, 3);

  const laneCenters = [104, 256, 408];
  for (const lx of laneCenters) {
    const grad = ctx.createLinearGradient(lx - 48, 0, lx + 48, 0);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(18, 18, 28, 0.34)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - 48, 0, 96, 512);
  }

  ctx.fillStyle = 'rgba(245, 158, 11, 0.84)';
  ctx.fillRect(10, 0, 5, 512);
  ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
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

  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 240, 256, 16);

  return configureTexture(new THREE.CanvasTexture(canvas), maxAnisotropy, true, 2, 1);
}

function createBuildingWindowTexture(
  maxAnisotropy: number,
  wallTopHex: string,
  wallBottomHex: string,
  glassTopHex: string,
  warmInteriorHex: string,
  isBalconyTower: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const wallGrad = ctx.createLinearGradient(0, 0, 0, 512);
  wallGrad.addColorStop(0, wallTopHex);
  wallGrad.addColorStop(0.65, wallBottomHex);
  wallGrad.addColorStop(1, '#c9b0bd');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 256, 512);

  ctx.fillStyle = 'rgba(255, 248, 236, 0.22)';
  for (let x = 0; x < 256; x += 64) {
    ctx.fillRect(x, 0, 5, 512);
  }

  if (isBalconyTower) {
    for (let y = 10; y < 500; y += 32) {
      ctx.fillStyle = 'rgba(255, 243, 224, 0.65)';
      ctx.fillRect(0, y + 22, 256, 5);
      ctx.fillStyle = 'rgba(84, 72, 112, 0.35)';
      ctx.fillRect(0, y + 27, 256, 3);

      for (let x = 10; x < 246; x += 28) {
        ctx.fillStyle = '#fff5ea';
        ctx.fillRect(x - 1, y - 1, 22, 22);

        const glassGrad = ctx.createLinearGradient(x, y, x, y + 20);
        glassGrad.addColorStop(0, glassTopHex);
        glassGrad.addColorStop(1, '#6c729e');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(x, y, 20, 20);

        if (Math.random() < 0.32) {
          ctx.fillStyle = warmInteriorHex;
          ctx.globalAlpha = 0.45 + Math.random() * 0.25;
          ctx.fillRect(x + 2, y + 3, 16, 14);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(255, 220, 178, 0.28)';
          ctx.fillRect(x + 2, y + 2, 16, 7);
        }
      }
    }
  } else {
    ctx.fillStyle = 'rgba(130, 108, 140, 0.22)';
    for (let y = 0; y < 512; y += 36) {
      ctx.fillRect(0, y, 256, 3);
    }

    for (let y = 12; y < 496; y += 36) {
      for (let x = 14; x < 242; x += 26) {
        ctx.fillStyle = '#fff6eb';
        ctx.fillRect(x - 2, y - 2, 18, 24);

        const glassGrad = ctx.createLinearGradient(x, y, x, y + 20);
        glassGrad.addColorStop(0, glassTopHex);
        glassGrad.addColorStop(1, '#6873a6');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(x, y, 14, 20);

        ctx.fillStyle = 'rgba(255, 246, 235, 0.55)';
        ctx.fillRect(x, y + 9, 14, 1.5);

        if (Math.random() < 0.28) {
          ctx.fillStyle = warmInteriorHex;
          ctx.globalAlpha = 0.42;
          ctx.fillRect(x + 2, y + 2, 10, 16);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  ctx.fillStyle = 'rgba(255, 244, 226, 0.65)';
  ctx.fillRect(0, 0, 256, 6);

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

function createExhaustFlameTexture(): THREE.CanvasTexture {
  const width = 128;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // LatheGeometry v=0 (nozzle root) maps to bottom (y=height), v=1 (tip) maps to top (y=0)
  const mainGrad = ctx.createLinearGradient(0, height, 0, 0);
  mainGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  mainGrad.addColorStop(0.16, 'rgba(255, 250, 235, 0.96)');
  mainGrad.addColorStop(0.42, 'rgba(255, 236, 200, 0.72)');
  mainGrad.addColorStop(0.72, 'rgba(255, 210, 160, 0.28)');
  mainGrad.addColorStop(0.92, 'rgba(255, 180, 120, 0.05)');
  mainGrad.addColorStop(1.0, 'rgba(255, 180, 120, 0.0)');
  ctx.fillStyle = mainGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle plasma shock diamonds / streaks along the jet for rich motion
  for (let s = 0; s < 10; s++) {
    const sx = (s / 10) * width;
    const sw = width * 0.14;
    const streakGrad = ctx.createLinearGradient(0, height, 0, height * 0.15);
    streakGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.35)');
    streakGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.16)');
    streakGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(sx, height * 0.15, sw * 0.55, height * 0.85);
  }

  // Soft longitudinal shock-diamond brightenings near the root
  const shockPositions = [0.88, 0.68, 0.48];
  for (let i = 0; i < shockPositions.length; i++) {
    const sy = height * shockPositions[i];
    const shock = ctx.createRadialGradient(width * 0.5, sy, 2, width * 0.5, sy, 34 - i * 6);
    shock.addColorStop(0, `rgba(255, 255, 255, ${0.42 - i * 0.1})`);
    shock.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shock;
    ctx.fillRect(0, sy - 40, width, 80);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
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

  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#6b6fb8');
  skyGrad.addColorStop(0.22, '#a774b4');
  skyGrad.addColorStop(0.36, '#df7d98');
  skyGrad.addColorStop(0.45, '#f79f71');
  skyGrad.addColorStop(0.51, '#ffcf8f');
  skyGrad.addColorStop(0.57, '#ffe7b3');
  skyGrad.addColorStop(0.68, '#d49098');
  skyGrad.addColorStop(1, '#7a688c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  const sunX = 684;
  const sunY = 216;
  const sunHalo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
  sunHalo.addColorStop(0, 'rgba(255, 250, 224, 0.96)');
  sunHalo.addColorStop(0.18, 'rgba(255, 214, 146, 0.68)');
  sunHalo.addColorStop(0.48, 'rgba(248, 145, 134, 0.28)');
  sunHalo.addColorStop(1, 'rgba(248, 145, 134, 0)');
  ctx.fillStyle = sunHalo;
  ctx.fillRect(sunX - 190, sunY - 190, 380, 380);

  ctx.fillStyle = '#fffdf0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * 1024;
    const cy = 110 + Math.random() * 125;
    const w = 100 + Math.random() * 200;
    const h = 9 + Math.random() * 16;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, w);
    cloudGrad.addColorStop(
      0,
      i % 2 === 0 ? 'rgba(255, 222, 173, 0.22)' : 'rgba(249, 168, 212, 0.16)',
    );
    cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 240, 225, 0.24)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(810, 155);
  ctx.lineTo(860, 165);
  ctx.stroke();
  ctx.fillStyle = 'rgba(72, 48, 86, 0.55)';
  ctx.fillRect(806, 153, 7, 2);
  ctx.fillRect(808, 150, 2, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const GANTRY_SIGN_LABELS: readonly string[] = [
  'Iesus Dominus est',
  'xenos',
  'Ἁγία Μαρία, Μήτηρ Θεοῦ',
  'The Brook',
];

function createGantrySignTexture(label: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
  bgGrad.addColorStop(0, '#072a24');
  bgGrad.addColorStop(1, '#041a18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(14, 14, 484, 4);

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

  let fontSize = 54;
  const maxTextWidth = 392;
  const fontFamily =
    '"Chakra Petch", "Plus Jakarta Sans", "Noto Sans", "Segoe UI", "DejaVu Sans", system-ui, sans-serif';
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  while (fontSize > 22 && ctx.measureText(label).width > maxTextWidth) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText(label, 256, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const SIDE_BANNER_IMAGE_PATHS: readonly string[] = [
  '/assets/billboards/grand_canyon_portrait_ea03150c.png',
  '/assets/billboards/Photo_from_2026-10-29_19-19-24.405529_99733e6a.jpeg',
  '/assets/billboards/itachi-uchiha-moon-5120x2880-25777_c56f5d2b.jpg',
  '/assets/billboards/astronaut-dark-3840x2160-22768_3df94603.jpg',
  '/assets/billboards/moon-mountains-3840x2160-11462_dc1c89ce.jpeg',
  '/assets/billboards/grand-theft-auto-vi-3840x2160-27352_613da459.jpg',
  '/assets/billboards/grand-theft-auto-vi-3840x2160-27417_2105951f.jpg',
];

function createSideBannerTexture(imagePath: string, maxAnisotropy: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fallbackGrad = ctx.createLinearGradient(0, 0, width, height);
  fallbackGrad.addColorStop(0, '#0f172a');
  fallbackGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = fallbackGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw <= 0 || ih <= 0) return;

      const imgRatio = iw / ih;
      const targetRatio = width / height;

      ctx.clearRect(0, 0, width, height);

      if (imgRatio < 1.1) {
        // Portrait photo: ambient blurred cover backdrop + crisp uncropped centered foreground
        const bgW = width;
        const bgH = width / imgRatio;
        const bgY = -(bgH - height) * 0.35;
        ctx.save();
        ctx.filter = 'blur(18px) brightness(0.45)';
        ctx.drawImage(img, 0, bgY, bgW, bgH);
        ctx.restore();

        ctx.fillStyle = 'rgba(10, 15, 28, 0.32)';
        ctx.fillRect(0, 0, width, height);

        const fgH = height - 16;
        const fgW = fgH * imgRatio;
        const fgX = (width - fgW) * 0.5;
        ctx.drawImage(img, fgX, 8, fgW, fgH);

        ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(fgX, 8, fgW, fgH);
      } else {
        // Landscape photo: edge-to-edge cover-fit with slight upper focal bias
        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;
        if (imgRatio > targetRatio) {
          drawH = height;
          drawW = height * imgRatio;
          drawX = -(drawW - width) * 0.5;
        } else {
          drawW = width;
          drawH = width / imgRatio;
          drawY = -(drawH - height) * 0.42;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      tex.needsUpdate = true;
    };
    img.src = imagePath;
  }

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
      '#f7d2b5',
      '#e5b4a4',
      '#9fb0dc',
      '#ffe1a8',
      true,
    );
    const buildingWindowsMagenta = createBuildingWindowTexture(
      maxAnisotropy,
      '#fbe3be',
      '#f0c6ae',
      '#95a6d6',
      '#ffd99a',
      false,
    );
    const headlightBeam = createHeadlightBeamTexture();
    const exhaustFlame = createExhaustFlameTexture();
    const contactShadow = createRadialTexture('rgba(0, 0, 0, 0.9)', 'rgba(24, 24, 48, 0.22)');
    const skyBackdrop = createSkyBackdropTexture();
    const gantrySigns = GANTRY_SIGN_LABELS.map((label) =>
      createGantrySignTexture(label, maxAnisotropy),
    );
    const sideBanners = SIDE_BANNER_IMAGE_PATHS.map((path) =>
      createSideBannerTexture(path, maxAnisotropy),
    );

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
      exhaustFlame,
      contactShadow,
      skyBackdrop,
      gantrySigns,
      sideBanners,
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
        exhaustFlame.dispose();
        contactShadow.dispose();
        skyBackdrop.dispose();
        gantrySigns.forEach((tex) => tex.dispose());
        sideBanners.forEach((tex) => tex.dispose());
      },
    };
  }
}
