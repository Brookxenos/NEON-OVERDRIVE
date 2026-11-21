import * as THREE from 'three';
import { LaneIndex, LaneSystem } from '../track/LaneSystem';
import { COLORS, DESPAWN_Z, SPAWN_Z } from '../utils/Constants';
import { ObjectPool, Poolable } from '../utils/ObjectPool';
import { TextureBundle } from '../utils/TextureFactory';

export type ObstacleType =
  | 'traffic'
  | 'barrier'
  | 'roadblock'
  | 'laser_gate'
  | 'hazard_zone';

export interface ObstacleInstance extends Poolable {
  kind: ObstacleType;
  lane: LaneIndex;
  group: THREE.Group;
  hoverTarget: THREE.Object3D | null;
  trafficWheels: THREE.Group[];
  baseY: number;
  phase: number;
  halfW: number;
  halfZ: number;
  relativeSpeed: number;
  nearMissed: boolean;
}

function createJerseyBarrierGeometry(width: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.52, 0);
  shape.lineTo(0.52, 0);
  shape.lineTo(0.42, 0.28);
  shape.lineTo(0.22, 0.92);
  shape.lineTo(0.14, 1.12);
  shape.lineTo(-0.14, 1.12);
  shape.lineTo(-0.22, 0.92);
  shape.lineTo(-0.42, 0.28);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.05,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-width * 0.5, 0, 0);
  return geo;
}

function createSidePylonGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0);
  shape.lineTo(0.34, 0);
  shape.lineTo(0.24, 1.48);
  shape.lineTo(-0.24, 1.48);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.14, 0, 0);
  return geo;
}

interface TrafficBodyStation {
  z: number;
  halfW: number;
  fenderW: number;
  bottomY: number;
  midY: number;
  shoulderY: number;
  crownY: number;
}

function createTrafficBodyGeometry(): THREE.BufferGeometry {
  const stations: TrafficBodyStation[] = [
    { z: -2.06, halfW: 0.72, fenderW: 0.78, bottomY: 0.14, midY: 0.24, shoulderY: 0.34, crownY: 0.37 },
    { z: -1.86, halfW: 0.84, fenderW: 0.92, bottomY: 0.06, midY: 0.27, shoulderY: 0.44, crownY: 0.48 },
    { z: -1.32, halfW: 0.76, fenderW: 0.78, bottomY: 0.1, midY: 0.4, shoulderY: 0.54, crownY: 0.59 },
    { z: -0.68, halfW: 0.85, fenderW: 0.92, bottomY: 0.05, midY: 0.31, shoulderY: 0.56, crownY: 0.6 },
    { z: 0.02, halfW: 0.83, fenderW: 0.9, bottomY: 0.05, midY: 0.31, shoulderY: 0.57, crownY: 0.6 },
    { z: 0.68, halfW: 0.86, fenderW: 0.95, bottomY: 0.05, midY: 0.33, shoulderY: 0.6, crownY: 0.62 },
    { z: 1.28, halfW: 0.78, fenderW: 0.8, bottomY: 0.1, midY: 0.41, shoulderY: 0.61, crownY: 0.63 },
    { z: 1.84, halfW: 0.84, fenderW: 0.92, bottomY: 0.07, midY: 0.32, shoulderY: 0.56, crownY: 0.58 },
    { z: 2.04, halfW: 0.74, fenderW: 0.78, bottomY: 0.14, midY: 0.29, shoulderY: 0.5, crownY: 0.52 },
  ];

  const ringSize = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const s of stations) {
    const pts: Array<[number, number]> = [
      [-s.halfW * 0.84, s.bottomY],
      [-s.fenderW, s.midY],
      [-s.halfW * 0.95, s.shoulderY],
      [-s.halfW * 0.44, s.crownY - 0.01],
      [0, s.crownY],
      [s.halfW * 0.44, s.crownY - 0.01],
      [s.halfW * 0.95, s.shoulderY],
      [s.fenderW, s.midY],
      [s.halfW * 0.84, s.bottomY],
      [0, s.bottomY],
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
  positions.push(0, 0.25, stations[0].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(frontCenter, j, (j + 1) % ringSize);
  }

  const lastBase = (stations.length - 1) * ringSize;
  const rearCenter = positions.length / 3;
  positions.push(0, 0.32, stations[stations.length - 1].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(rearCenter, lastBase + ((j + 1) % ringSize), lastBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createTrafficCabinGeometry(): THREE.BufferGeometry {
  const stations = [
    { z: -0.78, baseW: 0.76, topW: 0.66, baseY: 0.55, topY: 0.59 },
    { z: -0.24, baseW: 0.73, topW: 0.57, baseY: 0.57, topY: 0.98 },
    { z: 0.48, baseW: 0.73, topW: 0.56, baseY: 0.59, topY: 0.97 },
    { z: 1.38, baseW: 0.75, topW: 0.64, baseY: 0.6, topY: 0.64 },
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
  positions.push(0, 0.57, stations[0].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(frontCenter, j, (j + 1) % ringSize);
  }

  const lastBase = (stations.length - 1) * ringSize;
  const rearCenter = positions.length / 3;
  positions.push(0, 0.61, stations[stations.length - 1].z);
  for (let j = 0; j < ringSize; j++) {
    indices.push(rearCenter, lastBase + ((j + 1) % ringSize), lastBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createTrafficTireGeometry(radius: number, width: number): THREE.LatheGeometry {
  const halfW = width * 0.5;
  const innerR = radius * 0.62;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, -halfW * 0.92),
    new THREE.Vector2(radius * 0.88, -halfW),
    new THREE.Vector2(radius * 0.98, -halfW * 0.8),
    new THREE.Vector2(radius, -halfW * 0.42),
    new THREE.Vector2(radius, halfW * 0.42),
    new THREE.Vector2(radius * 0.98, halfW * 0.8),
    new THREE.Vector2(radius * 0.88, halfW),
    new THREE.Vector2(innerR, halfW * 0.92),
  ];
  const geo = new THREE.LatheGeometry(pts, 22);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export class ObstacleManager {
  public readonly group = new THREE.Group();

  private readonly pool: ObjectPool<ObstacleInstance>;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly warningAmberMat: THREE.MeshStandardMaterial;
  private readonly dangerRedMat: THREE.MeshStandardMaterial;
  private elapsed = 0;

  constructor(textures: TextureBundle) {
    // Warm sunlit champagne-peach alloy & rose-bronze trim so obstacles pop cleanly against dark asphalt
    const chassisSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf3dfd1,
      emissive: 0x451a10,
      emissiveIntensity: 0.18,
      metalness: 0.35,
      roughness: 0.38,
      envMapIntensity: 0.55,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x883a4e,
      emissive: 0x3b1124,
      emissiveIntensity: 0.14,
      metalness: 0.25,
      roughness: 0.52,
      envMapIntensity: 0.35,
    });
    const hazardStripeMat = new THREE.MeshStandardMaterial({
      map: textures.hazardStripes,
      emissive: 0xf59e0b,
      emissiveMap: textures.hazardStripes,
      emissiveIntensity: 0.62,
      roughness: 0.38,
    });
    this.warningAmberMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.18,
    });
    this.dangerRedMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: COLORS.dangerRed,
      emissiveIntensity: 1.65,
      roughness: 0.18,
    });
    const shieldGlassMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.56,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const laneFloorWarningMat = new THREE.MeshBasicMaterial({
      color: 0xfdba74,
      transparent: true,
      opacity: 0.44,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      depthWrite: false,
    });
    const trafficColors = [0xeb4a3e, 0xf97316, 0xf472b6, 0xfbbf24, 0xfef3c7];
    const trafficCarMats = trafficColors.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.16,
          metalness: 0.08,
          roughness: 0.56,
          envMapIntensity: 0.08,
        }),
    );
    const rivalTireMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a38,
      metalness: 0.06,
      roughness: 0.85,
      envMapIntensity: 0.06,
    });
    const rivalRimMat = new THREE.MeshStandardMaterial({
      color: 0xfed7aa,
      metalness: 0.45,
      roughness: 0.36,
      envMapIntensity: 0.2,
    });
    const rivalCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x862e5c,
      emissive: 0x4c1232,
      emissiveIntensity: 0.24,
      metalness: 0.12,
      roughness: 0.34,
      envMapIntensity: 0.14,
    });

    const trafficTrimMat = new THREE.MeshStandardMaterial({
      color: 0x7a3448,
      emissive: 0x3b1522,
      emissiveIntensity: 0.14,
      metalness: 0.16,
      roughness: 0.6,
      envMapIntensity: 0.08,
    });
    const trafficPlateMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0x78350f,
      emissiveIntensity: 0.18,
      metalness: 0.06,
      roughness: 0.62,
      envMapIntensity: 0.08,
    });
    const trafficHeadlampMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
    });

    this.materials.push(
      chassisSteelMat,
      darkTrimMat,
      hazardStripeMat,
      this.warningAmberMat,
      this.dangerRedMat,
      shieldGlassMat,
      laneFloorWarningMat,
      rivalTireMat,
      rivalRimMat,
      rivalCanopyMat,
      trafficTrimMat,
      trafficPlateMat,
      trafficHeadlampMat,
      ...trafficCarMats,
    );

    // Shared smooth geometries across obstacle instances
    const floorStripGeo = new THREE.PlaneGeometry(2.7, 0.28);
    floorStripGeo.rotateX(-Math.PI / 2);

    // 1. Barrier (Energy Shield Gate)
    const barrierSillGeo = new THREE.CapsuleGeometry(0.16, 2.5, 6, 16);
    barrierSillGeo.rotateZ(Math.PI / 2);
    const barrierPylonGeo = createSidePylonGeometry();
    const barrierCapGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.16, 16);
    const barrierRailGeo = new THREE.CapsuleGeometry(0.08, 2.3, 6, 14);
    barrierRailGeo.rotateZ(Math.PI / 2);
    const barrierShieldGeo = new THREE.PlaneGeometry(2.36, 0.96);

    // 2. Traffic (Sculpted Automotive Traffic Car)
    const rivalHullGeo = createTrafficBodyGeometry();
    const rivalCanopyGeo = createTrafficCabinGeometry();
    const rivalRoofGeo = new THREE.BoxGeometry(1.12, 0.04, 0.78);
    const rivalGrilleGeo = new THREE.BoxGeometry(1.02, 0.18, 0.08);
    const rivalSplitterGeo = new THREE.BoxGeometry(1.66, 0.05, 0.22);
    const rivalHeadlampGeo = new THREE.BoxGeometry(0.28, 0.09, 0.08);
    const rivalMirrorGeo = new THREE.BoxGeometry(0.17, 0.075, 0.11);
    const rivalSpoilerBladeGeo = new THREE.BoxGeometry(1.64, 0.045, 0.2);
    const rivalTailHousingGeo = new THREE.BoxGeometry(1.56, 0.16, 0.07);
    const rivalTailClusterGeo = new THREE.BoxGeometry(0.42, 0.09, 0.05);
    const rivalPlateGeo = new THREE.BoxGeometry(0.36, 0.11, 0.03);
    const rivalDiffuserGeo = new THREE.BoxGeometry(1.28, 0.11, 0.12);
    const rivalExhaustGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.22, 12);
    rivalExhaustGeo.rotateX(Math.PI / 2);
    const rivalWheelTireGeo = createTrafficTireGeometry(0.33, 0.26);
    const rivalWheelRimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.21, 18);
    rivalWheelRimGeo.rotateZ(Math.PI / 2);
    const rivalWheelSpokeGeo = new THREE.BoxGeometry(0.23, 0.36, 0.045);
    const rivalWheelArchGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.18, 16, 1, true, 0, Math.PI);
    rivalWheelArchGeo.rotateZ(Math.PI / 2);
    const rivalShadowGeo = new THREE.PlaneGeometry(2.35, 4.35);
    rivalShadowGeo.rotateX(-Math.PI / 2);

    // 3. Roadblock (Sloped Highway Barricade)
    const jerseyGeo = createJerseyBarrierGeometry(2.75);
    const roadblockStripeGeo = new THREE.BoxGeometry(2.65, 0.34, 0.92);
    const beaconDomeGeo = new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);

    // 4. Laser Gate (Rounded Safety Arch)
    const laserPostGeo = new THREE.CapsuleGeometry(0.14, 2.05, 8, 16);
    const laserCollarGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.24, 16);
    const laserArchGeo = new THREE.TorusGeometry(1.36, 0.11, 10, 24, Math.PI);
    const laserBeamGeo = new THREE.CylinderGeometry(0.075, 0.075, 2.66, 16);
    laserBeamGeo.rotateZ(Math.PI / 2);

    // 5. Hazard Zone (Raised EMP Pylon Cluster)
    const hazardRingGeo = new THREE.CylinderGeometry(1.28, 1.42, 0.22, 24);
    const hazardTopBandGeo = new THREE.TorusGeometry(1.24, 0.065, 10, 28);
    hazardTopBandGeo.rotateX(Math.PI / 2);
    const hazardArcGeo = new THREE.TorusGeometry(1.05, 0.075, 10, 24, Math.PI);
    const hazardPylonGeo = new THREE.CylinderGeometry(0.11, 0.17, 0.95, 14);
    const hazardTipGeo = new THREE.SphereGeometry(0.15, 14, 10);

    this.geometries.push(
      floorStripGeo,
      barrierSillGeo,
      barrierPylonGeo,
      barrierCapGeo,
      barrierRailGeo,
      barrierShieldGeo,
      rivalHullGeo,
      rivalCanopyGeo,
      rivalRoofGeo,
      rivalGrilleGeo,
      rivalSplitterGeo,
      rivalHeadlampGeo,
      rivalMirrorGeo,
      rivalSpoilerBladeGeo,
      rivalTailHousingGeo,
      rivalTailClusterGeo,
      rivalPlateGeo,
      rivalDiffuserGeo,
      rivalExhaustGeo,
      rivalWheelTireGeo,
      rivalWheelRimGeo,
      rivalWheelSpokeGeo,
      rivalWheelArchGeo,
      rivalShadowGeo,
      jerseyGeo,
      roadblockStripeGeo,
      beaconDomeGeo,
      laserPostGeo,
      laserCollarGeo,
      laserArchGeo,
      laserBeamGeo,
      hazardRingGeo,
      hazardTopBandGeo,
      hazardArcGeo,
      hazardPylonGeo,
      hazardTipGeo,
    );

    const kinds: ObstacleType[] = [
      'barrier',
      'traffic',
      'roadblock',
      'laser_gate',
      'hazard_zone',
    ];

    const instances: ObstacleInstance[] = [];

    for (let i = 0; i < 26; i++) {
      const kind = kinds[i % kinds.length];
      const obsGroup = new THREE.Group();
      obsGroup.visible = false;

      let hoverTarget: THREE.Object3D | null = null;
      const trafficWheels: THREE.Group[] = [];
      let baseY = 0;
      let halfW = 1.15;
      let halfZ = 0.8;
      let relativeSpeed = 0;

      if (kind === 'barrier') {
        const floorMarker = new THREE.Mesh(floorStripGeo, laneFloorWarningMat);
        floorMarker.position.set(0, 0.03, 0.55);
        obsGroup.add(floorMarker);

        const sill = new THREE.Mesh(barrierSillGeo, hazardStripeMat);
        sill.position.y = 0.16;
        sill.castShadow = true;
        obsGroup.add(sill);

        for (const px of [-1.26, 1.26]) {
          const pylon = new THREE.Mesh(barrierPylonGeo, chassisSteelMat);
          pylon.position.set(px, 0, 0);
          pylon.castShadow = true;
          obsGroup.add(pylon);

          const cap = new THREE.Mesh(barrierCapGeo, this.warningAmberMat);
          cap.position.set(px, 1.58, 0);
          obsGroup.add(cap);
        }

        const shield = new THREE.Mesh(barrierShieldGeo, shieldGlassMat);
        shield.position.set(0, 0.92, 0);
        obsGroup.add(shield);

        for (const ry of [0.54, 1.32]) {
          const rail = new THREE.Mesh(barrierRailGeo, this.dangerRedMat);
          rail.position.set(0, ry, 0);
          obsGroup.add(rail);
        }

        halfW = 1.12;
        halfZ = 0.48;
      } else if (kind === 'traffic') {
        const carMat = trafficCarMats[i % trafficCarMats.length];
        const carBody = new THREE.Group();
        carBody.position.y = 0.22;

        const hull = new THREE.Mesh(rivalHullGeo, carMat);
        hull.castShadow = true;
        carBody.add(hull);

        const canopy = new THREE.Mesh(rivalCanopyGeo, rivalCanopyMat);
        carBody.add(canopy);

        const roof = new THREE.Mesh(rivalRoofGeo, carMat);
        roof.position.set(0, 0.985, 0.12);
        carBody.add(roof);

        const grille = new THREE.Mesh(rivalGrilleGeo, trafficTrimMat);
        grille.position.set(0, 0.25, -2.02);
        carBody.add(grille);

        const splitter = new THREE.Mesh(rivalSplitterGeo, trafficTrimMat);
        splitter.position.set(0, 0.09, -1.96);
        carBody.add(splitter);

        for (const sx of [-0.66, 0.66]) {
          const headlamp = new THREE.Mesh(rivalHeadlampGeo, trafficHeadlampMat);
          headlamp.position.set(sx, 0.34, -1.98);
          carBody.add(headlamp);

          const mirror = new THREE.Mesh(rivalMirrorGeo, carMat);
          mirror.position.set(sx > 0 ? 0.92 : -0.92, 0.65, -0.45);
          carBody.add(mirror);
        }

        const spoiler = new THREE.Mesh(rivalSpoilerBladeGeo, trafficTrimMat);
        spoiler.position.set(0, 0.66, 1.84);
        carBody.add(spoiler);

        const tailHousing = new THREE.Mesh(rivalTailHousingGeo, trafficTrimMat);
        tailHousing.position.set(0, 0.37, 2.02);
        carBody.add(tailHousing);

        for (const sx of [-0.54, 0.54]) {
          const tailCluster = new THREE.Mesh(rivalTailClusterGeo, this.dangerRedMat);
          tailCluster.position.set(sx, 0.37, 2.045);
          carBody.add(tailCluster);
        }

        const plate = new THREE.Mesh(rivalPlateGeo, trafficPlateMat);
        plate.position.set(0, 0.26, 2.04);
        carBody.add(plate);

        const diffuser = new THREE.Mesh(rivalDiffuserGeo, trafficTrimMat);
        diffuser.position.set(0, 0.12, 1.98);
        carBody.add(diffuser);

        for (const sx of [-0.52, -0.38, 0.38, 0.52]) {
          const pipe = new THREE.Mesh(rivalExhaustGeo, chassisSteelMat);
          pipe.position.set(sx, 0.13, 2.04);
          carBody.add(pipe);
        }

        for (const wx of [-0.91, 0.91]) {
          for (const wz of [-1.32, 1.28]) {
            const arch = new THREE.Mesh(rivalWheelArchGeo, trafficTrimMat);
            arch.position.set(wx * 0.98, 0.34, wz);
            obsGroup.add(arch);

            const wheel = new THREE.Group();
            wheel.position.set(wx, 0.33, wz);

            const tire = new THREE.Mesh(rivalWheelTireGeo, rivalTireMat);
            tire.castShadow = true;
            wheel.add(tire);

            const rim = new THREE.Mesh(rivalWheelRimGeo, rivalRimMat);
            wheel.add(rim);

            for (let s = 0; s < 5; s++) {
              const spoke = new THREE.Mesh(rivalWheelSpokeGeo, darkTrimMat);
              spoke.rotation.x = (s * Math.PI) / 5;
              wheel.add(spoke);
            }

            obsGroup.add(wheel);
            trafficWheels.push(wheel);
          }
        }

        const underWarning = new THREE.Mesh(rivalShadowGeo, laneFloorWarningMat);
        underWarning.position.set(0, 0.03, 0);
        obsGroup.add(underWarning);
        obsGroup.add(carBody);

        hoverTarget = carBody;
        baseY = 0.22;
        halfW = 0.96;
        halfZ = 1.92;
        relativeSpeed = -3;
      } else if (kind === 'roadblock') {
        const floorMarker = new THREE.Mesh(floorStripGeo, laneFloorWarningMat);
        floorMarker.position.set(0, 0.03, 0.72);
        obsGroup.add(floorMarker);

        const jersey = new THREE.Mesh(jerseyGeo, chassisSteelMat);
        jersey.castShadow = true;
        obsGroup.add(jersey);

        const stripeBand = new THREE.Mesh(roadblockStripeGeo, hazardStripeMat);
        stripeBand.position.set(0, 0.38, 0);
        obsGroup.add(stripeBand);

        for (const bx of [-0.95, 0.95]) {
          const beacon = new THREE.Mesh(beaconDomeGeo, this.warningAmberMat);
          beacon.position.set(bx, 1.14, 0);
          obsGroup.add(beacon);
        }

        halfW = 1.14;
        halfZ = 0.58;
      } else if (kind === 'laser_gate') {
        const floorMarker = new THREE.Mesh(floorStripGeo, laneFloorWarningMat);
        floorMarker.position.set(0, 0.03, 0.45);
        obsGroup.add(floorMarker);

        for (const px of [-1.36, 1.36]) {
          const post = new THREE.Mesh(laserPostGeo, chassisSteelMat);
          post.position.set(px, 1.15, 0);
          post.castShadow = true;
          obsGroup.add(post);

          const baseCollar = new THREE.Mesh(laserCollarGeo, hazardStripeMat);
          baseCollar.position.set(px, 0.14, 0);
          obsGroup.add(baseCollar);
        }

        const topArch = new THREE.Mesh(laserArchGeo, this.warningAmberMat);
        topArch.position.set(0, 2.05, 0);
        obsGroup.add(topArch);

        for (const by of [0.62, 1.25, 1.88]) {
          const beam = new THREE.Mesh(laserBeamGeo, this.dangerRedMat);
          beam.position.set(0, by, 0);
          obsGroup.add(beam);
        }

        halfW = 1.12;
        halfZ = 0.44;
      } else {
        const floorMarker = new THREE.Mesh(floorStripGeo, laneFloorWarningMat);
        floorMarker.position.set(0, 0.03, 1.65);
        obsGroup.add(floorMarker);

        const basePlatform = new THREE.Mesh(hazardRingGeo, hazardStripeMat);
        basePlatform.position.y = 0.12;
        basePlatform.scale.set(1, 1, 1.28);
        obsGroup.add(basePlatform);

        const topBand = new THREE.Mesh(hazardTopBandGeo, this.warningAmberMat);
        topBand.position.y = 0.26;
        topBand.scale.set(1, 1.28, 1);
        obsGroup.add(topBand);

        for (const angle of [0, Math.PI / 2]) {
          const arc = new THREE.Mesh(hazardArcGeo, this.dangerRedMat);
          arc.position.y = 0.24;
          arc.rotation.y = angle;
          obsGroup.add(arc);
        }

        for (const px of [-1.1, 1.1]) {
          for (const pz of [-1.35, 1.35]) {
            const pylon = new THREE.Mesh(hazardPylonGeo, chassisSteelMat);
            pylon.position.set(px, 0.52, pz);
            pylon.castShadow = true;
            obsGroup.add(pylon);

            const tip = new THREE.Mesh(hazardTipGeo, this.warningAmberMat);
            tip.position.set(px, 1.04, pz);
            obsGroup.add(tip);
          }
        }

        halfW = 1.1;
        halfZ = 1.62;
      }

      this.group.add(obsGroup);
      instances.push({
        active: false,
        kind,
        lane: 1,
        group: obsGroup,
        hoverTarget,
        trafficWheels,
        baseY,
        phase: i * 0.85,
        halfW,
        halfZ,
        relativeSpeed,
        nearMissed: false,
      });
    }

    this.pool = new ObjectPool(instances);
  }

  private static getObstacleHalfZ(kind: ObstacleType): number {
    switch (kind) {
      case 'traffic':
        return 1.92;
      case 'hazard_zone':
        return 1.62;
      case 'roadblock':
        return 0.58;
      case 'barrier':
        return 0.48;
      case 'laser_gate':
        return 0.44;
    }
  }

  private getArrivalInterval(
    z: number,
    halfZ: number,
    relativeSpeed: number,
    worldSpeed: number,
    safetyBufferSec: number,
  ): [number, number] {
    const effectiveSpeed = Math.max(18, worldSpeed + relativeSpeed);
    const arrivalTime = Math.max(0, -z) / effectiveSpeed;
    const halfDuration = (halfZ + 1.55) / effectiveSpeed + safetyBufferSec;
    return [arrivalTime - halfDuration, arrivalTime + halfDuration];
  }

  private canSpawnSafelyAtSpeed(
    lane: LaneIndex,
    halfZ: number,
    relativeSpeed: number,
    worldSpeed: number,
  ): boolean {
    const [newStart, newEnd] = this.getArrivalInterval(
      SPAWN_Z,
      halfZ,
      relativeSpeed,
      worldSpeed,
      0.38,
    );
    const newCenter = (newStart + newEnd) * 0.5;
    const laneIntervals: Array<[number, number]>[] = [[], [], []];
    laneIntervals[lane].push([newStart, newEnd]);

    let sameLaneConflict = false;
    this.pool.forEachActive((obs) => {
      if (obs.lane === lane && Math.abs(obs.group.position.z - SPAWN_Z) < 20) {
        sameLaneConflict = true;
      }
      if (obs.group.position.z > 2) return;
      const [obsStart, obsEnd] = this.getArrivalInterval(
        obs.group.position.z,
        obs.halfZ,
        obs.relativeSpeed,
        worldSpeed,
        0.38,
      );
      if (obs.lane === lane && obsEnd >= newStart && obsStart <= newEnd) {
        sameLaneConflict = true;
      }
      laneIntervals[obs.lane].push([obsStart, obsEnd]);
    });

    if (sameLaneConflict) return false;

    const sampleTimes = [newStart + 0.08, newCenter, newEnd - 0.08];
    for (const sampleTime of sampleTimes) {
      let openCount = 0;
      for (let l = 0; l < 3; l++) {
        const blockedAtSample = laneIntervals[l].some(
          ([start, end]) => sampleTime >= start && sampleTime <= end,
        );
        if (!blockedAtSample) openCount += 1;
      }
      if (openCount === 0) return false;
    }

    return true;
  }

  private isSpawnPassable(lane: LaneIndex, halfZ: number, relativeSpeed: number): boolean {
    return (
      this.canSpawnSafelyAtSpeed(lane, halfZ, relativeSpeed, this.lastWorldSpeed) &&
      this.canSpawnSafelyAtSpeed(lane, halfZ, relativeSpeed, this.lastWorldSpeed + 50)
    );
  }

  private lastWorldSpeed = 64;

  public spawnInLanes(lanes: LaneIndex[], worldSpeed = 64): LaneIndex[] {
    this.lastWorldSpeed = Math.max(40, worldSpeed);
    const obstacleTypes: ObstacleType[] = [
      'barrier',
      'traffic',
      'roadblock',
      'laser_gate',
      'hazard_zone',
    ];
    const spawnedLanes: LaneIndex[] = [];

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const preferred = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      let relSpeed = preferred === 'traffic' ? -(1.8 + Math.random() * 2.2) : 0;
      const candidateHalfZ = ObstacleManager.getObstacleHalfZ(preferred);

      if (!this.isSpawnPassable(lane, candidateHalfZ, relSpeed)) {
        if (preferred === 'traffic' && this.isSpawnPassable(lane, candidateHalfZ, 0)) {
          relSpeed = 0;
        } else {
          continue;
        }
      }

      const obs = this.pool.acquire((item) => item.kind === preferred);
      if (!obs) continue;

      obs.active = true;
      obs.lane = lane;
      obs.nearMissed = false;
      obs.relativeSpeed = obs.kind === 'traffic' ? relSpeed : 0;
      obs.group.position.set(LaneSystem.getLaneX(lane), 0, SPAWN_Z);
      obs.group.visible = true;
      spawnedLanes.push(lane);
    }

    return spawnedLanes;
  }

  public isLaneClearForSafeCorridor(lane: LaneIndex, worldSpeed: number): boolean {
    const safeSpeed = Math.max(40, worldSpeed);
    const [newStart, newEnd] = this.getArrivalInterval(SPAWN_Z, 1.6, 0, safeSpeed, 0.34);
    let clear = true;
    this.pool.forEachActive((obs) => {
      if (obs.lane !== lane || obs.group.position.z > 2) return;
      const [obsStart, obsEnd] = this.getArrivalInterval(
        obs.group.position.z,
        obs.halfZ,
        obs.relativeSpeed,
        safeSpeed,
        0.34,
      );
      if (obsEnd >= newStart && obsStart <= newEnd) {
        clear = false;
      }
    });
    return clear;
  }

  public update(dt: number, worldSpeed: number): void {
    this.elapsed += dt;
    const pulse = Math.sin(this.elapsed * 5.2);
    this.warningAmberMat.emissiveIntensity = 1.28 + pulse * 0.22;
    this.dangerRedMat.emissiveIntensity = 1.48 - pulse * 0.2;

    this.pool.forEachActive((obs) => {
      const effectiveSpeed = Math.max(12, worldSpeed + obs.relativeSpeed);
      obs.group.position.z += effectiveSpeed * dt;

      if (obs.hoverTarget) {
        obs.hoverTarget.position.y =
          obs.baseY + Math.sin(this.elapsed * 9.5 + obs.phase) * 0.012;
      }

      if (obs.trafficWheels.length > 0) {
        const wheelSpinDelta = -(effectiveSpeed / 0.33) * dt * 0.65;
        for (const wheel of obs.trafficWheels) {
          wheel.rotation.x += wheelSpinDelta;
        }
      }

      if (obs.group.position.z > DESPAWN_Z) {
        obs.active = false;
        obs.group.visible = false;
      }
    });
  }

  public forEachActive(callback: (obs: ObstacleInstance) => void): void {
    this.pool.forEachActive(callback);
  }

  public describeObstacle(kind: ObstacleType): string {
    switch (kind) {
      case 'traffic':
        return 'Traffic Car Collision';
      case 'barrier':
        return 'Plasma Energy Barrier';
      case 'laser_gate':
        return 'High-Voltage Laser Gate';
      case 'roadblock':
        return 'Armored Cyber Barricade';
      case 'hazard_zone':
        return 'Electrified Hazard Strip';
    }
  }

  public reset(): void {
    this.elapsed = 0;
    this.pool.forEachAll((obs) => {
      obs.active = false;
      obs.group.visible = false;
    });
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
