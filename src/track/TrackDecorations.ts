import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TextureBundle } from '../utils/TextureFactory';

const BUILDING_PAIRS = 14;
const BUILDING_SPACING = 28;
const PALM_COUNT = 56;
const PALM_SPACING = 14;

interface PalmSlot {
  x: number;
  z: number;
  scale: number;
  rotY: number;
  leanX: number;
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

    // Inner rising frond segment
    const inner = new THREE.BoxGeometry(0.46, 0.06, 1.85);
    inner.rotateX(-0.26);
    inner.translate(0, 0.22, 0.95);
    inner.rotateY(angle);
    inner.translate(topX, topY, 0);
    fronds.push(inner);

    // Outer drooping frond tip
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

export class TrackDecorations {
  public readonly group = new THREE.Group();

  private readonly buildings: THREE.Group[] = [];
  private readonly palmTrunks: THREE.InstancedMesh;
  private readonly palmCrowns: THREE.InstancedMesh;
  private readonly palmSlots: PalmSlot[] = [];
  private readonly dummy = new THREE.Object3D();

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(textures: TextureBundle) {
    const parapetMat = new THREE.MeshStandardMaterial({
      color: 0x3b263f,
      metalness: 0.25,
      roughness: 0.65,
      envMapIntensity: 0.3,
    });
    const hotelCoralMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsCyan,
      emissiveMap: textures.buildingWindowsCyan,
      emissive: new THREE.Color(0xf59e56),
      emissiveIntensity: 0.28,
      roughness: 0.62,
      metalness: 0.22,
      envMapIntensity: 0.25,
    });
    const hotelLavenderMat = new THREE.MeshStandardMaterial({
      map: textures.buildingWindowsMagenta,
      emissiveMap: textures.buildingWindowsMagenta,
      emissive: new THREE.Color(0x9d4edd),
      emissiveIntensity: 0.26,
      roughness: 0.62,
      metalness: 0.22,
      envMapIntensity: 0.25,
    });
    const signCyanMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.72,
      roughness: 0.3,
    });
    const signCoralMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.materials.push(parapetMat, hotelCoralMat, hotelLavenderMat, signCyanMat, signCoralMat);
    this.geometries.push(boxGeo);

    // Art Deco Miami hotels & coastal strip plazas along the boulevard
    for (let i = 0; i < BUILDING_PAIRS * 2; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const idx = Math.floor(i / 2);
      const bGroup = new THREE.Group();

      const isStripPlaza = idx % 3 === 0;
      const width = isStripPlaza ? 14 + (idx % 4) * 2 : 11 + ((idx * 5) % 8);
      const depth = isStripPlaza ? 18 : 13 + ((idx * 3) % 7);
      const height = isStripPlaza ? 11 + (idx % 4) * 2 : 22 + ((idx * 11) % 28);

      const body = new THREE.Mesh(
        boxGeo,
        idx % 2 === 0 ? hotelCoralMat : hotelLavenderMat,
      );
      body.scale.set(width, height, depth);
      body.position.y = height * 0.5 - 6;
      bGroup.add(body);

      // Stepped Art Deco parapet crown
      const parapet = new THREE.Mesh(boxGeo, parapetMat);
      parapet.scale.set(width * 0.72, 2.8, depth * 0.72);
      parapet.position.y = height - 6 + 1.4;
      bGroup.add(parapet);

      // Rooftop / awning neon hotel trim
      const signTrim = new THREE.Mesh(boxGeo, idx % 2 === 0 ? signCyanMat : signCoralMat);
      signTrim.scale.set(width * 0.58, 0.42, 0.42);
      signTrim.position.set(
        -side * (width * 0.22),
        isStripPlaza ? height - 7.5 : height - 5.2,
        depth * 0.38,
      );
      bGroup.add(signTrim);

      const xOffset = side * (17.5 + width * 0.5 + (idx % 3) * 5.5);
      const zPos = 24 - idx * BUILDING_SPACING;
      bGroup.position.set(xOffset, 0, zPos);

      this.group.add(bGroup);
      this.buildings.push(bGroup);
    }

    // Instanced palm trees flanking the highway shoulders (only 2 draw calls for 56 trees!)
    const trunkGeo = createPalmTrunkGeometry();
    const crownGeo = createPalmCrownGeometry();
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a58,
      roughness: 0.85,
      metalness: 0.05,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x3f2e5e,
      roughness: 0.72,
      metalness: 0.08,
      emissive: 0x6b3a6e,
      emissiveIntensity: 0.26,
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
      const x = side * (9.3 + (row % 3) * 0.65);
      const z = 20 - row * PALM_SPACING;
      const scale = 0.88 + ((row * 7) % 5) * 0.09;
      const rotY = side < 0 ? 0.3 + (row % 5) * 0.4 : Math.PI - 0.3 - (row % 5) * 0.4;
      const leanX = side * -0.06;

      this.palmSlots.push({ x, z, scale, rotY, leanX });
    }

    this.syncPalmMatrices();
    this.group.add(this.palmTrunks, this.palmCrowns);
  }

  private syncPalmMatrices(): void {
    for (let i = 0; i < PALM_COUNT; i++) {
      const slot = this.palmSlots[i];
      this.dummy.position.set(slot.x, -0.1, slot.z);
      this.dummy.rotation.set(0, slot.rotY, slot.leanX);
      this.dummy.scale.setScalar(slot.scale);
      this.dummy.updateMatrix();
      this.palmTrunks.setMatrixAt(i, this.dummy.matrix);
      this.palmCrowns.setMatrixAt(i, this.dummy.matrix);
    }
    this.palmTrunks.instanceMatrix.needsUpdate = true;
    this.palmCrowns.instanceMatrix.needsUpdate = true;
  }

  public update(dz: number): void {
    const totalBuildingDepth = BUILDING_PAIRS * BUILDING_SPACING;
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      b.position.z += dz * 0.92;
      if (b.position.z > 42) {
        b.position.z -= totalBuildingDepth;
      }
    }

    const totalPalmDepth = (PALM_COUNT / 2) * PALM_SPACING;
    for (let i = 0; i < PALM_COUNT; i++) {
      const slot = this.palmSlots[i];
      slot.z += dz;
      if (slot.z > 28) {
        slot.z -= totalPalmDepth;
      }
    }
    this.syncPalmMatrices();
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
