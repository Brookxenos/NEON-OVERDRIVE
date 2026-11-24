import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TextureBundle } from '../utils/TextureFactory';

const BUILDING_PAIRS = 30;
const BUILDING_SPACING = 28;
const PALM_COUNT = 120;
const PALM_SPACING = 14;
const TREE_COUNT = 120;
const TREE_SPACING = 14;

interface PalmSlot {
  x: number;
  z: number;
  scale: number;
  rotY: number;
  leanX: number;
}

interface TreeSlot {
  x: number;
  z: number;
  scale: number;
  rotY: number;
}

function makePartBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return geo;
}

function createPalmTrunkGeometry(): THREE.BufferGeometry {
  const segments: THREE.BufferGeometry[] = [];
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const rBottom = 0.28 - t0 * 0.14;
    const rTop = 0.28 - t1 * 0.14;
    const h = 1.45;
    const seg = new THREE.CylinderGeometry(rTop, rBottom, h, 6);
    const curveX = Math.pow(t0, 1.5) * 0.55;
    seg.rotateZ(-t0 * 0.16);
    seg.translate(curveX, i * 1.38 + h * 0.5, 0);
    segments.push(seg);
  }
  const merged = mergeGeometries(segments);
  segments.forEach((s) => s.dispose());
  return merged;
}

function createPalmCrownGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const frondCount = 7;
  const topX = 0.52;
  const topY = 8.25;

  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + 0.25;

    const inner = new THREE.BoxGeometry(0.46, 0.06, 1.85);
    inner.rotateX(-0.26);
    inner.translate(0, 0.22, 0.95);
    inner.rotateY(angle);
    inner.translate(topX, topY, 0);
    fronds.push(inner);

    const outer = new THREE.BoxGeometry(0.32, 0.05, 1.65);
    outer.rotateX(0.52);
    outer.translate(0, 0.02, 2.45);
    outer.rotateY(angle);
    outer.translate(topX, topY, 0);
    fronds.push(outer);
  }

  const merged = mergeGeometries(fronds);
  fronds.forEach((f) => f.dispose());
  return merged;
}

function createStreetTreeTrunkGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const main = new THREE.CylinderGeometry(0.18, 0.26, 2.5, 6);
  main.translate(0, 1.25, 0);
  parts.push(main);

  const branchA = new THREE.CylinderGeometry(0.08, 0.13, 1.2, 5);
  branchA.rotateZ(0.48);
  branchA.translate(-0.35, 2.15, 0.1);
  parts.push(branchA);

  const branchB = new THREE.CylinderGeometry(0.08, 0.12, 1.15, 5);
  branchB.rotateZ(-0.44);
  branchB.translate(0.34, 2.2, -0.1);
  parts.push(branchB);

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function createStreetTreeCanopyGeometry(): THREE.BufferGeometry {
  const blobs: THREE.BufferGeometry[] = [];
  const specs: Array<[number, number, number, number]> = [
    [1.65, 0, 3.25, 0],
    [1.25, -0.9, 2.85, 0.4],
    [1.25, 0.9, 2.9, -0.35],
    [1.15, 0.1, 3.9, 0.25],
  ];
  for (const [r, x, y, z] of specs) {
    const s = new THREE.IcosahedronGeometry(r, 1);
    s.scale(1.12, 0.85, 1.05);
    s.translate(x, y, z);
    blobs.push(s);
  }
  const merged = mergeGeometries(blobs);
  blobs.forEach((b) => b.dispose());
  return merged;
}

function createBuildingTrimArchetype(kind: 'balcony_tower' | 'art_deco_hotel' | 'coastal_plaza'): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  if (kind === 'balcony_tower') {
    for (let floor = 1; floor <= 6; floor++) {
      const y = floor / 7;
      parts.push(makePartBox(1.09, 0.022, 1.09, 0, y, 0));
    }
    parts.push(makePartBox(1.05, 0.04, 1.05, 0, 1.01, 0));
    parts.push(makePartBox(0.48, 0.09, 0.44, 0, 1.055, -0.08));
  } else if (kind === 'art_deco_hotel') {
    parts.push(makePartBox(1.06, 0.05, 1.06, 0, 1.0, 0));
    parts.push(makePartBox(0.68, 0.11, 0.72, 0, 1.06, 0));
    parts.push(makePartBox(0.36, 0.09, 0.44, 0, 1.13, 0));
    parts.push(makePartBox(1.06, 0.024, 1.06, 0, 0.56, 0));
    parts.push(makePartBox(1.12, 0.032, 1.12, 0, 0.24, 0));
  } else {
    parts.push(makePartBox(1.06, 0.05, 1.06, 0, 1.0, 0));
    parts.push(makePartBox(0.76, 0.14, 0.74, 0, 1.07, 0));
    parts.push(makePartBox(1.14, 0.04, 1.14, 0, 0.28, 0));
    parts.push(makePartBox(1.05, 0.025, 1.05, 0, 0.64, 0));
  }

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

export class TrackDecorations {
  public readonly group = new THREE.Group();

  private readonly buildings: THREE.Group[] = [];
  private readonly palmTrunks: THREE.InstancedMesh;
  private readonly palmCrowns: THREE.InstancedMesh;
  private readonly palmSlots: PalmSlot[] = [];
  private readonly treeTrunks: THREE.InstancedMesh;
  private readonly treeCanopies: THREE.InstancedMesh;
  private readonly treeSlots: TreeSlot[] = [];
  private readonly instanceTransform = new THREE.Object3D();

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(textures: TextureBundle) {
    const stuccoCreamMat = new THREE.MeshStandardMaterial({
      color: 0xfce7cf,
      roughness: 0.72,
      metalness: 0.04,
      envMapIntensity: 0.25,
    });
    const trimCoralMat = new THREE.MeshStandardMaterial({
      color: 0xf4c8ae,
      roughness: 0.7,
      metalness: 0.04,
      envMapIntensity: 0.25,
    });
    const balconyTowerMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsCyan,
      roughness: 0.58,
      metalness: 0.14,
      envMapIntensity: 0.3,
    });
    const artDecoHotelMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsMagenta,
      roughness: 0.62,
      metalness: 0.1,
      envMapIntensity: 0.25,
    });
    const awningMat = new THREE.MeshStandardMaterial({
      color: 0xc26d85,
      roughness: 0.68,
      metalness: 0.06,
    });
    const hotelSignMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);
    const towerTrimGeo = createBuildingTrimArchetype('balcony_tower');
    const decoTrimGeo = createBuildingTrimArchetype('art_deco_hotel');
    const plazaTrimGeo = createBuildingTrimArchetype('coastal_plaza');

    this.materials.push(
      stuccoCreamMat,
      trimCoralMat,
      balconyTowerMat,
      artDecoHotelMat,
      awningMat,
      hotelSignMat,
    );
    this.geometries.push(boxGeo, towerTrimGeo, decoTrimGeo, plazaTrimGeo);

    for (let i = 0; i < BUILDING_PAIRS * 2; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const idx = Math.floor(i / 2);
      const bGroup = new THREE.Group();

      const archetypeRoll = idx % 3;
      const isBalconyTower = archetypeRoll === 1;
      const isPlaza = archetypeRoll === 0;

      const width = isPlaza ? 14 + (idx % 4) * 2 : 12 + ((idx * 5) % 7);
      const depth = isPlaza ? 17 : 13 + ((idx * 3) % 7);
      const height = isPlaza ? 13 + (idx % 4) * 2.5 : isBalconyTower ? 28 + ((idx * 11) % 24) : 17 + ((idx * 7) % 14);

      const body = new THREE.Mesh(
        boxGeo,
        isBalconyTower ? balconyTowerMat : artDecoHotelMat,
      );
      body.scale.set(width, height, depth);
      body.position.y = -1.2;
      bGroup.add(body);

      const trimGeo = isBalconyTower
        ? towerTrimGeo
        : isPlaza
          ? plazaTrimGeo
          : decoTrimGeo;
      const trim = new THREE.Mesh(
        trimGeo,
        idx % 2 === 0 ? stuccoCreamMat : trimCoralMat,
      );
      trim.scale.set(width, height, depth);
      trim.position.y = -1.2;
      bGroup.add(trim);

      const awning = new THREE.Mesh(boxGeo, awningMat);
      awning.scale.set(1.3, 0.55, depth * 0.46);
      awning.position.set(-side * (width * 0.5 + 0.55), 3.1, 0);
      bGroup.add(awning);

      if (!isBalconyTower) {
        const signFascia = new THREE.Mesh(boxGeo, hotelSignMat);
        signFascia.scale.set(0.32, 0.65, width * 0.42);
        signFascia.position.set(-side * (width * 0.5 + 0.18), height - 3.6, 0);
        bGroup.add(signFascia);
      }

      const xOffset = side * (19.5 + width * 0.5 + (idx % 3) * 4.5);
      const zPos = 416 - idx * BUILDING_SPACING;
      bGroup.position.set(xOffset, 0, zPos);

      this.group.add(bGroup);
      this.buildings.push(bGroup);
    }

    const trunkGeo = createPalmTrunkGeometry();
    const crownGeo = createPalmCrownGeometry();
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x7d5d52,
      roughness: 0.88,
      metalness: 0.04,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x456b49,
      roughness: 0.72,
      metalness: 0.05,
      emissive: 0x2c4228,
      emissiveIntensity: 0.22,
    });

    this.geometries.push(trunkGeo, crownGeo);
    this.materials.push(trunkMat, crownMat);

    this.palmTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, PALM_COUNT);
    this.palmCrowns = new THREE.InstancedMesh(crownGeo, crownMat, PALM_COUNT);
    this.palmTrunks.frustumCulled = false;
    this.palmCrowns.frustumCulled = false;

    for (let i = 0; i < PALM_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const x = side * (9.5 + (row % 3) * 0.65);
      const z = 416 - row * PALM_SPACING;
      const scale = 0.88 + ((row * 7) % 5) * 0.09;
      const rotY = side < 0 ? 0.3 + (row % 5) * 0.4 : Math.PI - 0.3 - (row % 5) * 0.4;
      const leanX = side * -0.06;

      this.palmSlots.push({ x, z, scale, rotY, leanX });
    }

    const treeTrunkGeo = createStreetTreeTrunkGeometry();
    const treeCanopyGeo = createStreetTreeCanopyGeometry();
    const treeTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x6b524b,
      roughness: 0.9,
    });
    const treeCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x567a58,
      roughness: 0.78,
      emissive: 0x384d39,
      emissiveIntensity: 0.18,
    });
    this.geometries.push(treeTrunkGeo, treeCanopyGeo);
    this.materials.push(treeTrunkMat, treeCanopyMat);

    this.treeTrunks = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, TREE_COUNT);
    this.treeCanopies = new THREE.InstancedMesh(treeCanopyGeo, treeCanopyMat, TREE_COUNT);
    this.treeTrunks.frustumCulled = false;
    this.treeCanopies.frustumCulled = false;

    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const x = side * (13.4 + (row % 3) * 1.4);
      const z = 410 - row * TREE_SPACING;
      const scale = 0.8 + ((row * 3) % 5) * 0.12;
      const rotY = (row * 1.7 + side) % (Math.PI * 2);
      this.treeSlots.push({ x, z, scale, rotY });
    }

    this.syncPalmMatrices();
    this.syncTreeMatrices();
    this.group.add(this.palmTrunks, this.palmCrowns, this.treeTrunks, this.treeCanopies);
  }

  private syncPalmMatrices(): void {
    for (let i = 0; i < PALM_COUNT; i++) {
      const slot = this.palmSlots[i];
      this.instanceTransform.position.set(slot.x, -0.1, slot.z);
      this.instanceTransform.rotation.set(0, slot.rotY, slot.leanX);
      this.instanceTransform.scale.setScalar(slot.scale);
      this.instanceTransform.updateMatrix();
      this.palmTrunks.setMatrixAt(i, this.instanceTransform.matrix);
      this.palmCrowns.setMatrixAt(i, this.instanceTransform.matrix);
    }
    this.palmTrunks.instanceMatrix.needsUpdate = true;
    this.palmCrowns.instanceMatrix.needsUpdate = true;
  }

  private syncTreeMatrices(): void {
    for (let i = 0; i < TREE_COUNT; i++) {
      const slot = this.treeSlots[i];
      this.instanceTransform.position.set(slot.x, -0.2, slot.z);
      this.instanceTransform.rotation.set(0, slot.rotY, 0);
      this.instanceTransform.scale.setScalar(slot.scale);
      this.instanceTransform.updateMatrix();
      this.treeTrunks.setMatrixAt(i, this.instanceTransform.matrix);
      this.treeCanopies.setMatrixAt(i, this.instanceTransform.matrix);
    }
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeCanopies.instanceMatrix.needsUpdate = true;
  }

  public update(dz: number): void {
    const totalBuildingDepth = BUILDING_PAIRS * BUILDING_SPACING;
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      b.position.z += dz * 0.92;
      if (b.position.z > 420) {
        b.position.z -= totalBuildingDepth;
      }
    }

    const totalPalmDepth = (PALM_COUNT / 2) * PALM_SPACING;
    for (let i = 0; i < PALM_COUNT; i++) {
      const slot = this.palmSlots[i];
      slot.z += dz;
      if (slot.z > 420) {
        slot.z -= totalPalmDepth;
      }
    }
    this.syncPalmMatrices();

    const totalTreeDepth = (TREE_COUNT / 2) * TREE_SPACING;
    for (let i = 0; i < TREE_COUNT; i++) {
      const slot = this.treeSlots[i];
      slot.z += dz;
      if (slot.z > 420) {
        slot.z -= totalTreeDepth;
      }
    }
    this.syncTreeMatrices();
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
