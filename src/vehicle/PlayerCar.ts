import * as THREE from 'three';
import { CAR_CHASSIS_CLEARANCE, PLAYER_Z } from '../utils/Constants';
import { TextureBundle } from '../utils/TextureFactory';
import { CarBodyStyle, CarSpec } from './CarCatalog';

interface WheelAssembly {
  steerPivot: THREE.Group;
  spinGroup: THREE.Group;
  isFront: boolean;
}

interface BodyStation {
  z: number;
  halfW: number;
  fenderW: number;
  bottomY: number;
  midY: number;
  shoulderY: number;
  crownY: number;
}

function createSculptedCarBodyGeometry(): THREE.BufferGeometry {
  // Lofted automotive stations from front nose (-Z) to rear tail (+Z)
  // Ring order is clockwise when viewed from -Z; triangles use (a0, b0, b1) / (a0, b1, a1) for outward normals.
  const stations: BodyStation[] = [
    { z: -2.26, halfW: 0.74, fenderW: 0.8, bottomY: 0.12, midY: 0.25, shoulderY: 0.36, crownY: 0.39 },
    { z: -2.04, halfW: 0.86, fenderW: 0.94, bottomY: 0.06, midY: 0.29, shoulderY: 0.45, crownY: 0.49 },
    { z: -1.78, halfW: 0.86, fenderW: 0.94, bottomY: 0.06, midY: 0.34, shoulderY: 0.52, crownY: 0.58 },
    { z: -1.36, halfW: 0.78, fenderW: 0.79, bottomY: 0.12, midY: 0.42, shoulderY: 0.56, crownY: 0.61 }, // front wheel bay recess
    { z: -0.92, halfW: 0.88, fenderW: 0.95, bottomY: 0.05, midY: 0.34, shoulderY: 0.57, crownY: 0.62 },
    { z: -0.66, halfW: 0.87, fenderW: 0.94, bottomY: 0.05, midY: 0.32, shoulderY: 0.58, crownY: 0.61 }, // windshield cowl
    { z: 0.02, halfW: 0.85, fenderW: 0.92, bottomY: 0.05, midY: 0.32, shoulderY: 0.59, crownY: 0.61 },  // door waist
    { z: 0.88, halfW: 0.88, fenderW: 0.96, bottomY: 0.05, midY: 0.34, shoulderY: 0.62, crownY: 0.64 },
    { z: 1.34, halfW: 0.8, fenderW: 0.81, bottomY: 0.12, midY: 0.44, shoulderY: 0.64, crownY: 0.66 }, // rear wheel bay recess
    { z: 1.82, halfW: 0.88, fenderW: 0.96, bottomY: 0.06, midY: 0.35, shoulderY: 0.61, crownY: 0.63 },
    { z: 2.14, halfW: 0.82, fenderW: 0.88, bottomY: 0.1, midY: 0.33, shoulderY: 0.55, crownY: 0.58 },
    { z: 2.24, halfW: 0.74, fenderW: 0.79, bottomY: 0.15, midY: 0.31, shoulderY: 0.5, crownY: 0.52 },
  ];

  // 10-point closed cross section per station (clockwise looking from -Z toward +Z)
  const ringSize = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const s of stations) {
    const pts: Array<[number, number]> = [
      [-s.halfW * 0.82, s.bottomY],     // 0: bottom-left sill
      [-s.fenderW, s.midY],             // 1: left mid-fender bulge
      [-s.halfW * 0.95, s.shoulderY],   // 2: left beltline shoulder
      [-s.halfW * 0.44, s.crownY - 0.01], // 3: left hood/deck curve
      [0, s.crownY],                    // 4: center crown ridge
      [s.halfW * 0.44, s.crownY - 0.01], // 5: right hood/deck curve
      [s.halfW * 0.95, s.shoulderY],    // 6: right beltline shoulder
      [s.fenderW, s.midY],              // 7: right mid-fender bulge
      [s.halfW * 0.82, s.bottomY],      // 8: bottom-right sill
      [0, s.bottomY],                   // 9: bottom center floorpan
    ];
    for (const [px, py] of pts) {
      positions.push(px, py, s.z);
    }
  }

  // Loft outer skin between adjacent stations (outward normals)
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * ringSize;
    const b = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const jNext = (j + 1) % ringSize;
      const a0 = a + j;
      const a1 = a + jNext;
      const b0 = b + j;
      const b1 = b + jNext;
      indices.push(a0, b0, b1);
      indices.push(a0, b1, a1);
    }
  }

  // Cap front nose (station 0, outward normal -Z)
  const frontCenterIdx = positions.length / 3;
  positions.push(0, 0.26, stations[0].z);
  for (let j = 0; j < ringSize; j++) {
    const jNext = (j + 1) % ringSize;
    indices.push(frontCenterIdx, j, jNext);
  }

  // Cap rear tail (last station, outward normal +Z)
  const lastBase = (stations.length - 1) * ringSize;
  const rearCenterIdx = positions.length / 3;
  positions.push(0, 0.34, stations[stations.length - 1].z);
  for (let j = 0; j < ringSize; j++) {
    const jNext = (j + 1) % ringSize;
    indices.push(rearCenterIdx, lastBase + jNext, lastBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createSculptedCabinGeometry(): THREE.BufferGeometry {
  // Tapered automotive glass greenhouse with raked windshield & fastback rear glass
  const stations = [
    { z: -0.82, baseW: 0.78, topW: 0.68, baseY: 0.56, topY: 0.6 }, // windshield base
    { z: -0.26, baseW: 0.75, topW: 0.58, baseY: 0.58, topY: 1.01 }, // windshield header
    { z: 0.48, baseW: 0.75, topW: 0.57, baseY: 0.6, topY: 1.0 },   // roof trailing edge
    { z: 1.46, baseW: 0.77, topW: 0.66, baseY: 0.61, topY: 0.65 }, // rear glass base
  ];

  const ringSize = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const s of stations) {
    const pts: Array<[number, number]> = [
      [-s.baseW, s.baseY],
      [-s.topW, s.topY - 0.02],
      [0, s.topY],
      [s.topW, s.topY - 0.02],
      [s.baseW, s.baseY],
      [0, s.baseY - 0.03],
    ];
    for (const [px, py] of pts) {
      positions.push(px, py, s.z);
    }
  }

  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * ringSize;
    const b = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const jNext = (j + 1) % ringSize;
      indices.push(a + j, b + j, b + jNext);
      indices.push(a + j, b + jNext, a + jNext);
    }
  }

  const frontCenter = positions.length / 3;
  positions.push(0, 0.58, stations[0].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(frontCenter, j, (j + 1) % ringSize);
  }

  const lastBase = (stations.length - 1) * ringSize;
  const rearCenter = positions.length / 3;
  positions.push(0, 0.62, stations[stations.length - 1].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(rearCenter, lastBase + ((j + 1) % ringSize), lastBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createProfiledTireGeometry(radius: number, width: number): THREE.LatheGeometry {
  const halfW = width * 0.5;
  const innerR = radius * 0.63;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, -halfW * 0.92),
    new THREE.Vector2(radius * 0.88, -halfW),
    new THREE.Vector2(radius * 0.98, -halfW * 0.82),
    new THREE.Vector2(radius, -halfW * 0.45),
    new THREE.Vector2(radius, halfW * 0.45),
    new THREE.Vector2(radius * 0.98, halfW * 0.82),
    new THREE.Vector2(radius * 0.88, halfW),
    new THREE.Vector2(innerR, halfW * 0.92),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function createFenderArchLinerGeometry(): THREE.ExtrudeGeometry {
  const arch = new THREE.Shape();
  arch.absarc(0, 0, 0.42, 0, Math.PI, false);
  arch.lineTo(-0.5, 0);
  arch.absarc(0, 0, 0.5, Math.PI, 0, true);
  arch.closePath();

  const geo = new THREE.ExtrudeGeometry(arch, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.translate(0, 0, -0.08);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createWheelWellDrumGeometry(): THREE.ExtrudeGeometry {
  const drum = new THREE.Shape();
  drum.absarc(0, 0, 0.42, 0, Math.PI, false);
  drum.closePath();

  const geo = new THREE.ExtrudeGeometry(drum, {
    depth: 0.28,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -0.14);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export class PlayerCar {
  public readonly group = new THREE.Group();
  public readonly bodyGroup = new THREE.Group();

  private readonly closedBodyGroup = new THREE.Group();
  private readonly wheels: WheelAssembly[] = [];
  private readonly styleGroups: Record<CarBodyStyle, THREE.Group>;
  private readonly thrusterOuterCones: THREE.Mesh[] = [];
  private readonly thrusterInnerCones: THREE.Mesh[] = [];

  private readonly paintMat: THREE.MeshStandardMaterial;
  private readonly secondaryMat: THREE.MeshStandardMaterial;
  private readonly stripeMat: THREE.MeshStandardMaterial;
  private readonly rimMat: THREE.MeshStandardMaterial;
  private readonly chromeMat: THREE.MeshStandardMaterial;
  private readonly tireMat: THREE.MeshStandardMaterial;
  private readonly glassMat: THREE.MeshStandardMaterial;
  private readonly caliperMat: THREE.MeshStandardMaterial;
  private readonly headLampMat: THREE.MeshBasicMaterial;
  private readonly amberLampMat: THREE.MeshBasicMaterial;
  private readonly tailBarMat: THREE.MeshStandardMaterial;
  private readonly thrusterOuterMat: THREE.MeshBasicMaterial;
  private readonly thrusterInnerMat: THREE.MeshBasicMaterial;
  private readonly headlightBeamMat: THREE.MeshBasicMaterial;
  private readonly shieldRingMat: THREE.MeshBasicMaterial;
  private readonly magnetRingMat: THREE.MeshBasicMaterial;
  private readonly shieldAuraGroup: THREE.Group;
  private readonly magnetAuraRing: THREE.Mesh;
  private readonly headlightGlow: THREE.PointLight;
  private readonly underGlowLight: THREE.PointLight;
  private readonly contactShadow: THREE.Mesh;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(textures: TextureBundle, initialSpec: CarSpec) {
    this.group.add(this.bodyGroup);
    this.bodyGroup.add(this.closedBodyGroup);

    // Matte-satin automotive paint with near-zero environment reflection so the rear stays sharp
    this.paintMat = new THREE.MeshStandardMaterial({
      color: initialSpec.primaryColor,
      metalness: 0.08,
      roughness: 0.64,
      envMapIntensity: 0.06,
    });

    this.secondaryMat = new THREE.MeshStandardMaterial({
      color: initialSpec.secondaryColor,
      metalness: 0.14,
      roughness: 0.72,
      envMapIntensity: 0.06,
    });

    this.stripeMat = new THREE.MeshStandardMaterial({
      color: initialSpec.stripeColor,
      metalness: 0.06,
      roughness: 0.64,
      envMapIntensity: 0.06,
    });

    this.rimMat = new THREE.MeshStandardMaterial({
      color: initialSpec.rimColor,
      metalness: 0.48,
      roughness: 0.38,
      envMapIntensity: 0.16,
    });

    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.34,
      roughness: 0.54,
      envMapIntensity: 0.08,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x141720,
      metalness: 0.04,
      roughness: 0.92,
      envMapIntensity: 0.04,
    });

    this.glassMat = new THREE.MeshStandardMaterial({
      color: initialSpec.glassColor,
      metalness: 0.12,
      roughness: 0.34,
      envMapIntensity: 0.12,
    });

    this.caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.2,
      roughness: 0.5,
      envMapIntensity: 0.08,
    });

    this.headLampMat = new THREE.MeshBasicMaterial({ color: initialSpec.headlightColor });
    this.amberLampMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    this.tailBarMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.25,
      roughness: 0.45,
      metalness: 0.08,
    });

    this.thrusterOuterMat = new THREE.MeshBasicMaterial({
      color: initialSpec.flameOuterColor,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.thrusterInnerMat = new THREE.MeshBasicMaterial({
      color: initialSpec.flameInnerColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.headlightBeamMat = new THREE.MeshBasicMaterial({
      map: textures.headlightBeam,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.materials.push(
      this.paintMat,
      this.secondaryMat,
      this.stripeMat,
      this.rimMat,
      this.chromeMat,
      this.tireMat,
      this.glassMat,
      this.caliperMat,
      this.headLampMat,
      this.amberLampMat,
      this.tailBarMat,
      this.thrusterOuterMat,
      this.thrusterInnerMat,
      this.headlightBeamMat,
    );

    // 1. Sculpted lofted car bodywork
    const bodyGeo = createSculptedCarBodyGeometry();
    this.geometries.push(bodyGeo);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.paintMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.closedBodyGroup.add(bodyMesh);

    // 2. Sculpted tapered glass greenhouse + painted roof cap
    const cabinGeo = createSculptedCabinGeometry();
    const roofCapGeo = new THREE.BoxGeometry(1.1, 0.045, 0.78);
    this.geometries.push(cabinGeo, roofCapGeo);

    const cabinMesh = new THREE.Mesh(cabinGeo, this.glassMat);
    cabinMesh.castShadow = true;
    this.closedBodyGroup.add(cabinMesh);

    const roofCap = new THREE.Mesh(roofCapGeo, this.paintMat);
    roofCap.position.set(0, 1.005, 0.11);
    roofCap.castShadow = true;
    this.closedBodyGroup.add(roofCap);

    // 3. Recessed wheel wells + painted flared fender lips concentric with axles
    const wellBoxGeo = createWheelWellDrumGeometry();
    const fenderLipGeo = createFenderArchLinerGeometry();
    this.geometries.push(wellBoxGeo, fenderLipGeo);

    for (const sx of [-1, 1]) {
      for (const sz of [-1.36, 1.34]) {
        const well = new THREE.Mesh(wellBoxGeo, this.tireMat);
        well.position.set(sx * 0.88, 0.23, sz);
        this.closedBodyGroup.add(well);

        const lip = new THREE.Mesh(fenderLipGeo, this.paintMat);
        lip.position.set(sx * 0.99, 0.23, sz);
        lip.castShadow = true;
        this.closedBodyGroup.add(lip);
      }
    }

    // 4. Lower rocker skirts (between axles), front grille, front chin splitter, side moldings & door handles
    const skirtGeo = new THREE.BoxGeometry(1.86, 0.09, 1.72);
    const frontGrilleGeo = new THREE.BoxGeometry(1.06, 0.19, 0.08);
    const grilleFrameGeo = new THREE.BoxGeometry(1.14, 0.23, 0.06);
    const frontChinGeo = new THREE.BoxGeometry(1.74, 0.06, 0.22);
    const handleGeo = new THREE.BoxGeometry(0.04, 0.038, 0.17);
    const sideTrimGeo = new THREE.BoxGeometry(0.03, 0.045, 1.78);
    this.geometries.push(
      skirtGeo,
      frontGrilleGeo,
      grilleFrameGeo,
      frontChinGeo,
      handleGeo,
      sideTrimGeo,
    );

    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(skirtGeo, this.secondaryMat);
      skirt.position.set(side * 0.04, 0.045, 0);
      this.closedBodyGroup.add(skirt);

      const handle = new THREE.Mesh(handleGeo, this.chromeMat);
      handle.position.set(side * 0.91, 0.51, 0.18);
      this.closedBodyGroup.add(handle);

      const trim = new THREE.Mesh(sideTrimGeo, this.secondaryMat);
      trim.position.set(side * 0.91, 0.31, 0);
      this.closedBodyGroup.add(trim);
    }

    const grilleFrame = new THREE.Mesh(grilleFrameGeo, this.chromeMat);
    grilleFrame.position.set(0, 0.29, -2.23);
    this.closedBodyGroup.add(grilleFrame);

    const frontGrille = new THREE.Mesh(frontGrilleGeo, this.tireMat);
    frontGrille.position.set(0, 0.29, -2.25);
    this.closedBodyGroup.add(frontGrille);

    const frontChin = new THREE.Mesh(frontChinGeo, this.secondaryMat);
    frontChin.position.set(0, 0.09, -2.21);
    this.closedBodyGroup.add(frontChin);

    // 5. Realistic racing stripes contoured along sculpted hood, roof, and rear deck
    const hoodStripeGeo = new THREE.BoxGeometry(0.16, 0.02, 1.24);
    const roofStripeGeo = new THREE.BoxGeometry(0.16, 0.02, 0.78);
    const deckStripeGeo = new THREE.BoxGeometry(0.16, 0.02, 0.66);
    this.geometries.push(hoodStripeGeo, roofStripeGeo, deckStripeGeo);

    for (const sx of [-0.15, 0.15]) {
      const hoodStripe = new THREE.Mesh(hoodStripeGeo, this.stripeMat);
      hoodStripe.position.set(sx, 0.57, -1.46);
      hoodStripe.rotation.x = 0.1;
      this.closedBodyGroup.add(hoodStripe);

      const roofStripe = new THREE.Mesh(roofStripeGeo, this.stripeMat);
      roofStripe.position.set(sx, 1.03, 0.11);
      this.closedBodyGroup.add(roofStripe);

      const deckStripe = new THREE.Mesh(deckStripeGeo, this.stripeMat);
      deckStripe.position.set(sx, 0.625, 1.78);
      deckStripe.rotation.x = -0.11;
      this.closedBodyGroup.add(deckStripe);
    }

    // 6. Sculpted side-view mirrors on stalks
    const mirrorHousingGeo = new THREE.BoxGeometry(0.19, 0.09, 0.13);
    const mirrorStalkGeo = new THREE.BoxGeometry(0.1, 0.04, 0.06);
    this.geometries.push(mirrorHousingGeo, mirrorStalkGeo);
    for (const side of [-1, 1]) {
      const stalk = new THREE.Mesh(mirrorStalkGeo, this.secondaryMat);
      stalk.position.set(side * 0.87, 0.63, -0.58);
      this.closedBodyGroup.add(stalk);

      const mirror = new THREE.Mesh(mirrorHousingGeo, this.paintMat);
      mirror.position.set(side * 0.97, 0.66, -0.56);
      mirror.rotation.y = side * -0.16;
      this.closedBodyGroup.add(mirror);
    }

    // 7. Detailed multi-element headlights (recessed housing + projector lens + DRL brow + amber corner)
    const headHousingGeo = new THREE.BoxGeometry(0.36, 0.13, 0.12);
    const projectorGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 14);
    projectorGeo.rotateX(Math.PI / 2);
    const drlGeo = new THREE.BoxGeometry(0.32, 0.025, 0.06);
    const cornerTurnGeo = new THREE.BoxGeometry(0.07, 0.07, 0.1);
    const beamPlaneGeo = new THREE.PlaneGeometry(1.5, 11.5);
    beamPlaneGeo.rotateX(-Math.PI / 2);
    beamPlaneGeo.translate(0, 0, -5.75);
    this.geometries.push(headHousingGeo, projectorGeo, drlGeo, cornerTurnGeo, beamPlaneGeo);

    for (const side of [-1, 1]) {
      const housing = new THREE.Mesh(headHousingGeo, this.tireMat);
      housing.position.set(side * 0.65, 0.37, -2.18);
      housing.rotation.y = side * -0.22;
      this.closedBodyGroup.add(housing);

      for (const offset of [-0.07, 0.07]) {
        const lens = new THREE.Mesh(projectorGeo, this.headLampMat);
        lens.position.set(side * 0.65 + offset, 0.37, -2.21);
        this.closedBodyGroup.add(lens);
      }

      const drl = new THREE.Mesh(drlGeo, this.headLampMat);
      drl.position.set(side * 0.65, 0.425, -2.19);
      drl.rotation.y = side * -0.22;
      this.closedBodyGroup.add(drl);

      const turn = new THREE.Mesh(cornerTurnGeo, this.amberLampMat);
      turn.position.set(side * 0.83, 0.36, -2.12);
      this.closedBodyGroup.add(turn);

      const beam = new THREE.Mesh(beamPlaneGeo, this.headlightBeamMat);
      beam.position.set(side * 0.65, -0.2, -2.2);
      beam.rotation.y = side * -0.05;
      this.closedBodyGroup.add(beam);
    }

    // 8. Detailed rear fascia: smoked taillight housings, LED tubes, license plate pocket, diffuser strakes, hollow exhausts
    const tailHousingGeo = new THREE.BoxGeometry(1.56, 0.16, 0.08);
    const tailLedGeo = new THREE.BoxGeometry(0.46, 0.045, 0.05);
    const reverseStripGeo = new THREE.BoxGeometry(0.18, 0.03, 0.05);
    const platePocketGeo = new THREE.BoxGeometry(0.48, 0.18, 0.06);
    const plateFaceGeo = new THREE.BoxGeometry(0.42, 0.13, 0.04);
    const diffuserBaseGeo = new THREE.BoxGeometry(1.48, 0.14, 0.18);
    const strakeGeo = new THREE.BoxGeometry(0.04, 0.13, 0.2);
    this.geometries.push(
      tailHousingGeo,
      tailLedGeo,
      reverseStripGeo,
      platePocketGeo,
      plateFaceGeo,
      diffuserBaseGeo,
      strakeGeo,
    );

    const tailHousing = new THREE.Mesh(tailHousingGeo, this.tireMat);
    tailHousing.position.set(0, 0.42, 2.21);
    this.closedBodyGroup.add(tailHousing);

    for (const side of [-1, 1]) {
      const upperLed = new THREE.Mesh(tailLedGeo, this.tailBarMat);
      upperLed.position.set(side * 0.49, 0.45, 2.24);
      this.closedBodyGroup.add(upperLed);

      const lowerLed = new THREE.Mesh(tailLedGeo, this.tailBarMat);
      lowerLed.position.set(side * 0.49, 0.38, 2.24);
      this.closedBodyGroup.add(lowerLed);

      const reverseStrip = new THREE.Mesh(reverseStripGeo, this.amberLampMat);
      reverseStrip.position.set(side * 0.64, 0.415, 2.24);
      this.closedBodyGroup.add(reverseStrip);
    }

    const platePocket = new THREE.Mesh(platePocketGeo, this.secondaryMat);
    platePocket.position.set(0, 0.25, 2.22);
    this.closedBodyGroup.add(platePocket);

    const plateFace = new THREE.Mesh(plateFaceGeo, this.chromeMat);
    plateFace.position.set(0, 0.25, 2.24);
    this.closedBodyGroup.add(plateFace);

    const diffuserBase = new THREE.Mesh(diffuserBaseGeo, this.secondaryMat);
    diffuserBase.position.set(0, 0.09, 2.18);
    this.closedBodyGroup.add(diffuserBase);

    for (const sx of [-0.46, -0.16, 0.16, 0.46]) {
      const strake = new THREE.Mesh(strakeGeo, this.tireMat);
      strake.position.set(sx, 0.08, 2.21);
      this.closedBodyGroup.add(strake);
    }

    // Hollow dual exhaust tailpipes + boost-only flame cones
    const pipeOuterGeo = new THREE.CylinderGeometry(0.085, 0.092, 0.28, 16);
    pipeOuterGeo.rotateX(Math.PI / 2);
    const pipeInnerGeo = new THREE.CylinderGeometry(0.064, 0.064, 0.06, 14);
    pipeInnerGeo.rotateX(Math.PI / 2);
    const outerConeGeo = new THREE.ConeGeometry(0.13, 1.25, 14);
    outerConeGeo.rotateX(Math.PI / 2);
    outerConeGeo.translate(0, 0, 0.62);
    const innerConeGeo = new THREE.ConeGeometry(0.07, 0.82, 12);
    innerConeGeo.rotateX(Math.PI / 2);
    innerConeGeo.translate(0, 0, 0.41);
    this.geometries.push(pipeOuterGeo, pipeInnerGeo, outerConeGeo, innerConeGeo);

    for (const side of [-1, 1]) {
      for (const subOffset of [-0.09, 0.09]) {
        const px = side * 0.54 + subOffset;
        const pipe = new THREE.Mesh(pipeOuterGeo, this.chromeMat);
        pipe.position.set(px, 0.09, 2.22);
        this.closedBodyGroup.add(pipe);

        const innerBore = new THREE.Mesh(pipeInnerGeo, this.tireMat);
        innerBore.position.set(px, 0.09, 2.345);
        this.closedBodyGroup.add(innerBore);
      }

      const outerCone = new THREE.Mesh(outerConeGeo, this.thrusterOuterMat);
      outerCone.position.set(side * 0.54, 0.09, 2.35);
      this.closedBodyGroup.add(outerCone);
      this.thrusterOuterCones.push(outerCone);

      const innerCone = new THREE.Mesh(innerConeGeo, this.thrusterInnerMat);
      innerCone.position.set(side * 0.54, 0.09, 2.35);
      this.closedBodyGroup.add(innerCone);
      this.thrusterInnerCones.push(innerCone);
    }

    // 9. Build distinct closed-body kits
    this.styleGroups = {
      muscle_blower: this.buildMuscleBlowerKit(),
      drift_widebody: this.buildDriftWidebodyKit(),
      ourea_electric: this.buildOureaElectricKit(),
      magnetar_super: this.buildMagnetarSuperKit(),
      cerbero_racer: this.buildCerberoRacerKit(),
      chiron_rally: this.buildChironRallyKit(),
      spectra_wtype: this.buildSpectraWtypeKit(),
      janus_racer: this.buildJanusRacerKit(),
      chronos_proto: this.buildChronosProtoKit(),
    };
    for (const kit of Object.values(this.styleGroups)) {
      this.closedBodyGroup.add(kit);
    }

    // 10. Grounded realistic wheels with profiled tires, 10-spoke alloys & brake calipers
    this.buildWheels(initialSpec.wheelRadius);

    const shadowGeo = new THREE.PlaneGeometry(2.85, 4.95);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.geometries.push(shadowGeo);
    this.materials.push(shadowMat);

    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(0, 0.025, 0);
    this.group.add(this.contactShadow);

    this.headlightGlow = new THREE.PointLight(initialSpec.headlightColor, 1.65, 16, 1.6);
    this.headlightGlow.position.set(0, 0.6, -3.1);
    this.bodyGroup.add(this.headlightGlow);

    this.underGlowLight = new THREE.PointLight(initialSpec.flameOuterColor, 0, 4.5, 2.0);
    this.underGlowLight.position.set(0, 0.15, 2.4);
    this.bodyGroup.add(this.underGlowLight);

    const shieldRingGeo = new THREE.TorusGeometry(1.75, 0.048, 8, 40);
    shieldRingGeo.rotateX(Math.PI / 2);
    const shieldSideGeo = new THREE.TorusGeometry(1.45, 0.032, 8, 32);
    shieldSideGeo.rotateY(Math.PI / 2);
    const magnetRingGeo = new THREE.TorusGeometry(1.52, 0.036, 8, 32);
    magnetRingGeo.rotateX(Math.PI / 2);

    this.shieldRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.magnetRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.geometries.push(shieldRingGeo, shieldSideGeo, magnetRingGeo);
    this.materials.push(this.shieldRingMat, this.magnetRingMat);

    this.shieldAuraGroup = new THREE.Group();
    this.shieldAuraGroup.position.set(0, 0.62, 0);
    this.shieldAuraGroup.visible = false;
    const shieldMain = new THREE.Mesh(shieldRingGeo, this.shieldRingMat);
    shieldMain.scale.set(0.86, 1, 1.56);
    const shieldVert = new THREE.Mesh(shieldSideGeo, this.shieldRingMat);
    shieldVert.scale.set(1.75, 0.52, 0.85);
    this.shieldAuraGroup.add(shieldMain, shieldVert);
    this.group.add(this.shieldAuraGroup);

    this.magnetAuraRing = new THREE.Mesh(magnetRingGeo, this.magnetRingMat);
    this.magnetAuraRing.position.set(0, 0.14, 0);
    this.magnetAuraRing.scale.set(1.08, 1, 1.72);
    this.magnetAuraRing.visible = false;
    this.group.add(this.magnetAuraRing);

    this.group.position.set(0, 0, PLAYER_Z);
    this.bodyGroup.position.y = CAR_CHASSIS_CLEARANCE;
    this.applyCarSpec(initialSpec);
  }

  private buildWheels(wheelRadius: number): void {
    const tireWidth = 0.31;
    const tireGeo = createProfiledTireGeometry(wheelRadius, tireWidth);

    const rimLipGeo = new THREE.TorusGeometry(wheelRadius * 0.62, 0.026, 8, 22);
    rimLipGeo.rotateY(Math.PI / 2);

    const rimBarrelGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.61,
      wheelRadius * 0.61,
      tireWidth * 0.72,
      20,
    );
    rimBarrelGeo.rotateZ(Math.PI / 2);

    const hubGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.18,
      wheelRadius * 0.18,
      tireWidth * 0.88,
      14,
    );
    hubGeo.rotateZ(Math.PI / 2);

    const spokeGeo = new THREE.BoxGeometry(0.055, wheelRadius * 1.08, 0.036);
    const brakeDiscGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.48,
      wheelRadius * 0.48,
      0.045,
      18,
    );
    brakeDiscGeo.rotateZ(Math.PI / 2);
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.15, 0.11);

    this.geometries.push(
      tireGeo,
      rimLipGeo,
      rimBarrelGeo,
      hubGeo,
      spokeGeo,
      brakeDiscGeo,
      caliperGeo,
    );

    const positions: Array<{ x: number; z: number; isFront: boolean; side: number }> = [
      { x: -0.94, z: -1.36, isFront: true, side: -1 },
      { x: 0.94, z: -1.36, isFront: true, side: 1 },
      { x: -0.96, z: 1.34, isFront: false, side: -1 },
      { x: 0.96, z: 1.34, isFront: false, side: 1 },
    ];

    for (const pos of positions) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(pos.x, wheelRadius, pos.z);

      // Fixed brake caliper attached to knuckle so it stays upright while wheel spins
      const caliper = new THREE.Mesh(caliperGeo, this.caliperMat);
      caliper.position.set(pos.side * -0.04, 0.07, 0.11);
      steerPivot.add(caliper);

      const spinGroup = new THREE.Group();

      const tire = new THREE.Mesh(tireGeo, this.tireMat);
      tire.castShadow = true;
      spinGroup.add(tire);

      const rimBarrel = new THREE.Mesh(rimBarrelGeo, this.tireMat);
      spinGroup.add(rimBarrel);

      const rimLip = new THREE.Mesh(rimLipGeo, this.rimMat);
      rimLip.position.x = pos.side * (tireWidth * 0.36);
      spinGroup.add(rimLip);

      const hub = new THREE.Mesh(hubGeo, this.chromeMat);
      spinGroup.add(hub);

      const brakeDisc = new THREE.Mesh(brakeDiscGeo, this.chromeMat);
      brakeDisc.position.x = pos.side * -0.02;
      spinGroup.add(brakeDisc);

      // 5 twin-spoke alloy layout (10 spokes total)
      for (let s = 0; s < 5; s++) {
        const baseAngle = (s * Math.PI * 2) / 5;
        for (const pairOffset of [-0.14, 0.14]) {
          const spoke = new THREE.Mesh(spokeGeo, this.rimMat);
          spoke.position.x = pos.side * (tireWidth * 0.29);
          spoke.rotation.x = baseAngle + pairOffset;
          spinGroup.add(spoke);
        }
      }

      steerPivot.add(spinGroup);
      this.group.add(steerPivot);
      this.wheels.push({
        steerPivot,
        spinGroup,
        isFront: pos.isFront,
      });
    }
  }

  private buildMuscleBlowerKit(): THREE.Group {
    const kit = new THREE.Group();
    const blowerBlockGeo = new THREE.BoxGeometry(0.4, 0.22, 0.54);
    const blowerScoopGeo = new THREE.BoxGeometry(0.44, 0.13, 0.42);
    const intakeValveGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.06, 12);
    intakeValveGeo.rotateX(Math.PI / 2);
    const ducktailGeo = new THREE.BoxGeometry(1.66, 0.15, 0.2);
    this.geometries.push(blowerBlockGeo, blowerScoopGeo, intakeValveGeo, ducktailGeo);

    const blowerBlock = new THREE.Mesh(blowerBlockGeo, this.secondaryMat);
    blowerBlock.position.set(0, 0.66, -1.24);
    kit.add(blowerBlock);

    const scoop = new THREE.Mesh(blowerScoopGeo, this.chromeMat);
    scoop.position.set(0, 0.81, -1.26);
    scoop.castShadow = true;
    kit.add(scoop);

    for (const vx of [-0.12, 0, 0.12]) {
      const valve = new THREE.Mesh(intakeValveGeo, this.tailBarMat);
      valve.position.set(vx, 0.81, -1.48);
      kit.add(valve);
    }

    const ducktail = new THREE.Mesh(ducktailGeo, this.paintMat);
    ducktail.position.set(0, 0.64, 2.02);
    ducktail.rotation.x = 0.28;
    ducktail.castShadow = true;
    kit.add(ducktail);

    return kit;
  }

  private buildDriftWidebodyKit(): THREE.Group {
    const kit = new THREE.Group();
    const overfenderGeo = new THREE.BoxGeometry(0.12, 0.22, 0.82);
    const hoodVentGeo = new THREE.BoxGeometry(0.66, 0.035, 0.44);
    const driftWingGeo = new THREE.BoxGeometry(1.88, 0.07, 0.28);
    const wingPostGeo = new THREE.BoxGeometry(0.07, 0.24, 0.18);
    const endplateGeo = new THREE.BoxGeometry(0.05, 0.18, 0.34);
    this.geometries.push(overfenderGeo, hoodVentGeo, driftWingGeo, wingPostGeo, endplateGeo);

    for (const side of [-1, 1]) {
      for (const wz of [-1.36, 1.34]) {
        const flare = new THREE.Mesh(overfenderGeo, this.secondaryMat);
        flare.position.set(side * 1.01, 0.42, wz);
        kit.add(flare);
      }

      const post = new THREE.Mesh(wingPostGeo, this.secondaryMat);
      post.position.set(side * 0.58, 0.69, 1.98);
      kit.add(post);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.94, 0.82, 1.98);
      kit.add(plate);
    }

    const hoodVent = new THREE.Mesh(hoodVentGeo, this.secondaryMat);
    hoodVent.position.set(0, 0.59, -1.36);
    kit.add(hoodVent);

    const wing = new THREE.Mesh(driftWingGeo, this.paintMat);
    wing.position.set(0, 0.81, 1.98);
    wing.rotation.x = 0.12;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildOureaElectricKit(): THREE.Group {
    const kit = new THREE.Group();
    const evNoseBarGeo = new THREE.BoxGeometry(1.32, 0.045, 0.08);
    const roofFinGeo = new THREE.BoxGeometry(0.08, 0.15, 0.72);
    const rearBladeGeo = new THREE.BoxGeometry(1.74, 0.065, 0.22);
    const diffuserGeo = new THREE.BoxGeometry(1.36, 0.09, 0.14);
    this.geometries.push(evNoseBarGeo, roofFinGeo, rearBladeGeo, diffuserGeo);

    const noseBar = new THREE.Mesh(evNoseBarGeo, this.stripeMat);
    noseBar.position.set(0, 0.35, -2.25);
    kit.add(noseBar);

    const roofFin = new THREE.Mesh(roofFinGeo, this.stripeMat);
    roofFin.position.set(0, 1.07, 0.28);
    kit.add(roofFin);

    const rearBlade = new THREE.Mesh(rearBladeGeo, this.secondaryMat);
    rearBlade.position.set(0, 0.66, 2.02);
    kit.add(rearBlade);

    const diffuser = new THREE.Mesh(diffuserGeo, this.stripeMat);
    diffuser.position.set(0, 0.07, 2.24);
    kit.add(diffuser);

    return kit;
  }

  private buildMagnetarSuperKit(): THREE.Group {
    const kit = new THREE.Group();
    const intakePodGeo = new THREE.BoxGeometry(0.18, 0.25, 0.98);
    const deckLouverGeo = new THREE.BoxGeometry(1.04, 0.035, 0.11);
    const splitterGeo = new THREE.BoxGeometry(1.94, 0.055, 0.24);
    const wingGeo = new THREE.BoxGeometry(1.94, 0.065, 0.32);
    const strutGeo = new THREE.BoxGeometry(0.07, 0.28, 0.2);
    this.geometries.push(intakePodGeo, deckLouverGeo, splitterGeo, wingGeo, strutGeo);

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(intakePodGeo, this.secondaryMat);
      pod.position.set(side * 0.96, 0.39, 0.45);
      kit.add(pod);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.54, 0.74, 1.96);
      kit.add(strut);
    }

    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(deckLouverGeo, this.secondaryMat);
      slat.position.set(0, 0.85 - i * 0.055, 0.86 + i * 0.19);
      slat.rotation.x = -0.2;
      kit.add(slat);
    }

    const splitter = new THREE.Mesh(splitterGeo, this.stripeMat);
    splitter.position.set(0, 0.06, -2.26);
    kit.add(splitter);

    const wing = new THREE.Mesh(wingGeo, this.paintMat);
    wing.position.set(0, 0.9, 1.98);
    wing.rotation.x = 0.09;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildCerberoRacerKit(): THREE.Group {
    const kit = new THREE.Group();
    const snorkelGeo = new THREE.BoxGeometry(0.3, 0.16, 0.76);
    const canardGeo = new THREE.BoxGeometry(0.22, 0.045, 0.32);
    const strutGeo = new THREE.BoxGeometry(0.07, 0.36, 0.22);
    const gtWingGeo = new THREE.BoxGeometry(2.04, 0.07, 0.36);
    const endplateGeo = new THREE.BoxGeometry(0.055, 0.24, 0.42);
    this.geometries.push(snorkelGeo, canardGeo, strutGeo, gtWingGeo, endplateGeo);

    const snorkel = new THREE.Mesh(snorkelGeo, this.secondaryMat);
    snorkel.position.set(0, 1.07, 0.2);
    kit.add(snorkel);

    for (const side of [-1, 1]) {
      const canard = new THREE.Mesh(canardGeo, this.stripeMat);
      canard.position.set(side * 0.95, 0.23, -2.0);
      canard.rotation.z = side * -0.18;
      kit.add(canard);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.56, 0.78, 1.98);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 1.02, 0.96, 2.0);
      kit.add(plate);
    }

    const gtWing = new THREE.Mesh(gtWingGeo, this.secondaryMat);
    gtWing.position.set(0, 0.98, 2.0);
    gtWing.rotation.x = 0.08;
    gtWing.castShadow = true;
    kit.add(gtWing);

    return kit;
  }

  private buildChironRallyKit(): THREE.Group {
    const kit = new THREE.Group();
    const rackGeo = new THREE.BoxGeometry(1.06, 0.1, 0.78);
    const lampPodGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.11, 12);
    lampPodGeo.rotateX(Math.PI / 2);
    const bullBarGeo = new THREE.BoxGeometry(1.12, 0.11, 0.14);
    const mudflapGeo = new THREE.BoxGeometry(0.31, 0.21, 0.05);
    const rallyWingGeo = new THREE.BoxGeometry(1.74, 0.11, 0.26);
    this.geometries.push(rackGeo, lampPodGeo, bullBarGeo, mudflapGeo, rallyWingGeo);

    const rack = new THREE.Mesh(rackGeo, this.secondaryMat);
    rack.position.set(0, 1.06, 0.22);
    kit.add(rack);

    for (const lx of [-0.36, -0.12, 0.12, 0.36]) {
      const lamp = new THREE.Mesh(lampPodGeo, this.headLampMat);
      lamp.position.set(lx, 1.08, -0.18);
      kit.add(lamp);
    }

    const bullBar = new THREE.Mesh(bullBarGeo, this.secondaryMat);
    bullBar.position.set(0, 0.24, -2.29);
    kit.add(bullBar);

    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(mudflapGeo, this.stripeMat);
      flap.position.set(side * 0.96, -0.02, 1.72);
      kit.add(flap);
    }

    const rallyWing = new THREE.Mesh(rallyWingGeo, this.stripeMat);
    rallyWing.position.set(0, 0.7, 2.04);
    rallyWing.castShadow = true;
    kit.add(rallyWing);

    return kit;
  }

  private buildSpectraWtypeKit(): THREE.Group {
    const kit = new THREE.Group();
    const nacaVentGeo = new THREE.BoxGeometry(0.28, 0.03, 0.36);
    const sideBladeGeo = new THREE.BoxGeometry(0.08, 0.14, 1.36);
    const engineLouverGeo = new THREE.BoxGeometry(0.96, 0.03, 0.11);
    const wingBladeGeo = new THREE.BoxGeometry(1.88, 0.055, 0.28);
    const wingStanchionGeo = new THREE.BoxGeometry(0.06, 0.26, 0.2);
    const endplateGeo = new THREE.BoxGeometry(0.045, 0.18, 0.32);
    this.geometries.push(
      nacaVentGeo,
      sideBladeGeo,
      engineLouverGeo,
      wingBladeGeo,
      wingStanchionGeo,
      endplateGeo,
    );

    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(nacaVentGeo, this.secondaryMat);
      vent.position.set(side * 0.38, 0.59, -1.36);
      vent.rotation.x = 0.09;
      kit.add(vent);

      const blade = new THREE.Mesh(sideBladeGeo, this.secondaryMat);
      blade.position.set(side * 0.93, 0.23, 0.08);
      kit.add(blade);

      const stanchion = new THREE.Mesh(wingStanchionGeo, this.secondaryMat);
      stanchion.position.set(side * 0.52, 0.72, 1.98);
      kit.add(stanchion);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.94, 0.85, 1.98);
      kit.add(plate);
    }

    for (let i = 0; i < 4; i++) {
      const louver = new THREE.Mesh(engineLouverGeo, this.secondaryMat);
      louver.position.set(0, 0.78 - i * 0.045, 0.92 + i * 0.19);
      louver.rotation.x = -0.18;
      kit.add(louver);
    }

    const wing = new THREE.Mesh(wingBladeGeo, this.paintMat);
    wing.position.set(0, 0.85, 2.0);
    wing.rotation.x = 0.1;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildJanusRacerKit(): THREE.Group {
    const kit = new THREE.Group();
    const noseSplitterGeo = new THREE.BoxGeometry(1.94, 0.05, 0.26);
    const hoodPadGeo = new THREE.BoxGeometry(0.72, 0.025, 0.56);
    const vortexGeo = new THREE.BoxGeometry(0.05, 0.07, 0.14);
    const strutGeo = new THREE.BoxGeometry(0.065, 0.34, 0.2);
    const wingGeo = new THREE.BoxGeometry(1.98, 0.065, 0.34);
    const endplateGeo = new THREE.BoxGeometry(0.05, 0.22, 0.38);
    this.geometries.push(
      noseSplitterGeo,
      hoodPadGeo,
      vortexGeo,
      strutGeo,
      wingGeo,
      endplateGeo,
    );

    const splitter = new THREE.Mesh(noseSplitterGeo, this.stripeMat);
    splitter.position.set(0, 0.07, -2.25);
    kit.add(splitter);

    const hoodPad = new THREE.Mesh(hoodPadGeo, this.secondaryMat);
    hoodPad.position.set(0, 0.59, -1.42);
    hoodPad.rotation.x = 0.09;
    kit.add(hoodPad);

    for (const vx of [-0.36, -0.12, 0.12, 0.36]) {
      const fin = new THREE.Mesh(vortexGeo, this.stripeMat);
      fin.position.set(vx, 1.045, 0.44);
      kit.add(fin);
    }

    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.56, 0.77, 1.98);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.99, 0.93, 2.0);
      kit.add(plate);
    }

    const wing = new THREE.Mesh(wingGeo, this.paintMat);
    wing.position.set(0, 0.94, 2.0);
    wing.rotation.x = 0.09;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildChronosProtoKit(): THREE.Group {
    const kit = new THREE.Group();
    const scoopGeo = new THREE.BoxGeometry(0.32, 0.15, 0.68);
    const dorsalFinGeo = new THREE.BoxGeometry(0.055, 0.25, 1.18);
    const fenderVentGeo = new THREE.BoxGeometry(0.24, 0.04, 0.34);
    const upperWingGeo = new THREE.BoxGeometry(2.04, 0.06, 0.32);
    const lowerWingGeo = new THREE.BoxGeometry(1.94, 0.045, 0.22);
    const strutGeo = new THREE.BoxGeometry(0.065, 0.38, 0.22);
    const endplateGeo = new THREE.BoxGeometry(0.055, 0.28, 0.42);
    this.geometries.push(
      scoopGeo,
      dorsalFinGeo,
      fenderVentGeo,
      upperWingGeo,
      lowerWingGeo,
      strutGeo,
      endplateGeo,
    );

    const scoop = new THREE.Mesh(scoopGeo, this.secondaryMat);
    scoop.position.set(0, 1.07, 0.14);
    kit.add(scoop);

    const dorsalFin = new THREE.Mesh(dorsalFinGeo, this.stripeMat);
    dorsalFin.position.set(0, 0.92, 1.06);
    dorsalFin.rotation.x = -0.18;
    kit.add(dorsalFin);

    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(fenderVentGeo, this.secondaryMat);
      vent.position.set(side * 0.68, 0.61, -1.36);
      kit.add(vent);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.54, 0.79, 1.98);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 1.02, 0.94, 2.0);
      kit.add(plate);
    }

    const lowerWing = new THREE.Mesh(lowerWingGeo, this.stripeMat);
    lowerWing.position.set(0, 0.82, 2.02);
    kit.add(lowerWing);

    const upperWing = new THREE.Mesh(upperWingGeo, this.secondaryMat);
    upperWing.position.set(0, 1.01, 2.02);
    upperWing.rotation.x = 0.08;
    upperWing.castShadow = true;
    kit.add(upperWing);

    return kit;
  }

  public applyCarSpec(spec: CarSpec): void {
    this.paintMat.color.setHex(spec.primaryColor);
    this.secondaryMat.color.setHex(spec.secondaryColor);
    this.stripeMat.color.setHex(spec.stripeColor);
    this.rimMat.color.setHex(spec.rimColor);
    this.glassMat.color.setHex(spec.glassColor);
    this.headLampMat.color.setHex(spec.headlightColor);
    this.thrusterOuterMat.color.setHex(spec.flameOuterColor);
    this.thrusterInnerMat.color.setHex(spec.flameInnerColor);
    this.headlightGlow.color.setHex(spec.headlightColor);
    this.underGlowLight.color.setHex(spec.flameOuterColor);

    const styles = Object.keys(this.styleGroups) as CarBodyStyle[];
    for (const style of styles) {
      this.styleGroups[style].visible = style === spec.bodyStyle;
    }
  }

  public applyPose(
    x: number,
    suspensionOffset: number,
    roll: number,
    pitch: number,
    yaw: number,
    steerAngle: number,
    wheelAngle: number,
    isBoosting: boolean,
    isThrottling: boolean,
    isBraking: boolean,
    isCrashed: boolean,
    phase: number,
  ): void {
    this.group.position.x = x;
    this.bodyGroup.position.y = CAR_CHASSIS_CLEARANCE + suspensionOffset;
    this.bodyGroup.rotation.set(pitch, yaw, roll);

    for (const wheel of this.wheels) {
      wheel.spinGroup.rotation.x = wheelAngle;
      if (wheel.isFront) {
        wheel.steerPivot.rotation.y = isCrashed ? 0.25 : steerAngle;
      }
    }

    const showBoostFlames = isBoosting && !isCrashed;
    for (const cone of this.thrusterOuterCones) {
      cone.visible = showBoostFlames;
    }
    for (const cone of this.thrusterInnerCones) {
      cone.visible = showBoostFlames;
    }

    if (isCrashed) {
      this.underGlowLight.intensity = 0;
      return;
    }

    this.tailBarMat.emissiveIntensity = isBraking ? 0.75 : 0.24;

    if (showBoostFlames) {
      const flamePulse = 0.88 + Math.sin(phase * 4.5) * 0.14;
      const lengthScale = 1.6 * flamePulse;
      for (const cone of this.thrusterOuterCones) {
        cone.scale.set(1.05, 1.05, lengthScale);
      }
      for (const cone of this.thrusterInnerCones) {
        cone.scale.set(0.9, 0.9, lengthScale * 0.85);
      }
      this.thrusterOuterMat.opacity = 0.5;
      this.thrusterInnerMat.opacity = 0.72;
    }

    this.headlightGlow.intensity = isBoosting ? 2.3 : 1.65;
    this.underGlowLight.intensity = isBoosting ? 0.45 : 0;
    this.headlightBeamMat.opacity = isBoosting ? 0.28 : isThrottling ? 0.2 : 0.15;
  }

  public setDefenseState(
    shieldActive: boolean,
    magnetActive: boolean,
    invulnerableTimer: number,
    phase: number,
  ): void {
    this.shieldAuraGroup.visible = shieldActive;
    if (shieldActive) {
      this.shieldAuraGroup.rotation.y = (phase * 0.45) % (Math.PI * 2);
      this.shieldRingMat.opacity = 0.48 + Math.sin(phase * 3.2) * 0.12;
    }

    this.magnetAuraRing.visible = magnetActive;
    if (magnetActive) {
      const pulse = 1 + Math.sin(phase * 4.2) * 0.04;
      this.magnetAuraRing.scale.set(1.08 * pulse, 1, 1.72 * pulse);
      this.magnetRingMat.opacity = 0.34 + Math.sin(phase * 4.2) * 0.1;
    }

    if (invulnerableTimer > 0) {
      this.bodyGroup.visible = Math.floor(invulnerableTimer * 18) % 2 === 0;
    } else {
      this.bodyGroup.visible = true;
    }
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
