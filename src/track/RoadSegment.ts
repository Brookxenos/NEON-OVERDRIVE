import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANE_WIDTH, ROAD_WIDTH, SEGMENT_LENGTH } from '../utils/Constants';
import { TextureBundle } from '../utils/TextureFactory';

export interface RoadSegmentMaterials {
  roadMat: THREE.MeshStandardMaterial;
  curbMat: THREE.MeshStandardMaterial;
  sidewalkMat: THREE.MeshStandardMaterial;
  cyanStripMat: THREE.MeshStandardMaterial;
  laneDashMat: THREE.MeshStandardMaterial;
  studMat: THREE.MeshBasicMaterial;
  gantrySteelMat: THREE.MeshStandardMaterial;
  highwaySignMat: THREE.MeshStandardMaterial;
  theBrookFaceMat: THREE.MeshStandardMaterial;
  signalRedMat: THREE.MeshStandardMaterial;
  signalGreenMat: THREE.MeshStandardMaterial;
  amberLampMat: THREE.MeshStandardMaterial;
  coralTrimMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export interface RoadSegmentGeometries {
  deckGeo: THREE.BoxGeometry;
  curbsGeo: THREE.BufferGeometry;
  sidewalksGeo: THREE.BufferGeometry;
  topRailsGeo: THREE.BufferGeometry;
  dashesGeo: THREE.BufferGeometry;
  studsGeo: THREE.BufferGeometry;
  streetlightsGeo: THREE.BufferGeometry;
  lampHeadsGeo: THREE.BufferGeometry;
  gantryStructureGeo: THREE.BufferGeometry;
  gantrySignGeo: THREE.BoxGeometry;
  gantrySignFaceGeo: THREE.PlaneGeometry;
  signalHousingGeo: THREE.BoxGeometry;
  signalLensGeo: THREE.CylinderGeometry;
  archTrimGeo: THREE.BoxGeometry;
  sideSignBoardGeo: THREE.BoxGeometry;
  dispose: () => void;
}

function makeTransformedBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rotZ = 0,
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (rotZ !== 0) geo.rotateZ(rotZ);
  geo.translate(x, y, z);
  return geo;
}

export class RoadSegment {
  public readonly group = new THREE.Group();
  private readonly gateStripMat: THREE.MeshStandardMaterial | null = null;
  private readonly index: number;

  public static createSharedMaterials(textures: TextureBundle): RoadSegmentMaterials {
    const roadMat = new THREE.MeshStandardMaterial({
      map: textures.roadAlbedo,
      roughnessMap: textures.roadRoughness,
      normalMap: textures.roadNormal,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughness: 0.86,
      metalness: 0.08,
      envMapIntensity: 0.18,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xb8a8ae,
      metalness: 0.08,
      roughness: 0.78,
      envMapIntensity: 0.2,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x9b8a94,
      metalness: 0.05,
      roughness: 0.85,
      envMapIntensity: 0.16,
    });
    const cyanStripMat = new THREE.MeshStandardMaterial({
      color: 0xe6c3a5,
      emissive: 0x9a6b48,
      emissiveIntensity: 0.22,
      roughness: 0.55,
    });
    const laneDashMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.24,
      roughness: 0.45,
    });
    const studMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const gantrySteelMat = new THREE.MeshStandardMaterial({
      color: 0x747888,
      metalness: 0.42,
      roughness: 0.48,
      envMapIntensity: 0.3,
    });
    const highwaySignMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x047857,
      emissiveIntensity: 0.32,
      roughness: 0.45,
      metalness: 0.18,
    });
    const theBrookFaceMat = new THREE.MeshStandardMaterial({
      map: textures.theBrookSign,
      emissiveMap: textures.theBrookSign,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.48,
      roughness: 0.38,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const signalRedMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xe11d48,
      emissiveIntensity: 1.0,
      roughness: 0.25,
    });
    const signalGreenMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.0,
      roughness: 0.25,
    });
    const amberLampMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.25,
    });
    const coralTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd9b5a0,
      emissive: 0x8d6352,
      emissiveIntensity: 0.2,
      roughness: 0.55,
    });

    return {
      roadMat,
      curbMat,
      sidewalkMat,
      cyanStripMat,
      laneDashMat,
      studMat,
      gantrySteelMat,
      highwaySignMat,
      theBrookFaceMat,
      signalRedMat,
      signalGreenMat,
      amberLampMat,
      coralTrimMat,
      dispose: () => {
        roadMat.dispose();
        curbMat.dispose();
        sidewalkMat.dispose();
        cyanStripMat.dispose();
        laneDashMat.dispose();
        studMat.dispose();
        gantrySteelMat.dispose();
        highwaySignMat.dispose();
        theBrookFaceMat.dispose();
        signalRedMat.dispose();
        signalGreenMat.dispose();
        amberLampMat.dispose();
        coralTrimMat.dispose();
      },
    };
  }

  public static createSharedGeometries(): RoadSegmentGeometries {
    const deckGeo = new THREE.BoxGeometry(ROAD_WIDTH, 0.65, SEGMENT_LENGTH);

    // Merge left + right curbs
    const curbParts = [-1, 1].map((side) =>
      makeTransformedBox(0.72, 0.62, SEGMENT_LENGTH, side * (ROAD_WIDTH * 0.5 + 0.36), 0.04, 0),
    );
    const curbsGeo = mergeGeometries(curbParts);
    curbParts.forEach((g) => g.dispose());

    // Merge coastal boulevard sidewalks flanking the road
    const walkParts = [-1, 1].map((side) =>
      makeTransformedBox(4.8, 0.45, SEGMENT_LENGTH, side * (ROAD_WIDTH * 0.5 + 3.1), -0.06, 0),
    );
    const sidewalksGeo = mergeGeometries(walkParts);
    walkParts.forEach((g) => g.dispose());

    // Merge left + right curb neon/accent strips
    const railParts = [-1, 1].map((side) =>
      makeTransformedBox(0.12, 0.1, SEGMENT_LENGTH, side * (ROAD_WIDTH * 0.5 + 0.04), 0.36, 0),
    );
    const topRailsGeo = mergeGeometries(railParts);
    railParts.forEach((g) => g.dispose());

    // Merge all lane dashes and reflective studs per segment (12 -> 1 draw call each)
    const dashParts: THREE.BufferGeometry[] = [];
    const studParts: THREE.BufferGeometry[] = [];
    for (const dividerX of [-LANE_WIDTH * 0.5, LANE_WIDTH * 0.5]) {
      for (let d = -12; d <= 12; d += 9) {
        dashParts.push(makeTransformedBox(0.15, 0.035, 3.6, dividerX, 0.018, d));
        studParts.push(makeTransformedBox(0.16, 0.055, 0.24, dividerX, 0.028, d + 4.5));
      }
    }
    const dashesGeo = mergeGeometries(dashParts);
    const studsGeo = mergeGeometries(studParts);
    dashParts.forEach((g) => g.dispose());
    studParts.forEach((g) => g.dispose());

    // Merge coastal boulevard streetlight poles + curved arms + heads
    const lightParts: THREE.BufferGeometry[] = [];
    const headParts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      for (const pz of [-9, 9]) {
        const baseX = side * (ROAD_WIDTH * 0.5 + 1.25);
        lightParts.push(makeTransformedBox(0.22, 5.2, 0.22, baseX, 2.6, pz));
        lightParts.push(
          makeTransformedBox(1.55, 0.14, 0.18, baseX - side * 0.7, 5.15, pz, side * 0.12),
        );
        headParts.push(makeTransformedBox(0.55, 0.1, 0.24, baseX - side * 1.25, 5.06, pz));
      }
    }
    const streetlightsGeo = mergeGeometries(lightParts);
    const lampHeadsGeo = mergeGeometries(headParts);
    lightParts.forEach((g) => g.dispose());
    headParts.forEach((g) => g.dispose());

    // Merge highway gantry pillars + top truss
    const gantryParts: THREE.BufferGeometry[] = [
      makeTransformedBox(0.56, 7.6, 0.68, -(ROAD_WIDTH * 0.5 + 1.5), 3.6, 0),
      makeTransformedBox(0.56, 7.6, 0.68, ROAD_WIDTH * 0.5 + 1.5, 3.6, 0),
      makeTransformedBox(ROAD_WIDTH + 3.8, 0.44, 0.72, 0, 7.25, 0),
    ];
    const gantryStructureGeo = mergeGeometries(gantryParts);
    gantryParts.forEach((g) => g.dispose());

    const gantrySignGeo = new THREE.BoxGeometry(6.8, 1.45, 0.16);
    const gantrySignFaceGeo = new THREE.PlaneGeometry(6.65, 1.38);
    const signalHousingGeo = new THREE.BoxGeometry(0.46, 1.26, 0.32);
    const signalLensGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14);
    signalLensGeo.rotateX(Math.PI / 2);
    const archTrimGeo = new THREE.BoxGeometry(6.8, 0.1, 0.22);
    const sideSignBoardGeo = new THREE.BoxGeometry(0.16, 1.9, 4.4);

    return {
      deckGeo,
      curbsGeo,
      sidewalksGeo,
      topRailsGeo,
      dashesGeo,
      studsGeo,
      streetlightsGeo,
      lampHeadsGeo,
      gantryStructureGeo,
      gantrySignGeo,
      gantrySignFaceGeo,
      signalHousingGeo,
      signalLensGeo,
      archTrimGeo,
      sideSignBoardGeo,
      dispose: () => {
        deckGeo.dispose();
        curbsGeo.dispose();
        sidewalksGeo.dispose();
        topRailsGeo.dispose();
        dashesGeo.dispose();
        studsGeo.dispose();
        streetlightsGeo.dispose();
        lampHeadsGeo.dispose();
        gantryStructureGeo.dispose();
        gantrySignGeo.dispose();
        gantrySignFaceGeo.dispose();
        signalHousingGeo.dispose();
        signalLensGeo.dispose();
        archTrimGeo.dispose();
        sideSignBoardGeo.dispose();
      },
    };
  }

  constructor(
    index: number,
    mats: RoadSegmentMaterials,
    geos: RoadSegmentGeometries,
  ) {
    this.index = index;
    this.group.position.z = 376 - index * SEGMENT_LENGTH;

    const deck = new THREE.Mesh(geos.deckGeo, mats.roadMat);
    deck.position.y = -0.325;
    deck.receiveShadow = true;
    this.group.add(deck);

    const curbs = new THREE.Mesh(geos.curbsGeo, mats.curbMat);
    curbs.receiveShadow = true;
    this.group.add(curbs);

    const sidewalks = new THREE.Mesh(geos.sidewalksGeo, mats.sidewalkMat);
    sidewalks.receiveShadow = true;
    this.group.add(sidewalks);

    const rails = new THREE.Mesh(
      geos.topRailsGeo,
      index % 2 === 0 ? mats.cyanStripMat : mats.coralTrimMat,
    );
    this.group.add(rails);

    this.group.add(new THREE.Mesh(geos.dashesGeo, mats.laneDashMat));
    this.group.add(new THREE.Mesh(geos.studsGeo, mats.studMat));
    this.group.add(new THREE.Mesh(geos.streetlightsGeo, mats.gantrySteelMat));
    this.group.add(new THREE.Mesh(geos.lampHeadsGeo, mats.amberLampMat));

    if (index % 3 === 0) {
      this.group.add(new THREE.Mesh(geos.gantryStructureGeo, mats.gantrySteelMat));

      const signBoard = new THREE.Mesh(geos.gantrySignGeo, mats.highwaySignMat);
      signBoard.position.set(0, 7.15, 0.36);
      this.group.add(signBoard);

      const signFace = new THREE.Mesh(geos.gantrySignFaceGeo, mats.theBrookFaceMat);
      signFace.position.set(0, 7.15, 0.45);
      this.group.add(signFace);

      // Flanking 3-lamp traffic signal pods on the overhead traffic light bar
      const signalMats = [mats.signalRedMat, mats.amberLampMat, mats.signalGreenMat];
      for (const sideX of [-4.15, 4.15]) {
        const housing = new THREE.Mesh(geos.signalHousingGeo, mats.gantrySteelMat);
        housing.position.set(sideX, 7.1, 0.36);
        this.group.add(housing);

        for (let l = 0; l < 3; l++) {
          const lens = new THREE.Mesh(geos.signalLensGeo, signalMats[l]);
          lens.position.set(sideX, 7.46 - l * 0.36, 0.52);
          this.group.add(lens);
        }
      }

      this.gateStripMat = (index % 6 === 0 ? mats.cyanStripMat : mats.coralTrimMat).clone();
      const archLight = new THREE.Mesh(geos.archTrimGeo, this.gateStripMat);
      archLight.position.set(0, 6.38, 0.38);
      this.group.add(archLight);
    } else if (index % 3 === 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const signBoard = new THREE.Mesh(geos.sideSignBoardGeo, mats.highwaySignMat);
      signBoard.position.set(side * (ROAD_WIDTH * 0.5 + 3.2), 4.1, 0);
      signBoard.rotation.y = side * -0.18;
      this.group.add(signBoard);
    }
  }

  public animate(elapsed: number, isBoosting: boolean): void {
    if (this.gateStripMat) {
      this.gateStripMat.emissiveIntensity = isBoosting
        ? 0.92 + Math.sin(elapsed * 8 + this.index) * 0.14
        : 0.58 + Math.sin(elapsed * 3 + this.index) * 0.08;
    }
  }

  public dispose(): void {
    this.gateStripMat?.dispose();
  }
}
