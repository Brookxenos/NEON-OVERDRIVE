import * as THREE from 'three';

export type CarShellFamily =
  | 'classic_muscle'
  | 'widebody_coupe'
  | 'aero_ev'
  | 'midengine_super'
  | 'endurance_gt'
  | 'rally_coupe'
  | 'lmp_proto'
  | 'traffic_coupe';

interface HullStation {
  z: number;
  halfW: number;
  lowerW: number;
  bottomY: number;
  rockerY: number;
  beltY: number;
  fenderPeakY: number;
  crownY: number;
  waistPinch?: number;
}

interface CabinStation {
  z: number;
  baseW: number;
  midW: number;
  topW: number;
  baseY: number;
  midY: number;
  topY: number;
}

export interface CarShellGeometries {
  body: THREE.BufferGeometry;
  cabinGlass: THREE.BufferGeometry;
  roofShell: THREE.BufferGeometry;
}

function evalCatmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function sampleSplineStations<T extends object>(
  stations: readonly T[],
  numericKeys: readonly (keyof T)[],
  subdivisionsPerSpan: number,
): T[] {
  const result: T[] = [];
  const count = stations.length;
  for (let i = 0; i < count - 1; i++) {
    const s0 = stations[Math.max(0, i - 1)];
    const s1 = stations[i];
    const s2 = stations[i + 1];
    const s3 = stations[Math.min(count - 1, i + 2)];
    const steps = i === count - 2 ? subdivisionsPerSpan + 1 : subdivisionsPerSpan;
    for (let step = 0; step < steps; step++) {
      const t = step / subdivisionsPerSpan;
      const out = { ...s1 } as Record<string, number>;
      for (const key of numericKeys) {
        const k = key as string;
        const v0 = Number((s0 as Record<string, unknown>)[k] ?? 0);
        const v1 = Number((s1 as Record<string, unknown>)[k] ?? 0);
        const v2 = Number((s2 as Record<string, unknown>)[k] ?? 0);
        const v3 = Number((s3 as Record<string, unknown>)[k] ?? 0);
        out[k] = evalCatmullRom(v0, v1, v2, v3, t);
      }
      result.push(out as unknown as T);
    }
  }
  return result;
}

function computeArchRelief(z: number, wheelZs: readonly number[], archRadius: number): number {
  let maxRelief = 0;
  for (const wz of wheelZs) {
    const dz = Math.abs(z - wz);
    if (dz < archRadius) {
      const h = Math.sqrt(Math.max(0, archRadius * archRadius - dz * dz)) / archRadius;
      if (h > maxRelief) maxRelief = h;
    }
  }
  return maxRelief;
}

function buildLoftedHull(
  stations: readonly HullStation[],
  wheelZs: readonly number[],
  archRadius: number,
  subdivisions = 4,
): THREE.BufferGeometry {
  const dense = sampleSplineStations(
    stations,
    ['z', 'halfW', 'lowerW', 'bottomY', 'rockerY', 'beltY', 'fenderPeakY', 'crownY', 'waistPinch'],
    subdivisions,
  );

  // 22 points per closed cross-section ring (clockwise when looking -Z -> +Z)
  const ringSize = 22;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const zMin = dense[0].z;
  const zSpan = Math.max(0.001, dense[dense.length - 1].z - zMin);

  for (let i = 0; i < dense.length; i++) {
    const s = dense[i];
    const arch = computeArchRelief(s.z, wheelZs, archRadius);
    const pinch = s.waistPinch ?? 0;

    // Smooth wheel-well recess pushing lower outer flank inward at wheel openings
    const lowerRecess = arch * 0.24;
    const midRecess = arch * 0.16;

    const rBottomX = Math.max(0.32, s.lowerW * 0.66 - lowerRecess * 0.6);
    const rBevelX = Math.max(0.38, s.lowerW * 0.94 - lowerRecess);
    const rRockerX = Math.max(0.42, s.halfW * 0.95 - lowerRecess);
    const rMidLowX = Math.max(0.46, s.halfW * (1.01 - pinch * 0.05) - midRecess);
    const rMidHighX = Math.max(0.48, s.halfW * (0.99 - pinch * 0.03) - midRecess * 0.45);
    const rShoulderX = s.halfW * 0.91;
    const rCrestX = s.halfW * 0.72;
    const rChannelX = s.halfW * 0.48;
    const rInnerX = s.halfW * 0.24;
    const rCenterOffset = s.halfW * 0.08;

    const yBot = s.bottomY;
    const yBevel = s.bottomY + Math.max(0.025, (s.rockerY - s.bottomY) * 0.28);
    const yRocker = s.rockerY;
    const yMidLow = THREE.MathUtils.lerp(s.rockerY, s.beltY, 0.36) + arch * 0.06;
    const yMidHigh = THREE.MathUtils.lerp(s.rockerY, s.beltY, 0.72);
    const yShoulder = s.beltY;
    const yCrest = THREE.MathUtils.lerp(s.beltY, s.fenderPeakY, 0.82);
    const yPeak = s.fenderPeakY;
    const yChannel = THREE.MathUtils.lerp(s.fenderPeakY, s.crownY, 0.52);
    const yCrownNear = THREE.MathUtils.lerp(s.fenderPeakY, s.crownY, 0.92);

    const pts: Array<[number, number]> = [
      [0, yBot],
      [rBottomX, yBot],
      [rBevelX, yBevel],
      [rRockerX, yRocker],
      [rMidLowX, yMidLow],
      [rMidHighX, yMidHigh],
      [rShoulderX, yShoulder],
      [rCrestX, yCrest],
      [rChannelX, yPeak],
      [rInnerX, yChannel],
      [rCenterOffset, yCrownNear],
      [0, s.crownY],
      [-rCenterOffset, yCrownNear],
      [-rInnerX, yChannel],
      [-rChannelX, yPeak],
      [-rCrestX, yCrest],
      [-rShoulderX, yShoulder],
      [-rMidHighX, yMidHigh],
      [-rMidLowX, yMidLow],
      [-rRockerX, yRocker],
      [-rBevelX, yBevel],
      [-rBottomX, yBot],
    ];

    const vCoord = (s.z - zMin) / zSpan;
    for (let j = 0; j < ringSize; j++) {
      const [px, py] = pts[j];
      positions.push(px, py, s.z);
      uvs.push(px * 0.5 + 0.5, vCoord);
    }
  }

  for (let i = 0; i < dense.length - 1; i++) {
    const a = i * ringSize;
    const b = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const jNext = (j + 1) % ringSize;
      const a0 = a + j;
      const a1 = a + jNext;
      const b0 = b + j;
      const b1 = b + jNext;
      // Outward-facing winding: (a0, a1, b1) and (a0, b1, b0)
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  const first = dense[0];
  const frontCenterIdx = positions.length / 3;
  positions.push(0, (first.bottomY + first.crownY) * 0.52, first.z - 0.03);
  uvs.push(0.5, 0);
  for (let j = 0; j < ringSize; j++) {
    const jNext = (j + 1) % ringSize;
    indices.push(frontCenterIdx, jNext, j);
  }

  const last = dense[dense.length - 1];
  const lastBase = (dense.length - 1) * ringSize;
  const rearCenterIdx = positions.length / 3;
  positions.push(0, (last.bottomY + last.crownY) * 0.54, last.z + 0.025);
  uvs.push(0.5, 1);
  for (let j = 0; j < ringSize; j++) {
    const jNext = (j + 1) % ringSize;
    indices.push(rearCenterIdx, lastBase + j, lastBase + jNext);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildLoftedCabin(stations: readonly CabinStation[], subdivisions = 4): THREE.BufferGeometry {
  const dense = sampleSplineStations(
    stations,
    ['z', 'baseW', 'midW', 'topW', 'baseY', 'midY', 'topY'],
    subdivisions,
  );

  const ringSize = 14;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const zMin = dense[0].z;
  const zSpan = Math.max(0.001, dense[dense.length - 1].z - zMin);

  for (let i = 0; i < dense.length; i++) {
    const s = dense[i];
    const pts: Array<[number, number]> = [
      [0, s.baseY - 0.04],
      [s.baseW * 0.72, s.baseY - 0.02],
      [s.baseW, s.baseY],
      [s.midW, s.midY],
      [s.topW, s.topY - 0.035],
      [s.topW * 0.62, s.topY - 0.008],
      [s.topW * 0.22, s.topY],
      [0, s.topY + 0.004],
      [-s.topW * 0.22, s.topY],
      [-s.topW * 0.62, s.topY - 0.008],
      [-s.topW, s.topY - 0.035],
      [-s.midW, s.midY],
      [-s.baseW, s.baseY],
      [-s.baseW * 0.72, s.baseY - 0.02],
    ];
    const vCoord = (s.z - zMin) / zSpan;
    for (let j = 0; j < ringSize; j++) {
      const [px, py] = pts[j];
      positions.push(px, py, s.z);
      uvs.push(px * 0.6 + 0.5, vCoord);
    }
  }

  for (let i = 0; i < dense.length - 1; i++) {
    const a = i * ringSize;
    const b = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const jNext = (j + 1) % ringSize;
      indices.push(a + j, a + jNext, b + jNext);
      indices.push(a + j, b + jNext, b + j);
    }
  }

  const first = dense[0];
  const frontCenter = positions.length / 3;
  positions.push(0, first.baseY + 0.01, first.z - 0.01);
  uvs.push(0.5, 0);
  for (let j = 0; j < ringSize; j++) {
    indices.push(frontCenter, (j + 1) % ringSize, j);
  }

  const last = dense[dense.length - 1];
  const lastBase = (dense.length - 1) * ringSize;
  const rearCenter = positions.length / 3;
  positions.push(0, last.baseY + 0.01, last.z + 0.01);
  uvs.push(0.5, 1);
  for (let j = 0; j < ringSize; j++) {
    indices.push(rearCenter, lastBase + j, lastBase + ((j + 1) % ringSize));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildContouredRoofShell(
  stations: readonly CabinStation[],
  startIdx: number,
  endIdx: number,
): THREE.BufferGeometry {
  const roofSlice = stations.slice(startIdx, endIdx + 1);
  const dense = sampleSplineStations(
    roofSlice,
    ['z', 'baseW', 'midW', 'topW', 'baseY', 'midY', 'topY'],
    4,
  );

  // Smooth contoured roof panel + rear C-pillar shoulders wrapping cleanly above the glass crown
  const ringSize = 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const zMin = dense[0].z;
  const zSpan = Math.max(0.001, dense[dense.length - 1].z - zMin);

  for (let i = 0; i < dense.length; i++) {
    const s = dense[i];
    const t = i / Math.max(1, dense.length - 1);
    // Taper front & rear edge thickness slightly so the roof shell melds cleanly into windshield & rear deck
    const edgePinch = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
    const lift = 0.012 + edgePinch * 0.016;
    const w = s.topW * (0.94 + edgePinch * 0.06);
    const pts: Array<[number, number]> = [
      [0, s.topY - 0.04],
      [w * 0.65, s.topY - 0.036],
      [w * 1.02, s.topY - 0.025],
      [w * 0.94, s.topY + lift * 0.65],
      [w * 0.45, s.topY + lift],
      [0, s.topY + lift + 0.006],
      [-w * 0.45, s.topY + lift],
      [-w * 0.94, s.topY + lift * 0.65],
      [-w * 1.02, s.topY - 0.025],
      [-w * 0.65, s.topY - 0.036],
    ];
    const vCoord = (s.z - zMin) / zSpan;
    for (let j = 0; j < ringSize; j++) {
      const [px, py] = pts[j];
      positions.push(px, py, s.z);
      uvs.push(px * 0.7 + 0.5, vCoord);
    }
  }

  for (let i = 0; i < dense.length - 1; i++) {
    const a = i * ringSize;
    const b = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const jNext = (j + 1) % ringSize;
      indices.push(a + j, a + jNext, b + jNext);
      indices.push(a + j, b + jNext, b + j);
    }
  }

  const first = dense[0];
  const frontCenter = positions.length / 3;
  positions.push(0, first.topY - 0.015, first.z - 0.005);
  uvs.push(0.5, 0);
  for (let j = 0; j < ringSize; j++) {
    indices.push(frontCenter, (j + 1) % ringSize, j);
  }

  const last = dense[dense.length - 1];
  const lastBase = (dense.length - 1) * ringSize;
  const rearCenter = positions.length / 3;
  positions.push(0, last.topY - 0.015, last.z + 0.005);
  uvs.push(0.5, 1);
  for (let j = 0; j < ringSize; j++) {
    indices.push(rearCenter, lastBase + j, lastBase + ((j + 1) % ringSize));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createCarShellGeometries(family: CarShellFamily): CarShellGeometries {
  const playerWheels = [-1.36, 1.34];
  const trafficWheels = [-1.32, 1.28];

  switch (family) {
    case 'classic_muscle': {
      const hull: HullStation[] = [
        { z: -2.26, halfW: 0.78, lowerW: 0.74, bottomY: 0.14, rockerY: 0.25, beltY: 0.44, fenderPeakY: 0.46, crownY: 0.48 },
        { z: -2.02, halfW: 0.89, lowerW: 0.86, bottomY: 0.07, rockerY: 0.22, beltY: 0.51, fenderPeakY: 0.54, crownY: 0.57 },
        { z: -1.68, halfW: 0.92, lowerW: 0.87, bottomY: 0.06, rockerY: 0.21, beltY: 0.55, fenderPeakY: 0.58, crownY: 0.62 },
        { z: -1.36, halfW: 0.94, lowerW: 0.86, bottomY: 0.06, rockerY: 0.2, beltY: 0.57, fenderPeakY: 0.6, crownY: 0.64 },
        { z: -0.92, halfW: 0.91, lowerW: 0.86, bottomY: 0.05, rockerY: 0.19, beltY: 0.58, fenderPeakY: 0.6, crownY: 0.63, waistPinch: 0.35 },
        { z: 0.05, halfW: 0.89, lowerW: 0.85, bottomY: 0.05, rockerY: 0.19, beltY: 0.59, fenderPeakY: 0.61, crownY: 0.63, waistPinch: 0.45 },
        { z: 0.88, halfW: 0.94, lowerW: 0.89, bottomY: 0.05, rockerY: 0.2, beltY: 0.64, fenderPeakY: 0.66, crownY: 0.67 },
        { z: 1.34, halfW: 0.96, lowerW: 0.89, bottomY: 0.06, rockerY: 0.22, beltY: 0.66, fenderPeakY: 0.68, crownY: 0.69 },
        { z: 1.84, halfW: 0.92, lowerW: 0.86, bottomY: 0.08, rockerY: 0.24, beltY: 0.62, fenderPeakY: 0.64, crownY: 0.65 },
        { z: 2.18, halfW: 0.84, lowerW: 0.8, bottomY: 0.13, rockerY: 0.28, beltY: 0.56, fenderPeakY: 0.58, crownY: 0.59 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.68, baseW: 0.78, midW: 0.7, topW: 0.6, baseY: 0.58, midY: 0.64, topY: 0.67 },
        { z: -0.18, baseW: 0.76, midW: 0.67, topW: 0.56, baseY: 0.59, midY: 0.86, topY: 1.03 },
        { z: 0.52, baseW: 0.76, midW: 0.67, topW: 0.55, baseY: 0.61, midY: 0.87, topY: 1.02 },
        { z: 1.56, baseW: 0.78, midW: 0.7, topW: 0.62, baseY: 0.63, midY: 0.68, topY: 0.7 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.44),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'widebody_coupe': {
      const hull: HullStation[] = [
        { z: -2.25, halfW: 0.78, lowerW: 0.78, bottomY: 0.1, rockerY: 0.21, beltY: 0.37, fenderPeakY: 0.39, crownY: 0.41 },
        { z: -1.96, halfW: 0.91, lowerW: 0.89, bottomY: 0.05, rockerY: 0.19, beltY: 0.46, fenderPeakY: 0.5, crownY: 0.52 },
        { z: -1.36, halfW: 0.97, lowerW: 0.92, bottomY: 0.05, rockerY: 0.18, beltY: 0.55, fenderPeakY: 0.58, crownY: 0.59 },
        { z: -0.84, halfW: 0.9, lowerW: 0.87, bottomY: 0.05, rockerY: 0.18, beltY: 0.57, fenderPeakY: 0.6, crownY: 0.61, waistPinch: 0.4 },
        { z: 0.04, halfW: 0.89, lowerW: 0.86, bottomY: 0.05, rockerY: 0.18, beltY: 0.59, fenderPeakY: 0.61, crownY: 0.62, waistPinch: 0.5 },
        { z: 0.88, halfW: 0.95, lowerW: 0.9, bottomY: 0.05, rockerY: 0.19, beltY: 0.62, fenderPeakY: 0.65, crownY: 0.65 },
        { z: 1.34, halfW: 0.99, lowerW: 0.93, bottomY: 0.05, rockerY: 0.21, beltY: 0.64, fenderPeakY: 0.66, crownY: 0.67 },
        { z: 1.84, halfW: 0.92, lowerW: 0.88, bottomY: 0.07, rockerY: 0.23, beltY: 0.6, fenderPeakY: 0.62, crownY: 0.63 },
        { z: 2.2, halfW: 0.82, lowerW: 0.78, bottomY: 0.12, rockerY: 0.27, beltY: 0.54, fenderPeakY: 0.56, crownY: 0.57 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.78, baseW: 0.78, midW: 0.7, topW: 0.6, baseY: 0.56, midY: 0.61, topY: 0.64 },
        { z: -0.22, baseW: 0.75, midW: 0.66, topW: 0.55, baseY: 0.58, midY: 0.84, topY: 1.0 },
        { z: 0.5, baseW: 0.75, midW: 0.66, topW: 0.54, baseY: 0.6, midY: 0.84, topY: 0.99 },
        { z: 1.48, baseW: 0.77, midW: 0.69, topW: 0.61, baseY: 0.61, midY: 0.66, topY: 0.68 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.44),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'aero_ev': {
      const hull: HullStation[] = [
        { z: -2.26, halfW: 0.74, lowerW: 0.7, bottomY: 0.09, rockerY: 0.19, beltY: 0.34, fenderPeakY: 0.36, crownY: 0.37 },
        { z: -1.94, halfW: 0.88, lowerW: 0.84, bottomY: 0.05, rockerY: 0.18, beltY: 0.44, fenderPeakY: 0.47, crownY: 0.48 },
        { z: -1.36, halfW: 0.94, lowerW: 0.88, bottomY: 0.05, rockerY: 0.18, beltY: 0.54, fenderPeakY: 0.57, crownY: 0.57 },
        { z: -0.72, halfW: 0.92, lowerW: 0.87, bottomY: 0.05, rockerY: 0.18, beltY: 0.57, fenderPeakY: 0.59, crownY: 0.6, waistPinch: 0.3 },
        { z: 0.1, halfW: 0.91, lowerW: 0.87, bottomY: 0.05, rockerY: 0.18, beltY: 0.59, fenderPeakY: 0.61, crownY: 0.62, waistPinch: 0.35 },
        { z: 0.94, halfW: 0.95, lowerW: 0.9, bottomY: 0.05, rockerY: 0.2, beltY: 0.62, fenderPeakY: 0.65, crownY: 0.65 },
        { z: 1.38, halfW: 0.96, lowerW: 0.9, bottomY: 0.06, rockerY: 0.22, beltY: 0.63, fenderPeakY: 0.65, crownY: 0.66 },
        { z: 1.9, halfW: 0.89, lowerW: 0.84, bottomY: 0.08, rockerY: 0.25, beltY: 0.59, fenderPeakY: 0.61, crownY: 0.62 },
        { z: 2.22, halfW: 0.78, lowerW: 0.74, bottomY: 0.13, rockerY: 0.29, beltY: 0.52, fenderPeakY: 0.54, crownY: 0.55 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.98, baseW: 0.77, midW: 0.68, topW: 0.56, baseY: 0.55, midY: 0.6, topY: 0.62 },
        { z: -0.32, baseW: 0.75, midW: 0.65, topW: 0.53, baseY: 0.57, midY: 0.83, topY: 0.98 },
        { z: 0.44, baseW: 0.74, midW: 0.64, topW: 0.52, baseY: 0.59, midY: 0.83, topY: 0.97 },
        { z: 1.54, baseW: 0.75, midW: 0.67, topW: 0.58, baseY: 0.61, midY: 0.65, topY: 0.67 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.43),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'midengine_super': {
      // Cab-forward exotic wedge with sculpted raised front fenders and pinched waist into wide rear haunches
      const hull: HullStation[] = [
        { z: -2.28, halfW: 0.76, lowerW: 0.78, bottomY: 0.08, rockerY: 0.17, beltY: 0.31, fenderPeakY: 0.34, crownY: 0.32 },
        { z: -1.96, halfW: 0.92, lowerW: 0.9, bottomY: 0.05, rockerY: 0.16, beltY: 0.43, fenderPeakY: 0.49, crownY: 0.43 },
        { z: -1.36, halfW: 0.97, lowerW: 0.91, bottomY: 0.05, rockerY: 0.16, beltY: 0.54, fenderPeakY: 0.61, crownY: 0.54 },
        { z: -0.78, halfW: 0.88, lowerW: 0.84, bottomY: 0.05, rockerY: 0.16, beltY: 0.53, fenderPeakY: 0.58, crownY: 0.55, waistPinch: 0.85 },
        { z: 0.04, halfW: 0.88, lowerW: 0.85, bottomY: 0.05, rockerY: 0.16, beltY: 0.56, fenderPeakY: 0.59, crownY: 0.57, waistPinch: 0.8 },
        { z: 0.86, halfW: 0.98, lowerW: 0.92, bottomY: 0.05, rockerY: 0.18, beltY: 0.63, fenderPeakY: 0.68, crownY: 0.63 },
        { z: 1.36, halfW: 1.0, lowerW: 0.94, bottomY: 0.06, rockerY: 0.2, beltY: 0.65, fenderPeakY: 0.69, crownY: 0.65 },
        { z: 1.88, halfW: 0.94, lowerW: 0.88, bottomY: 0.08, rockerY: 0.22, beltY: 0.6, fenderPeakY: 0.63, crownY: 0.6 },
        { z: 2.22, halfW: 0.84, lowerW: 0.78, bottomY: 0.12, rockerY: 0.26, beltY: 0.52, fenderPeakY: 0.54, crownY: 0.52 },
      ];
      const cabin: CabinStation[] = [
        { z: -1.04, baseW: 0.74, midW: 0.64, topW: 0.52, baseY: 0.52, midY: 0.57, topY: 0.59 },
        { z: -0.38, baseW: 0.74, midW: 0.63, topW: 0.5, baseY: 0.55, midY: 0.81, topY: 0.94 },
        { z: 0.34, baseW: 0.73, midW: 0.62, topW: 0.49, baseY: 0.57, midY: 0.81, topY: 0.93 },
        { z: 1.24, baseW: 0.72, midW: 0.63, topW: 0.53, baseY: 0.61, midY: 0.66, topY: 0.68 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.44),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'endurance_gt': {
      const hull: HullStation[] = [
        { z: -2.28, halfW: 0.78, lowerW: 0.8, bottomY: 0.08, rockerY: 0.17, beltY: 0.33, fenderPeakY: 0.36, crownY: 0.34 },
        { z: -1.92, halfW: 0.93, lowerW: 0.92, bottomY: 0.05, rockerY: 0.16, beltY: 0.45, fenderPeakY: 0.51, crownY: 0.47 },
        { z: -1.36, halfW: 0.97, lowerW: 0.92, bottomY: 0.05, rockerY: 0.16, beltY: 0.54, fenderPeakY: 0.59, crownY: 0.56 },
        { z: -0.78, halfW: 0.91, lowerW: 0.88, bottomY: 0.05, rockerY: 0.16, beltY: 0.56, fenderPeakY: 0.59, crownY: 0.58, waistPinch: 0.45 },
        { z: 0.08, halfW: 0.9, lowerW: 0.87, bottomY: 0.05, rockerY: 0.16, beltY: 0.58, fenderPeakY: 0.6, crownY: 0.59, waistPinch: 0.5 },
        { z: 0.94, halfW: 0.96, lowerW: 0.91, bottomY: 0.05, rockerY: 0.18, beltY: 0.62, fenderPeakY: 0.65, crownY: 0.64 },
        { z: 1.38, halfW: 0.98, lowerW: 0.92, bottomY: 0.06, rockerY: 0.2, beltY: 0.64, fenderPeakY: 0.66, crownY: 0.64 },
        { z: 1.92, halfW: 0.92, lowerW: 0.87, bottomY: 0.08, rockerY: 0.22, beltY: 0.58, fenderPeakY: 0.6, crownY: 0.59 },
        { z: 2.24, halfW: 0.82, lowerW: 0.78, bottomY: 0.12, rockerY: 0.26, beltY: 0.51, fenderPeakY: 0.53, crownY: 0.52 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.84, baseW: 0.76, midW: 0.67, topW: 0.56, baseY: 0.55, midY: 0.6, topY: 0.62 },
        { z: -0.24, baseW: 0.74, midW: 0.64, topW: 0.52, baseY: 0.57, midY: 0.82, topY: 0.96 },
        { z: 0.48, baseW: 0.74, midW: 0.64, topW: 0.52, baseY: 0.59, midY: 0.82, topY: 0.96 },
        { z: 1.48, baseW: 0.75, midW: 0.66, topW: 0.56, baseY: 0.61, midY: 0.66, topY: 0.67 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.44),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'rally_coupe': {
      // Muscular rally stance with taller ground clearance and bold fenders
      const hull: HullStation[] = [
        { z: -2.2, halfW: 0.8, lowerW: 0.77, bottomY: 0.14, rockerY: 0.25, beltY: 0.42, fenderPeakY: 0.44, crownY: 0.45 },
        { z: -1.9, halfW: 0.91, lowerW: 0.88, bottomY: 0.09, rockerY: 0.23, beltY: 0.5, fenderPeakY: 0.54, crownY: 0.56 },
        { z: -1.36, halfW: 0.96, lowerW: 0.91, bottomY: 0.08, rockerY: 0.22, beltY: 0.57, fenderPeakY: 0.61, crownY: 0.63 },
        { z: -0.8, halfW: 0.91, lowerW: 0.87, bottomY: 0.08, rockerY: 0.22, beltY: 0.59, fenderPeakY: 0.62, crownY: 0.64, waistPinch: 0.25 },
        { z: 0.04, halfW: 0.9, lowerW: 0.87, bottomY: 0.08, rockerY: 0.22, beltY: 0.6, fenderPeakY: 0.63, crownY: 0.65, waistPinch: 0.3 },
        { z: 0.9, halfW: 0.94, lowerW: 0.89, bottomY: 0.08, rockerY: 0.22, beltY: 0.63, fenderPeakY: 0.66, crownY: 0.67 },
        { z: 1.34, halfW: 0.97, lowerW: 0.91, bottomY: 0.09, rockerY: 0.24, beltY: 0.65, fenderPeakY: 0.67, crownY: 0.68 },
        { z: 1.84, halfW: 0.9, lowerW: 0.85, bottomY: 0.11, rockerY: 0.27, beltY: 0.61, fenderPeakY: 0.63, crownY: 0.64 },
        { z: 2.16, halfW: 0.81, lowerW: 0.77, bottomY: 0.16, rockerY: 0.31, beltY: 0.55, fenderPeakY: 0.57, crownY: 0.58 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.76, baseW: 0.78, midW: 0.7, topW: 0.6, baseY: 0.59, midY: 0.65, topY: 0.68 },
        { z: -0.2, baseW: 0.76, midW: 0.68, topW: 0.58, baseY: 0.6, midY: 0.88, topY: 1.05 },
        { z: 0.58, baseW: 0.76, midW: 0.68, topW: 0.57, baseY: 0.61, midY: 0.89, topY: 1.04 },
        { z: 1.48, baseW: 0.76, midW: 0.69, topW: 0.6, baseY: 0.63, midY: 0.7, topY: 0.72 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.45),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'lmp_proto': {
      // Le Mans Hypercar: sculpted raised wheel pontoons flanking a low aerodynamic center nose + teardrop canopy
      const hull: HullStation[] = [
        { z: -2.28, halfW: 0.82, lowerW: 0.84, bottomY: 0.06, rockerY: 0.15, beltY: 0.3, fenderPeakY: 0.38, crownY: 0.24 },
        { z: -1.94, halfW: 0.95, lowerW: 0.93, bottomY: 0.05, rockerY: 0.15, beltY: 0.44, fenderPeakY: 0.56, crownY: 0.35 },
        { z: -1.36, halfW: 0.99, lowerW: 0.94, bottomY: 0.05, rockerY: 0.15, beltY: 0.54, fenderPeakY: 0.66, crownY: 0.44 },
        { z: -0.78, halfW: 0.9, lowerW: 0.88, bottomY: 0.05, rockerY: 0.15, beltY: 0.5, fenderPeakY: 0.59, crownY: 0.48, waistPinch: 0.95 },
        { z: 0.06, halfW: 0.9, lowerW: 0.88, bottomY: 0.05, rockerY: 0.15, beltY: 0.52, fenderPeakY: 0.59, crownY: 0.51, waistPinch: 0.9 },
        { z: 0.88, halfW: 0.98, lowerW: 0.93, bottomY: 0.05, rockerY: 0.17, beltY: 0.59, fenderPeakY: 0.67, crownY: 0.56 },
        { z: 1.36, halfW: 1.0, lowerW: 0.94, bottomY: 0.06, rockerY: 0.19, beltY: 0.61, fenderPeakY: 0.69, crownY: 0.58 },
        { z: 1.88, halfW: 0.94, lowerW: 0.89, bottomY: 0.08, rockerY: 0.21, beltY: 0.56, fenderPeakY: 0.61, crownY: 0.54 },
        { z: 2.24, halfW: 0.84, lowerW: 0.8, bottomY: 0.12, rockerY: 0.25, beltY: 0.48, fenderPeakY: 0.51, crownY: 0.47 },
      ];
      const cabin: CabinStation[] = [
        { z: -1.08, baseW: 0.6, midW: 0.52, topW: 0.42, baseY: 0.43, midY: 0.5, topY: 0.54 },
        { z: -0.44, baseW: 0.62, midW: 0.53, topW: 0.41, baseY: 0.47, midY: 0.78, topY: 0.92 },
        { z: 0.34, baseW: 0.61, midW: 0.52, topW: 0.4, baseY: 0.5, midY: 0.78, topY: 0.91 },
        { z: 1.18, baseW: 0.58, midW: 0.5, topW: 0.4, baseY: 0.54, midY: 0.61, topY: 0.63 },
      ];
      return {
        body: buildLoftedHull(hull, playerWheels, 0.44),
        cabinGlass: buildLoftedCabin(cabin),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }

    case 'traffic_coupe': {
      const hull: HullStation[] = [
        { z: -2.06, halfW: 0.74, lowerW: 0.71, bottomY: 0.12, rockerY: 0.22, beltY: 0.38, fenderPeakY: 0.4, crownY: 0.42 },
        { z: -1.8, halfW: 0.86, lowerW: 0.84, bottomY: 0.06, rockerY: 0.19, beltY: 0.47, fenderPeakY: 0.51, crownY: 0.52 },
        { z: -1.32, halfW: 0.91, lowerW: 0.86, bottomY: 0.05, rockerY: 0.18, beltY: 0.54, fenderPeakY: 0.58, crownY: 0.59 },
        { z: -0.7, halfW: 0.87, lowerW: 0.84, bottomY: 0.05, rockerY: 0.18, beltY: 0.57, fenderPeakY: 0.59, crownY: 0.61, waistPinch: 0.25 },
        { z: 0.02, halfW: 0.86, lowerW: 0.83, bottomY: 0.05, rockerY: 0.18, beltY: 0.58, fenderPeakY: 0.6, crownY: 0.61, waistPinch: 0.3 },
        { z: 0.78, halfW: 0.9, lowerW: 0.85, bottomY: 0.05, rockerY: 0.19, beltY: 0.61, fenderPeakY: 0.63, crownY: 0.64 },
        { z: 1.28, halfW: 0.92, lowerW: 0.86, bottomY: 0.06, rockerY: 0.2, beltY: 0.62, fenderPeakY: 0.64, crownY: 0.65 },
        { z: 1.82, halfW: 0.86, lowerW: 0.82, bottomY: 0.08, rockerY: 0.23, beltY: 0.57, fenderPeakY: 0.59, crownY: 0.6 },
        { z: 2.04, halfW: 0.76, lowerW: 0.73, bottomY: 0.13, rockerY: 0.27, beltY: 0.51, fenderPeakY: 0.53, crownY: 0.54 },
      ];
      const cabin: CabinStation[] = [
        { z: -0.78, baseW: 0.74, midW: 0.67, topW: 0.57, baseY: 0.56, midY: 0.61, topY: 0.64 },
        { z: -0.22, baseW: 0.72, midW: 0.64, topW: 0.54, baseY: 0.58, midY: 0.84, topY: 0.99 },
        { z: 0.5, baseW: 0.72, midW: 0.64, topW: 0.53, baseY: 0.59, midY: 0.84, topY: 0.98 },
        { z: 1.4, baseW: 0.74, midW: 0.66, topW: 0.58, baseY: 0.6, midY: 0.65, topY: 0.67 },
      ];
      return {
        body: buildLoftedHull(hull, trafficWheels, 0.41, 3),
        cabinGlass: buildLoftedCabin(cabin, 3),
        roofShell: buildContouredRoofShell(cabin, 1, 2),
      };
    }
  }
}

export function createProfiledTireGeometry(
  radius: number,
  width: number,
  segments = 32,
): THREE.LatheGeometry {
  const halfW = width * 0.5;
  const innerR = radius * 0.63;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, -halfW * 0.9),
    new THREE.Vector2(radius * 0.8, -halfW * 0.98),
    new THREE.Vector2(radius * 0.91, -halfW),
    new THREE.Vector2(radius * 0.985, -halfW * 0.76),
    new THREE.Vector2(radius, -halfW * 0.42),
    new THREE.Vector2(radius, halfW * 0.42),
    new THREE.Vector2(radius * 0.985, halfW * 0.76),
    new THREE.Vector2(radius * 0.91, halfW),
    new THREE.Vector2(radius * 0.8, halfW * 0.98),
    new THREE.Vector2(innerR, halfW * 0.9),
  ];
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export function createRimBarrelGeometry(radius: number, width: number): THREE.LatheGeometry {
  const halfW = width * 0.46;
  const lipR = radius * 0.64;
  const stepR = radius * 0.58;
  const innerR = radius * 0.48;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, -halfW),
    new THREE.Vector2(lipR, -halfW * 0.92),
    new THREE.Vector2(stepR, -halfW * 0.55),
    new THREE.Vector2(innerR, 0),
    new THREE.Vector2(stepR, halfW * 0.55),
    new THREE.Vector2(lipR, halfW * 0.92),
    new THREE.Vector2(innerR, halfW),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export function createSculptedSpokeGeometry(wheelRadius: number): THREE.ExtrudeGeometry {
  const len = wheelRadius * 0.56;
  const shape = new THREE.Shape();
  shape.moveTo(-0.022, wheelRadius * 0.14);
  shape.lineTo(0.022, wheelRadius * 0.14);
  shape.lineTo(0.015, len);
  shape.lineTo(-0.015, len);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.008,
  });
  geo.translate(0, 0, -0.018);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function createFenderArchLinerGeometry(radius = 0.42, outerRadius = 0.495): THREE.ExtrudeGeometry {
  const arch = new THREE.Shape();
  arch.absarc(0, 0, radius, -0.08, Math.PI + 0.08, false);
  arch.absarc(0, 0, outerRadius, Math.PI + 0.08, -0.08, true);
  arch.closePath();

  const geo = new THREE.ExtrudeGeometry(arch, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.025,
    curveSegments: 20,
  });
  geo.translate(0, 0, -0.06);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function createWheelWellDrumGeometry(radius = 0.42): THREE.ExtrudeGeometry {
  const drum = new THREE.Shape();
  drum.absarc(0, 0, radius, -0.1, Math.PI + 0.1, false);
  drum.closePath();

  const geo = new THREE.ExtrudeGeometry(drum, {
    depth: 0.3,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 18,
  });
  geo.translate(0, 0, -0.15);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function createAirfoilWingGeometry(
  span: number,
  chord = 0.3,
  thickness = 0.048,
): THREE.ExtrudeGeometry {
  const halfC = chord * 0.5;
  const airfoil = new THREE.Shape();
  // Smooth NACA-inspired cambered airfoil cross section in X-Y (extruded along X after rotateY)
  airfoil.moveTo(-halfC, 0.004);
  airfoil.quadraticCurveTo(-halfC * 0.35, thickness * 0.85, 0, thickness * 0.42);
  airfoil.quadraticCurveTo(halfC * 0.55, thickness * 0.08, halfC, -0.008);
  airfoil.quadraticCurveTo(halfC * 0.35, -thickness * 0.32, -halfC * 0.45, -thickness * 0.25);
  airfoil.quadraticCurveTo(-halfC * 0.92, -thickness * 0.15, -halfC, 0.004);
  airfoil.closePath();

  const geo = new THREE.ExtrudeGeometry(airfoil, {
    depth: span,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.015,
    curveSegments: 12,
  });
  geo.translate(0, 0, -span * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createSweptStrutGeometry(
  height = 0.28,
  bottomChord = 0.2,
  topChord = 0.14,
  thickness = 0.045,
): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-bottomChord * 0.5, 0);
  s.lineTo(bottomChord * 0.5, 0);
  s.quadraticCurveTo(bottomChord * 0.36, height * 0.55, topChord * 0.5 + 0.05, height);
  s.lineTo(-topChord * 0.5 + 0.05, height);
  s.quadraticCurveTo(-bottomChord * 0.22, height * 0.48, -bottomChord * 0.5, 0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    curveSegments: 10,
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createWingEndplateGeometry(
  length = 0.36,
  height = 0.2,
  thickness = 0.036,
): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  const hl = length * 0.5;
  const hh = height * 0.5;
  s.moveTo(-hl, -hh * 0.72);
  s.lineTo(hl * 0.85, -hh);
  s.quadraticCurveTo(hl, -hh, hl, -hh * 0.55);
  s.lineTo(hl * 0.74, hh * 0.9);
  s.quadraticCurveTo(hl * 0.5, hh, -hl * 0.65, hh * 0.75);
  s.quadraticCurveTo(-hl, hh * 0.62, -hl, -hh * 0.72);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.007,
    bevelThickness: 0.007,
    curveSegments: 8,
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createBeveledPlateGeometry(
  width: number,
  height: number,
  depth: number,
  cornerRadius = 0.02,
  bevel = 0.012,
): THREE.ExtrudeGeometry {
  const hw = Math.max(0.02, width * 0.5 - bevel);
  const hh = Math.max(0.01, height * 0.5 - bevel);
  const r = Math.min(cornerRadius, hw * 0.85, hh * 0.85);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  shape.closePath();

  const innerDepth = Math.max(0.01, depth - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 8,
  });
  geo.translate(0, 0, -innerDepth * 0.5);
  return geo;
}

export function createAeroSplitterGeometry(width: number, depth: number): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw * 0.92, depth * 0.45);
  shape.lineTo(hw * 0.92, depth * 0.45);
  shape.quadraticCurveTo(hw, 0, hw * 0.86, -depth * 0.42);
  shape.quadraticCurveTo(0, -depth * 0.56, -hw * 0.86, -depth * 0.42);
  shape.quadraticCurveTo(-hw, 0, -hw * 0.92, depth * 0.45);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.016);
  geo.rotateX(Math.PI / 2);
  return geo;
}

export function createAeroMirrorGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, -0.028);
  shape.quadraticCurveTo(0.02, -0.04, 0.085, -0.016);
  shape.quadraticCurveTo(0.1, 0.015, 0.065, 0.038);
  shape.quadraticCurveTo(-0.02, 0.042, -0.085, 0.014);
  shape.quadraticCurveTo(-0.1, -0.008, -0.08, -0.028);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.014,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.0475);
  return geo;
}

export function createDorsalFinGeometry(
  length = 1.15,
  height = 0.24,
  thickness = 0.038,
): THREE.ExtrudeGeometry {
  const hl = length * 0.5;
  const s = new THREE.Shape();
  s.moveTo(-hl, 0);
  s.lineTo(hl, -0.08);
  s.lineTo(hl * 0.82, height * 0.45);
  s.quadraticCurveTo(0, height * 0.92, -hl * 0.86, height);
  s.lineTo(-hl, height * 0.72);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    curveSegments: 10,
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createRoofScoopGeometry(
  width = 0.28,
  height = 0.14,
  length = 0.7,
): THREE.ExtrudeGeometry {
  const hl = length * 0.5;
  const s = new THREE.Shape();
  s.moveTo(-hl, 0);
  s.lineTo(hl, -0.01);
  s.quadraticCurveTo(hl * 0.3, height * 0.5, -hl * 0.65, height);
  s.quadraticCurveTo(-hl * 0.96, height * 0.95, -hl, height * 0.25);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.02,
    curveSegments: 10,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createSideIntakePodGeometry(
  length = 0.95,
  height = 0.24,
  depth = 0.14,
): THREE.ExtrudeGeometry {
  const hl = length * 0.5;
  const hh = height * 0.5;
  const s = new THREE.Shape();
  s.moveTo(-hl * 0.94, -hh * 0.85);
  s.quadraticCurveTo(0, -hh, hl * 0.76, -hh * 0.7);
  s.quadraticCurveTo(hl, 0, hl * 0.82, hh * 0.7);
  s.quadraticCurveTo(0, hh, -hl * 0.98, hh * 0.82);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.02,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(-Math.PI / 2);
  return geo;
}
