import * as THREE from 'three';
import { CAR_CHASSIS_CLEARANCE, PLAYER_Z } from '../utils/Constants';
import { TextureBundle } from '../utils/TextureFactory';
import { CarBodyStyle, CarSpec } from './CarCatalog';
import {
  CarShellFamily,
  createAeroMirrorGeometry,
  createAeroSplitterGeometry,
  createAirfoilWingGeometry,
  createBeveledPlateGeometry,
  createCarShellGeometries,
  createDorsalFinGeometry,
  createFenderArchLinerGeometry,
  createProfiledTireGeometry,
  createRimBarrelGeometry,
  createRoofScoopGeometry,
  createSculptedSpokeGeometry,
  createSideIntakePodGeometry,
  createSweptStrutGeometry,
  createWheelWellDrumGeometry,
  createWingEndplateGeometry,
} from './CarGeometryFactory';

interface WheelAssembly {
  steerPivot: THREE.Group;
  spinGroup: THREE.Group;
  isFront: boolean;
}

const STYLE_TO_SHELL: Record<CarBodyStyle, CarShellFamily> = {
  muscle_blower: 'classic_muscle',
  drift_widebody: 'widebody_coupe',
  ourea_electric: 'aero_ev',
  magnetar_super: 'midengine_super',
  spectra_wtype: 'midengine_super',
  cerbero_racer: 'midengine_super',
  janus_racer: 'endurance_gt',
  chiron_rally: 'rally_coupe',
  chronos_proto: 'lmp_proto',
};

export class PlayerCar {
  public readonly group = new THREE.Group();
  public readonly bodyGroup = new THREE.Group();

  private readonly closedBodyGroup = new THREE.Group();
  private readonly wheels: WheelAssembly[] = [];
  private readonly styleGroups: Record<CarBodyStyle, THREE.Group>;
  private readonly shellGroups = new Map<CarShellFamily, THREE.Group>();
  private readonly backfireOuterMeshes: THREE.Mesh[] = [];
  private readonly backfireInnerMeshes: THREE.Mesh[] = [];
  private readonly backfireOuterMats: THREE.ShaderMaterial[] = [];
  private readonly backfireInnerMats: THREE.ShaderMaterial[] = [];
  private readonly boreGlowMeshes: THREE.Mesh[] = [];
  private readonly boreGlowMats: THREE.MeshBasicMaterial[] = [];

  private readonly paintMat: THREE.MeshPhysicalMaterial;
  private readonly secondaryMat: THREE.MeshStandardMaterial;
  private readonly stripeMat: THREE.MeshPhysicalMaterial;
  private readonly rimMat: THREE.MeshStandardMaterial;
  private readonly chromeMat: THREE.MeshStandardMaterial;
  private readonly tireMat: THREE.MeshStandardMaterial;
  private readonly glassMat: THREE.MeshPhysicalMaterial;
  private readonly caliperMat: THREE.MeshStandardMaterial;
  private readonly headLampMat: THREE.MeshBasicMaterial;
  private readonly amberLampMat: THREE.MeshBasicMaterial;
  private readonly tailBarMat: THREE.MeshStandardMaterial;
  private readonly flameOuterColor = new THREE.Color(0xea580c);
  private readonly flameInnerColor = new THREE.Color(0xfde047);
  private readonly headlightGlow: THREE.PointLight;
  private readonly contactShadow: THREE.Mesh;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private activeWheelRadius = 0.35;
  private rideHeightOffset = 0;

  constructor(textures: TextureBundle, initialSpec: CarSpec) {
    this.group.add(this.bodyGroup);
    this.bodyGroup.add(this.closedBodyGroup);

    this.paintMat = new THREE.MeshPhysicalMaterial({
      color: initialSpec.primaryColor,
      metalness: 0.36,
      roughness: 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.15,
    });

    this.secondaryMat = new THREE.MeshStandardMaterial({
      color: initialSpec.secondaryColor,
      metalness: 0.22,
      roughness: 0.48,
      normalMap: textures.carbonNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      envMapIntensity: 0.55,
    });

    this.stripeMat = new THREE.MeshPhysicalMaterial({
      color: initialSpec.stripeColor,
      metalness: 0.28,
      roughness: 0.26,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.9,
    });

    this.rimMat = new THREE.MeshStandardMaterial({
      color: initialSpec.rimColor,
      metalness: 0.84,
      roughness: 0.22,
      envMapIntensity: 1.05,
    });

    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdbe3ee,
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.15,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x151821,
      metalness: 0.04,
      roughness: 0.88,
      envMapIntensity: 0.08,
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: initialSpec.glassColor,
      metalness: 0.08,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.5,
    });

    this.caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.35,
      roughness: 0.35,
      envMapIntensity: 0.5,
    });

    this.headLampMat = new THREE.MeshBasicMaterial({ color: initialSpec.headlightColor });
    this.amberLampMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    this.tailBarMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.12,
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
    );

    const fasciaMaskGeo = createBeveledPlateGeometry(1.62, 0.145, 0.14, 0.032, 0.014);
    this.geometries.push(fasciaMaskGeo);

    const uniqueFamilies = Array.from(new Set(Object.values(STYLE_TO_SHELL)));
    for (const family of uniqueFamilies) {
      const shell = createCarShellGeometries(family);
      this.geometries.push(shell.body, shell.cabinGlass, shell.roofShell);

      const shellGroup = new THREE.Group();
      const bodyMesh = new THREE.Mesh(shell.body, this.paintMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      shellGroup.add(bodyMesh);

      const cabinMesh = new THREE.Mesh(shell.cabinGlass, this.glassMat);
      cabinMesh.castShadow = true;
      shellGroup.add(cabinMesh);

      const roofMesh = new THREE.Mesh(shell.roofShell, this.paintMat);
      roofMesh.castShadow = true;
      shellGroup.add(roofMesh);

      if (family !== 'lmp_proto') {
        const fasciaMask = new THREE.Mesh(fasciaMaskGeo, this.tireMat);
        fasciaMask.position.set(0, 0.36, -2.225);
        shellGroup.add(fasciaMask);
      }

      this.closedBodyGroup.add(shellGroup);
      this.shellGroups.set(family, shellGroup);
    }

    const wellBoxGeo = createWheelWellDrumGeometry(0.425);
    const fenderLipGeo = createFenderArchLinerGeometry(0.42, 0.495);
    this.geometries.push(wellBoxGeo, fenderLipGeo);

    for (const sx of [-1, 1]) {
      for (const sz of [-1.36, 1.34]) {
        const well = new THREE.Mesh(wellBoxGeo, this.tireMat);
        well.position.set(sx * 0.87, 0.22, sz);
        this.closedBodyGroup.add(well);

        const lip = new THREE.Mesh(fenderLipGeo, this.paintMat);
        lip.position.set(sx * 0.97, 0.22, sz);
        lip.castShadow = true;
        this.closedBodyGroup.add(lip);
      }
    }

    const skirtGeo = createBeveledPlateGeometry(0.11, 0.08, 1.72, 0.025, 0.015);
    const frontGrilleGeo = createBeveledPlateGeometry(1.04, 0.16, 0.08, 0.035, 0.014);
    const grilleFrameGeo = createBeveledPlateGeometry(1.12, 0.2, 0.06, 0.04, 0.014);
    const frontChinGeo = createAeroSplitterGeometry(1.74, 0.24);
    const handleGeo = createBeveledPlateGeometry(0.036, 0.032, 0.16, 0.01, 0.008);
    const sideTrimGeo = createBeveledPlateGeometry(0.032, 0.04, 1.68, 0.012, 0.008);
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
      skirt.position.set(side * 0.89, 0.075, 0);
      this.closedBodyGroup.add(skirt);

      const handle = new THREE.Mesh(handleGeo, this.chromeMat);
      handle.position.set(side * 0.9, 0.52, 0.18);
      this.closedBodyGroup.add(handle);

      const trim = new THREE.Mesh(sideTrimGeo, this.secondaryMat);
      trim.position.set(side * 0.9, 0.27, 0);
      this.closedBodyGroup.add(trim);
    }

    const grilleFrame = new THREE.Mesh(grilleFrameGeo, this.chromeMat);
    grilleFrame.position.set(0, 0.26, -2.27);
    this.closedBodyGroup.add(grilleFrame);

    const frontGrille = new THREE.Mesh(frontGrilleGeo, this.tireMat);
    frontGrille.position.set(0, 0.26, -2.285);
    this.closedBodyGroup.add(frontGrille);

    const frontChin = new THREE.Mesh(frontChinGeo, this.secondaryMat);
    frontChin.position.set(0, 0.075, -2.24);
    this.closedBodyGroup.add(frontChin);

    const mirrorHousingGeo = createAeroMirrorGeometry();
    const mirrorStalkGeo = createSweptStrutGeometry(0.07, 0.075, 0.05, 0.025);
    this.geometries.push(mirrorHousingGeo, mirrorStalkGeo);
    for (const side of [-1, 1]) {
      const stalk = new THREE.Mesh(mirrorStalkGeo, this.secondaryMat);
      stalk.position.set(side * 0.85, 0.57, -0.58);
      stalk.rotation.z = side * -0.45;
      this.closedBodyGroup.add(stalk);

      const mirror = new THREE.Mesh(mirrorHousingGeo, this.paintMat);
      mirror.position.set(side * 0.96, 0.65, -0.56);
      mirror.rotation.y = side * -0.18;
      mirror.castShadow = true;
      this.closedBodyGroup.add(mirror);
    }

    const headHousingGeo = createBeveledPlateGeometry(0.38, 0.13, 0.15, 0.03, 0.015);
    const projectorGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.11, 16);
    projectorGeo.rotateX(Math.PI / 2);
    const haloRingGeo = new THREE.TorusGeometry(0.052, 0.009, 10, 24);
    const drlGeo = createBeveledPlateGeometry(0.32, 0.022, 0.075, 0.008, 0.004);
    const cornerTurnGeo = createBeveledPlateGeometry(0.065, 0.055, 0.1, 0.015, 0.008);
    const fogBezelGeo = createBeveledPlateGeometry(0.15, 0.085, 0.09, 0.025, 0.01);
    const fogLampGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.055, 16);
    fogLampGeo.rotateX(Math.PI / 2);
    this.geometries.push(
      headHousingGeo,
      projectorGeo,
      haloRingGeo,
      drlGeo,
      cornerTurnGeo,
      fogBezelGeo,
      fogLampGeo,
    );

    for (const side of [-1, 1]) {
      const housing = new THREE.Mesh(headHousingGeo, this.tireMat);
      housing.position.set(side * 0.64, 0.36, -2.22);
      housing.rotation.y = side * -0.18;
      this.closedBodyGroup.add(housing);

      for (const offset of [-0.07, 0.07]) {
        const lx = side * 0.64 + offset;
        const lens = new THREE.Mesh(projectorGeo, this.headLampMat);
        lens.position.set(lx, 0.36, -2.262);
        this.closedBodyGroup.add(lens);

        const halo = new THREE.Mesh(haloRingGeo, this.headLampMat);
        halo.position.set(lx, 0.36, -2.306);
        this.closedBodyGroup.add(halo);
      }

      const drl = new THREE.Mesh(drlGeo, this.headLampMat);
      drl.position.set(side * 0.64, 0.415, -2.27);
      drl.rotation.y = side * -0.18;
      this.closedBodyGroup.add(drl);

      const turn = new THREE.Mesh(cornerTurnGeo, this.amberLampMat);
      turn.position.set(side * 0.81, 0.35, -2.185);
      this.closedBodyGroup.add(turn);

      const fogBezel = new THREE.Mesh(fogBezelGeo, this.tireMat);
      fogBezel.position.set(side * 0.68, 0.175, -2.26);
      fogBezel.rotation.y = side * -0.18;
      this.closedBodyGroup.add(fogBezel);

      const fogLamp = new THREE.Mesh(fogLampGeo, this.amberLampMat);
      fogLamp.position.set(side * 0.68, 0.175, -2.292);
      fogLamp.rotation.y = side * -0.18;
      this.closedBodyGroup.add(fogLamp);
    }

    const tailHousingGeo = createBeveledPlateGeometry(1.54, 0.145, 0.095, 0.035, 0.014);
    const tailLedGeo = createBeveledPlateGeometry(0.46, 0.038, 0.055, 0.012, 0.006);
    const centerLightBarGeo = createBeveledPlateGeometry(1.36, 0.024, 0.05, 0.008, 0.004);
    const reverseStripGeo = createBeveledPlateGeometry(0.16, 0.028, 0.055, 0.008, 0.005);
    const platePocketGeo = createBeveledPlateGeometry(0.46, 0.16, 0.075, 0.025, 0.01);
    const plateFaceGeo = createBeveledPlateGeometry(0.4, 0.12, 0.045, 0.015, 0.006);
    const diffuserBaseGeo = createAeroSplitterGeometry(1.48, 0.22);
    const strakeGeo = createSweptStrutGeometry(0.12, 0.2, 0.16, 0.034);
    this.geometries.push(
      tailHousingGeo,
      tailLedGeo,
      centerLightBarGeo,
      reverseStripGeo,
      platePocketGeo,
      plateFaceGeo,
      diffuserBaseGeo,
      strakeGeo,
    );

    const tailHousing = new THREE.Mesh(tailHousingGeo, this.tireMat);
    tailHousing.position.set(0, 0.41, 2.225);
    this.closedBodyGroup.add(tailHousing);

    const centerLightBar = new THREE.Mesh(centerLightBarGeo, this.tailBarMat);
    centerLightBar.position.set(0, 0.41, 2.255);
    this.closedBodyGroup.add(centerLightBar);

    for (const side of [-1, 1]) {
      const upperLed = new THREE.Mesh(tailLedGeo, this.tailBarMat);
      upperLed.position.set(side * 0.49, 0.44, 2.26);
      this.closedBodyGroup.add(upperLed);

      const lowerLed = new THREE.Mesh(tailLedGeo, this.tailBarMat);
      lowerLed.position.set(side * 0.49, 0.375, 2.26);
      this.closedBodyGroup.add(lowerLed);

      const reverseStrip = new THREE.Mesh(reverseStripGeo, this.amberLampMat);
      reverseStrip.position.set(side * 0.64, 0.408, 2.265);
      this.closedBodyGroup.add(reverseStrip);
    }

    const platePocket = new THREE.Mesh(platePocketGeo, this.secondaryMat);
    platePocket.position.set(0, 0.24, 2.235);
    this.closedBodyGroup.add(platePocket);

    const plateFace = new THREE.Mesh(plateFaceGeo, this.chromeMat);
    plateFace.position.set(0, 0.24, 2.26);
    this.closedBodyGroup.add(plateFace);

    const diffuserBase = new THREE.Mesh(diffuserBaseGeo, this.secondaryMat);
    diffuserBase.position.set(0, 0.085, 2.14);
    this.closedBodyGroup.add(diffuserBase);

    for (const sx of [-0.46, -0.16, 0.16, 0.46]) {
      const strake = new THREE.Mesh(strakeGeo, this.tireMat);
      strake.position.set(sx, 0.03, 2.17);
      this.closedBodyGroup.add(strake);
    }

    const pipeOuterGeo = new THREE.CylinderGeometry(0.072, 0.082, 0.26, 20);
    pipeOuterGeo.rotateX(Math.PI / 2);
    const pipeInnerGeo = new THREE.CylinderGeometry(0.056, 0.056, 0.06, 18);
    pipeInnerGeo.rotateX(Math.PI / 2);

    const createBackfireDartGeometry = (
      maxRadius: number,
      length: number,
    ): THREE.LatheGeometry => {
      const points: THREE.Vector2[] = [];
      const steps = 22;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const nozzleExpand = Math.sin(Math.min(1, t / 0.16) * (Math.PI * 0.5));
        const taper = Math.pow(Math.max(0, 1 - Math.max(0, t - 0.1) / 0.9), 1.45);
        const r = i === steps ? 0 : Math.max(0.0015, nozzleExpand * taper * maxRadius);
        points.push(new THREE.Vector2(r, t * length));
      }
      const geo = new THREE.LatheGeometry(points, 32);
      geo.rotateX(Math.PI / 2);
      return geo;
    };

    const outerFlameLength = 0.78;
    const innerFlameLength = 0.48;
    const outerDartGeo = createBackfireDartGeometry(0.062, outerFlameLength);
    const innerDartGeo = createBackfireDartGeometry(0.038, innerFlameLength);
    const boreGlowGeo = new THREE.CircleGeometry(0.052, 18);
    this.geometries.push(pipeOuterGeo, pipeInnerGeo, outerDartGeo, innerDartGeo, boreGlowGeo);

    const createBackfireMaterial = (
      length: number,
      seed: number,
      coreBias: number,
    ): THREE.ShaderMaterial => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uSeed: { value: seed },
          uLength: { value: length },
          uInnerColor: { value: this.flameInnerColor.clone() },
          uOuterColor: { value: this.flameOuterColor.clone() },
          uCoreBias: { value: coreBias },
        },
        vertexShader: `
          varying vec3 vViewNormal;
          varying vec3 vViewPos;
          varying float vAxial;
          uniform float uTime;
          uniform float uSeed;
          uniform float uLength;
          uniform float uIntensity;

          void main() {
            float t = clamp(position.z / max(0.001, uLength), 0.0, 1.0);
            vAxial = t;

            vec3 pos = position;
            float turbulence = t * t * clamp(uIntensity, 0.0, 1.3);
            float flutterX = sin(uTime * 36.0 + t * 8.5 + uSeed) * 0.016 * turbulence;
            float flutterY = cos(uTime * 32.0 + t * 7.6 + uSeed * 1.41) * 0.014 * turbulence;
            float pulse = 1.0 + 0.12 * sin(uTime * 46.0 - t * 13.0 + uSeed * 0.8);
            pos.xy = pos.xy * pulse + vec2(flutterX, flutterY);

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPos = -mvPosition.xyz;
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vViewNormal;
          varying vec3 vViewPos;
          varying float vAxial;
          uniform float uTime;
          uniform float uIntensity;
          uniform float uSeed;
          uniform vec3 uInnerColor;
          uniform vec3 uOuterColor;
          uniform float uCoreBias;

          void main() {
            if (uIntensity <= 0.005) discard;

            vec3 N = normalize(vViewNormal);
            vec3 V = normalize(vViewPos);
            float ndotv = abs(dot(N, V));

            float silhouetteSoft = smoothstep(0.0, mix(0.28, 0.2, uCoreBias), ndotv);
            float rootFade = smoothstep(0.0, 0.07, vAxial);
            float tipFade = pow(max(0.0, 1.0 - vAxial), mix(1.45, 1.2, uCoreBias));
            float machNodes = 0.78 + 0.22 * cos(vAxial * 18.0 - uTime * 54.0 + uSeed);

            vec3 nozzleHot = mix(vec3(0.85, 0.94, 1.0), vec3(1.0, 0.99, 0.9), clamp(uCoreBias * 0.65 + 0.35, 0.0, 1.0));
            vec3 midCol = mix(uInnerColor, uOuterColor, smoothstep(0.16, 0.74, vAxial));
            vec3 flameCol = mix(nozzleHot, midCol, smoothstep(0.04, 0.34, vAxial));
            flameCol = mix(flameCol, vec3(1.0, 1.0, 0.96), pow(ndotv, 1.6) * tipFade * (0.35 + 0.45 * uCoreBias));

            float alpha = silhouetteSoft * rootFade * tipFade * machNodes * mix(0.92, 1.0, uCoreBias) * clamp(uIntensity, 0.0, 1.2);
            gl_FragColor = vec4(flameCol, min(1.0, alpha));
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      this.materials.push(mat);
      return mat;
    };

    let pipeIdx = 0;
    for (const side of [-1, 1]) {
      for (const subOffset of [-0.085, 0.085]) {
        const px = side * 0.54 + subOffset;
        const pipe = new THREE.Mesh(pipeOuterGeo, this.chromeMat);
        pipe.position.set(px, 0.1, 2.18);
        this.closedBodyGroup.add(pipe);

        const innerBore = new THREE.Mesh(pipeInnerGeo, this.tireMat);
        innerBore.position.set(px, 0.1, 2.295);
        this.closedBodyGroup.add(innerBore);

        const boreGlowMat = new THREE.MeshBasicMaterial({
          color: initialSpec.flameInnerColor,
          map: textures.flameCoreGlow,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        this.materials.push(boreGlowMat);
        const boreGlow = new THREE.Mesh(boreGlowGeo, boreGlowMat);
        boreGlow.position.set(px, 0.1, 2.292);
        boreGlow.visible = false;
        this.closedBodyGroup.add(boreGlow);
        this.boreGlowMeshes.push(boreGlow);
        this.boreGlowMats.push(boreGlowMat);

        const seed = pipeIdx * 1.73 + 0.35;
        const outerMat = createBackfireMaterial(outerFlameLength, seed, 0.0);
        const outerDart = new THREE.Mesh(outerDartGeo, outerMat);
        outerDart.position.set(px, 0.1, 2.28);
        outerDart.visible = false;
        this.closedBodyGroup.add(outerDart);
        this.backfireOuterMeshes.push(outerDart);
        this.backfireOuterMats.push(outerMat);

        const innerMat = createBackfireMaterial(innerFlameLength, seed + 2.1, 1.0);
        const innerDart = new THREE.Mesh(innerDartGeo, innerMat);
        innerDart.position.set(px, 0.1, 2.29);
        innerDart.visible = false;
        this.closedBodyGroup.add(innerDart);
        this.backfireInnerMeshes.push(innerDart);
        this.backfireInnerMats.push(innerMat);

        pipeIdx += 1;
      }
    }

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

    this.buildWheels(0.35);

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

    this.group.position.set(0, 0, PLAYER_Z);
    this.bodyGroup.position.y = CAR_CHASSIS_CLEARANCE;
    this.applyCarSpec(initialSpec);
  }

  private buildWheels(wheelRadius: number): void {
    const tireWidth = 0.31;
    const tireGeo = createProfiledTireGeometry(wheelRadius, tireWidth, 32);
    const rimLipGeo = new THREE.TorusGeometry(wheelRadius * 0.635, 0.024, 12, 28);
    rimLipGeo.rotateY(Math.PI / 2);
    const rimBarrelGeo = createRimBarrelGeometry(wheelRadius, tireWidth);
    const hubGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.17,
      wheelRadius * 0.19,
      tireWidth * 0.86,
      18,
    );
    hubGeo.rotateZ(Math.PI / 2);
    const centerNutGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.085,
      wheelRadius * 0.085,
      tireWidth * 0.94,
      12,
    );
    centerNutGeo.rotateZ(Math.PI / 2);

    const spokeGeo = createSculptedSpokeGeometry(wheelRadius);
    const brakeDiscGeo = new THREE.CylinderGeometry(
      wheelRadius * 0.49,
      wheelRadius * 0.49,
      0.042,
      24,
    );
    brakeDiscGeo.rotateZ(Math.PI / 2);
    const caliperGeo = createBeveledPlateGeometry(0.075, 0.14, 0.11, 0.025, 0.012);

    this.geometries.push(
      tireGeo,
      rimLipGeo,
      rimBarrelGeo,
      hubGeo,
      centerNutGeo,
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

      const centerNut = new THREE.Mesh(centerNutGeo, this.caliperMat);
      centerNut.position.x = pos.side * 0.02;
      spinGroup.add(centerNut);

      const brakeDisc = new THREE.Mesh(brakeDiscGeo, this.chromeMat);
      brakeDisc.position.x = pos.side * -0.025;
      spinGroup.add(brakeDisc);

      for (let s = 0; s < 5; s++) {
        const baseAngle = (s * Math.PI * 2) / 5;
        for (const pairOffset of [-0.14, 0.14]) {
          const spoke = new THREE.Mesh(spokeGeo, this.rimMat);
          spoke.position.x = pos.side * (tireWidth * 0.25);
          spoke.rotation.x = baseAngle + pairOffset;
          spoke.rotation.z = pos.side * -0.16;
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
    const blowerBlockGeo = createBeveledPlateGeometry(0.38, 0.2, 0.52, 0.04, 0.02);
    const blowerScoopGeo = createRoofScoopGeometry(0.42, 0.15, 0.44);
    const intakeValveGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.06, 16);
    intakeValveGeo.rotateX(Math.PI / 2);
    const ducktailGeo = createAirfoilWingGeometry(1.66, 0.22, 0.055);
    this.geometries.push(blowerBlockGeo, blowerScoopGeo, intakeValveGeo, ducktailGeo);

    const blowerBlock = new THREE.Mesh(blowerBlockGeo, this.secondaryMat);
    blowerBlock.position.set(0, 0.68, -1.26);
    kit.add(blowerBlock);

    const scoop = new THREE.Mesh(blowerScoopGeo, this.chromeMat);
    scoop.position.set(0, 0.77, -1.27);
    scoop.castShadow = true;
    kit.add(scoop);

    for (const vx of [-0.12, 0, 0.12]) {
      const valve = new THREE.Mesh(intakeValveGeo, this.tailBarMat);
      valve.position.set(vx, 0.835, -1.48);
      kit.add(valve);
    }

    const ducktail = new THREE.Mesh(ducktailGeo, this.paintMat);
    ducktail.position.set(0, 0.65, 2.04);
    ducktail.rotation.x = 0.34;
    ducktail.castShadow = true;
    kit.add(ducktail);

    return kit;
  }

  private buildDriftWidebodyKit(): THREE.Group {
    const kit = new THREE.Group();
    const overfenderGeo = createFenderArchLinerGeometry(0.425, 0.525);
    const hoodVentGeo = createBeveledPlateGeometry(0.68, 0.032, 0.42, 0.03, 0.008);
    const driftWingGeo = createAirfoilWingGeometry(1.9, 0.3, 0.048);
    const wingPostGeo = createSweptStrutGeometry(0.25, 0.19, 0.13, 0.045);
    const endplateGeo = createWingEndplateGeometry(0.36, 0.2, 0.038);
    this.geometries.push(overfenderGeo, hoodVentGeo, driftWingGeo, wingPostGeo, endplateGeo);

    for (const side of [-1, 1]) {
      for (const wz of [-1.36, 1.34]) {
        const flare = new THREE.Mesh(overfenderGeo, this.secondaryMat);
        flare.position.set(side * 1.01, 0.22, wz);
        kit.add(flare);
      }

      const post = new THREE.Mesh(wingPostGeo, this.secondaryMat);
      post.position.set(side * 0.58, 0.59, 1.97);
      kit.add(post);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.96, 0.83, 2.0);
      kit.add(plate);
    }

    const hoodVent = new THREE.Mesh(hoodVentGeo, this.secondaryMat);
    hoodVent.position.set(0, 0.596, -1.36);
    hoodVent.rotation.x = 0.07;
    kit.add(hoodVent);

    const wing = new THREE.Mesh(driftWingGeo, this.paintMat);
    wing.position.set(0, 0.84, 2.01);
    wing.rotation.x = 0.11;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildOureaElectricKit(): THREE.Group {
    const kit = new THREE.Group();
    const evNoseBarGeo = createBeveledPlateGeometry(1.3, 0.036, 0.065, 0.015, 0.006);
    const roofFinGeo = createDorsalFinGeometry(0.68, 0.14, 0.038);
    const rearBladeGeo = createAirfoilWingGeometry(1.74, 0.22, 0.042);
    const diffuserGeo = createBeveledPlateGeometry(1.36, 0.075, 0.13, 0.025, 0.012);
    const sideAccentGeo = createBeveledPlateGeometry(0.026, 0.028, 1.62, 0.01, 0.006);
    this.geometries.push(evNoseBarGeo, roofFinGeo, rearBladeGeo, diffuserGeo, sideAccentGeo);

    const noseBar = new THREE.Mesh(evNoseBarGeo, this.stripeMat);
    noseBar.position.set(0, 0.32, -2.23);
    kit.add(noseBar);

    for (const side of [-1, 1]) {
      const accent = new THREE.Mesh(sideAccentGeo, this.stripeMat);
      accent.position.set(side * 0.91, 0.2, 0.04);
      kit.add(accent);
    }

    const roofFin = new THREE.Mesh(roofFinGeo, this.stripeMat);
    roofFin.position.set(0, 0.985, 0.34);
    kit.add(roofFin);

    const rearBlade = new THREE.Mesh(rearBladeGeo, this.secondaryMat);
    rearBlade.position.set(0, 0.65, 2.02);
    rearBlade.rotation.x = 0.22;
    kit.add(rearBlade);

    const diffuser = new THREE.Mesh(diffuserGeo, this.stripeMat);
    diffuser.position.set(0, 0.075, 2.21);
    kit.add(diffuser);

    return kit;
  }

  private buildMagnetarSuperKit(): THREE.Group {
    const kit = new THREE.Group();
    const intakePodGeo = createSideIntakePodGeometry(1.02, 0.26, 0.14);
    const deckLouverGeo = createBeveledPlateGeometry(0.98, 0.03, 0.1, 0.012, 0.005);
    const splitterGeo = createAeroSplitterGeometry(1.94, 0.26);
    const wingGeo = createAirfoilWingGeometry(1.94, 0.32, 0.05);
    const strutGeo = createSweptStrutGeometry(0.28, 0.2, 0.14, 0.044);
    const endplateGeo = createWingEndplateGeometry(0.34, 0.18, 0.035);
    this.geometries.push(intakePodGeo, deckLouverGeo, splitterGeo, wingGeo, strutGeo, endplateGeo);

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(intakePodGeo, this.secondaryMat);
      pod.position.set(side * 0.92, 0.37, 0.44);
      kit.add(pod);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.54, 0.61, 1.95);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.97, 0.89, 2.0);
      kit.add(plate);
    }

    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(deckLouverGeo, this.secondaryMat);
      slat.position.set(0, 0.815 - i * 0.045, 0.88 + i * 0.2);
      slat.rotation.x = -0.18;
      kit.add(slat);
    }

    const splitter = new THREE.Mesh(splitterGeo, this.stripeMat);
    splitter.position.set(0, 0.06, -2.25);
    kit.add(splitter);

    const wing = new THREE.Mesh(wingGeo, this.paintMat);
    wing.position.set(0, 0.9, 2.0);
    wing.rotation.x = 0.09;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildCerberoRacerKit(): THREE.Group {
    const kit = new THREE.Group();
    const snorkelGeo = createRoofScoopGeometry(0.28, 0.15, 0.74);
    const canardGeo = createAirfoilWingGeometry(0.24, 0.28, 0.032);
    const strutGeo = createSweptStrutGeometry(0.36, 0.21, 0.14, 0.046);
    const gtWingGeo = createAirfoilWingGeometry(2.04, 0.35, 0.052);
    const endplateGeo = createWingEndplateGeometry(0.42, 0.24, 0.04);
    const splitterGeo = createAeroSplitterGeometry(1.98, 0.28);
    this.geometries.push(snorkelGeo, canardGeo, strutGeo, gtWingGeo, endplateGeo, splitterGeo);

    const snorkel = new THREE.Mesh(snorkelGeo, this.secondaryMat);
    snorkel.position.set(0, 0.948, 0.18);
    kit.add(snorkel);

    const splitter = new THREE.Mesh(splitterGeo, this.stripeMat);
    splitter.position.set(0, 0.06, -2.26);
    kit.add(splitter);

    for (const side of [-1, 1]) {
      const canard = new THREE.Mesh(canardGeo, this.stripeMat);
      canard.position.set(side * 0.93, 0.22, -2.02);
      canard.rotation.z = side * -0.2;
      canard.rotation.x = 0.14;
      kit.add(canard);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.56, 0.61, 1.96);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 1.02, 0.96, 2.01);
      kit.add(plate);
    }

    const gtWing = new THREE.Mesh(gtWingGeo, this.secondaryMat);
    gtWing.position.set(0, 0.97, 2.01);
    gtWing.rotation.x = 0.08;
    gtWing.castShadow = true;
    kit.add(gtWing);

    return kit;
  }

  private buildChironRallyKit(): THREE.Group {
    const kit = new THREE.Group();
    const rackGeo = createBeveledPlateGeometry(1.04, 0.085, 0.72, 0.04, 0.015);
    const lampPodGeo = new THREE.CylinderGeometry(0.072, 0.078, 0.11, 18);
    lampPodGeo.rotateX(Math.PI / 2);
    const lampLensGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.03, 18);
    lampLensGeo.rotateX(Math.PI / 2);
    const bullBarGeo = new THREE.CapsuleGeometry(0.045, 1.04, 6, 12);
    bullBarGeo.rotateZ(Math.PI / 2);
    const mudflapGeo = createBeveledPlateGeometry(0.3, 0.2, 0.04, 0.02, 0.008);
    const rallyWingGeo = createAirfoilWingGeometry(1.76, 0.26, 0.048);
    const rallyPostGeo = createSweptStrutGeometry(0.18, 0.18, 0.13, 0.045);
    this.geometries.push(
      rackGeo,
      lampPodGeo,
      lampLensGeo,
      bullBarGeo,
      mudflapGeo,
      rallyWingGeo,
      rallyPostGeo,
    );

    const rack = new THREE.Mesh(rackGeo, this.secondaryMat);
    rack.position.set(0, 1.09, 0.2);
    kit.add(rack);

    for (const lx of [-0.36, -0.12, 0.12, 0.36]) {
      const pod = new THREE.Mesh(lampPodGeo, this.secondaryMat);
      pod.position.set(lx, 1.13, -0.17);
      kit.add(pod);

      const lens = new THREE.Mesh(lampLensGeo, this.headLampMat);
      lens.position.set(lx, 1.13, -0.22);
      kit.add(lens);
    }

    const bullBar = new THREE.Mesh(bullBarGeo, this.chromeMat);
    bullBar.position.set(0, 0.24, -2.27);
    kit.add(bullBar);

    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(mudflapGeo, this.stripeMat);
      flap.position.set(side * 0.96, 0.0, 1.72);
      kit.add(flap);

      const post = new THREE.Mesh(rallyPostGeo, this.secondaryMat);
      post.position.set(side * 0.56, 0.58, 1.98);
      kit.add(post);
    }

    const rallyWing = new THREE.Mesh(rallyWingGeo, this.stripeMat);
    rallyWing.position.set(0, 0.76, 2.04);
    rallyWing.rotation.x = 0.09;
    rallyWing.castShadow = true;
    kit.add(rallyWing);

    return kit;
  }

  private buildSpectraWtypeKit(): THREE.Group {
    const kit = new THREE.Group();
    const nacaVentGeo = createBeveledPlateGeometry(0.28, 0.028, 0.36, 0.025, 0.008);
    const sideBladeGeo = createSideIntakePodGeometry(1.24, 0.16, 0.09);
    const engineLouverGeo = createBeveledPlateGeometry(0.94, 0.026, 0.1, 0.01, 0.005);
    const wingBladeGeo = createAirfoilWingGeometry(1.9, 0.29, 0.046);
    const wingStanchionGeo = createSweptStrutGeometry(0.26, 0.18, 0.13, 0.042);
    const endplateGeo = createWingEndplateGeometry(0.32, 0.18, 0.036);
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
      vent.position.set(side * 0.38, 0.596, -1.36);
      vent.rotation.x = 0.09;
      kit.add(vent);

      const blade = new THREE.Mesh(sideBladeGeo, this.secondaryMat);
      blade.position.set(side * 0.91, 0.24, 0.12);
      kit.add(blade);

      const stanchion = new THREE.Mesh(wingStanchionGeo, this.secondaryMat);
      stanchion.position.set(side * 0.52, 0.61, 1.95);
      kit.add(stanchion);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.95, 0.86, 2.0);
      kit.add(plate);
    }

    for (let i = 0; i < 4; i++) {
      const louver = new THREE.Mesh(engineLouverGeo, this.secondaryMat);
      louver.position.set(0, 0.81 - i * 0.042, 0.9 + i * 0.19);
      louver.rotation.x = -0.18;
      kit.add(louver);
    }

    const wing = new THREE.Mesh(wingBladeGeo, this.paintMat);
    wing.position.set(0, 0.87, 2.0);
    wing.rotation.x = 0.1;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildJanusRacerKit(): THREE.Group {
    const kit = new THREE.Group();
    const noseSplitterGeo = createAeroSplitterGeometry(1.94, 0.27);
    const hoodPadGeo = createBeveledPlateGeometry(0.7, 0.025, 0.54, 0.03, 0.008);
    const vortexGeo = createDorsalFinGeometry(0.16, 0.065, 0.028);
    const strutGeo = createSweptStrutGeometry(0.34, 0.2, 0.14, 0.044);
    const wingGeo = createAirfoilWingGeometry(1.98, 0.34, 0.05);
    const endplateGeo = createWingEndplateGeometry(0.38, 0.22, 0.038);
    this.geometries.push(
      noseSplitterGeo,
      hoodPadGeo,
      vortexGeo,
      strutGeo,
      wingGeo,
      endplateGeo,
    );

    const splitter = new THREE.Mesh(noseSplitterGeo, this.stripeMat);
    splitter.position.set(0, 0.065, -2.25);
    kit.add(splitter);

    const hoodPad = new THREE.Mesh(hoodPadGeo, this.secondaryMat);
    hoodPad.position.set(0, 0.565, -1.42);
    hoodPad.rotation.x = 0.08;
    kit.add(hoodPad);

    for (const vx of [-0.34, -0.11, 0.11, 0.34]) {
      const fin = new THREE.Mesh(vortexGeo, this.stripeMat);
      fin.position.set(vx, 0.97, 0.44);
      kit.add(fin);
    }

    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.56, 0.61, 1.96);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 0.99, 0.94, 2.01);
      kit.add(plate);
    }

    const wing = new THREE.Mesh(wingGeo, this.paintMat);
    wing.position.set(0, 0.95, 2.01);
    wing.rotation.x = 0.09;
    wing.castShadow = true;
    kit.add(wing);

    return kit;
  }

  private buildChronosProtoKit(): THREE.Group {
    const kit = new THREE.Group();
    const scoopGeo = createRoofScoopGeometry(0.28, 0.14, 0.68);
    const dorsalFinGeo = createDorsalFinGeometry(1.24, 0.28, 0.038);
    const fenderVentGeo = createBeveledPlateGeometry(0.22, 0.032, 0.34, 0.02, 0.008);
    const splitterGeo = createAeroSplitterGeometry(2.0, 0.28);
    const upperWingGeo = createAirfoilWingGeometry(2.04, 0.32, 0.048);
    const lowerWingGeo = createAirfoilWingGeometry(1.94, 0.22, 0.038);
    const strutGeo = createSweptStrutGeometry(0.38, 0.22, 0.14, 0.045);
    const endplateGeo = createWingEndplateGeometry(0.42, 0.28, 0.042);
    this.geometries.push(
      scoopGeo,
      dorsalFinGeo,
      fenderVentGeo,
      splitterGeo,
      upperWingGeo,
      lowerWingGeo,
      strutGeo,
      endplateGeo,
    );

    const splitter = new THREE.Mesh(splitterGeo, this.stripeMat);
    splitter.position.set(0, 0.055, -2.26);
    kit.add(splitter);

    const scoop = new THREE.Mesh(scoopGeo, this.secondaryMat);
    scoop.position.set(0, 0.93, 0.14);
    kit.add(scoop);

    const dorsalFin = new THREE.Mesh(dorsalFinGeo, this.stripeMat);
    dorsalFin.position.set(0, 0.60, 1.06);
    kit.add(dorsalFin);

    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(fenderVentGeo, this.secondaryMat);
      vent.position.set(side * 0.66, 0.642, -1.36);
      kit.add(vent);

      const strut = new THREE.Mesh(strutGeo, this.secondaryMat);
      strut.position.set(side * 0.54, 0.61, 1.96);
      kit.add(strut);

      const plate = new THREE.Mesh(endplateGeo, this.stripeMat);
      plate.position.set(side * 1.02, 0.93, 2.02);
      kit.add(plate);
    }

    const lowerWing = new THREE.Mesh(lowerWingGeo, this.stripeMat);
    lowerWing.position.set(0, 0.82, 2.02);
    lowerWing.rotation.x = 0.05;
    kit.add(lowerWing);

    const upperWing = new THREE.Mesh(upperWingGeo, this.secondaryMat);
    upperWing.position.set(0, 1.0, 2.03);
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
    this.flameOuterColor.setHex(spec.flameOuterColor);
    this.flameInnerColor.setHex(spec.flameInnerColor);
    for (const mat of this.backfireOuterMats) {
      (mat.uniforms.uOuterColor.value as THREE.Color).copy(this.flameOuterColor);
      (mat.uniforms.uInnerColor.value as THREE.Color).copy(this.flameInnerColor);
    }
    for (const mat of this.backfireInnerMats) {
      (mat.uniforms.uOuterColor.value as THREE.Color).copy(this.flameOuterColor);
      (mat.uniforms.uInnerColor.value as THREE.Color).copy(this.flameInnerColor);
    }
    for (const mat of this.boreGlowMats) {
      mat.color.setHex(spec.flameInnerColor);
    }
    this.headlightGlow.color.setHex(spec.headlightColor);

    const targetShell = STYLE_TO_SHELL[spec.bodyStyle];
    for (const [family, shellGroup] of this.shellGroups.entries()) {
      shellGroup.visible = family === targetShell;
    }

    const styles = Object.keys(this.styleGroups) as CarBodyStyle[];
    for (const style of styles) {
      this.styleGroups[style].visible = style === spec.bodyStyle;
    }

    this.activeWheelRadius = spec.wheelRadius;
    const wheelScale = spec.wheelRadius / 0.35;
    for (const wheel of this.wheels) {
      wheel.steerPivot.scale.setScalar(wheelScale);
      wheel.steerPivot.position.y = spec.wheelRadius;
    }
    this.rideHeightOffset = spec.bodyStyle === 'chiron_rally' ? 0.025 : 0;
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
    isCrashed: boolean,
    phase = 0,
    flameIntensity: number | readonly number[] = 0,
  ): void {
    this.group.position.x = x;
    this.bodyGroup.position.y =
      CAR_CHASSIS_CLEARANCE + this.rideHeightOffset + suspensionOffset;
    this.bodyGroup.rotation.set(pitch, yaw, roll);

    for (const wheel of this.wheels) {
      wheel.spinGroup.rotation.x = wheelAngle;
      if (wheel.isFront) {
        wheel.steerPivot.rotation.y = isCrashed ? 0.25 : steerAngle;
      }
      wheel.steerPivot.position.y = this.activeWheelRadius;
    }

    if (isCrashed) {
      for (const mesh of this.backfireOuterMeshes) mesh.visible = false;
      for (const mesh of this.backfireInnerMeshes) mesh.visible = false;
      for (const mesh of this.boreGlowMeshes) mesh.visible = false;
      return;
    }

    const boostFloor = isBoosting ? 0.92 : 0;
    for (let i = 0; i < this.backfireOuterMeshes.length; i++) {
      const pipeInput = Array.isArray(flameIntensity)
        ? (flameIntensity[i] ?? 0)
        : (flameIntensity as number);
      const intensity = Math.max(boostFloor, Math.min(1.3, pipeInput));
      const visible = intensity > 0.02;

      const outerMesh = this.backfireOuterMeshes[i];
      const innerMesh = this.backfireInnerMeshes[i];
      const boreMesh = this.boreGlowMeshes[i];
      outerMesh.visible = visible;
      if (innerMesh) innerMesh.visible = visible;
      if (boreMesh) boreMesh.visible = visible;

      if (visible) {
        const flicker =
          Math.sin(phase * 16.0 + i * 1.9) * 0.55 + Math.cos(phase * 25.0 + i * 2.7) * 0.45;
        const lenScale = (0.48 + intensity * 0.72) * (0.94 + flicker * 0.12);
        const radScale = (0.72 + intensity * 0.32) * (0.95 + flicker * 0.08);

        outerMesh.scale.set(radScale, radScale, lenScale);
        this.backfireOuterMats[i].uniforms.uTime.value = phase;
        this.backfireOuterMats[i].uniforms.uIntensity.value = intensity * (0.92 + flicker * 0.1);

        if (innerMesh) {
          innerMesh.scale.set(radScale * 0.94, radScale * 0.94, lenScale * 0.98);
          this.backfireInnerMats[i].uniforms.uTime.value = phase;
          this.backfireInnerMats[i].uniforms.uIntensity.value = intensity * (0.98 + flicker * 0.08);
        }

        const boreMat = this.boreGlowMats[i];
        if (boreMat) {
          boreMat.opacity = Math.min(0.88, intensity * (0.58 + flicker * 0.14));
        }
      }
    }

    this.tailBarMat.emissiveIntensity = 0.55;
    this.headlightGlow.intensity = isBoosting ? 2.3 : isThrottling ? 1.85 : 1.55;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
