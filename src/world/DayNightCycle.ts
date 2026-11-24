import * as THREE from 'three';

export const DAY_NIGHT_CYCLE_SECONDS = 480;

export interface DayNightSample {
  readonly hemiSky: THREE.Color;
  readonly hemiGround: THREE.Color;
  hemiIntensity: number;
  readonly keyColor: THREE.Color;
  keyIntensity: number;
  readonly keyPosition: THREE.Vector3;
  readonly fillColor: THREE.Color;
  fillIntensity: number;
  readonly bgColor: THREE.Color;
  readonly fogColor: THREE.Color;
  readonly skyTint: THREE.Color;
  readonly shimmerColor: THREE.Color;
  envIntensity: number;
  nightAmount: number;
}

interface CycleKeyframe {
  phase: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  keyColor: THREE.Color;
  keyIntensity: number;
  keyPosition: THREE.Vector3;
  fillColor: THREE.Color;
  fillIntensity: number;
  bgColor: THREE.Color;
  fogColor: THREE.Color;
  skyTint: THREE.Color;
  shimmerColor: THREE.Color;
  envIntensity: number;
  nightAmount: number;
}

const CYCLE_KEYFRAMES: readonly CycleKeyframe[] = [
  {
    phase: 0.0,
    hemiSky: new THREE.Color(0xffe1b8),
    hemiGround: new THREE.Color(0x8578a8),
    hemiIntensity: 1.25,
    keyColor: new THREE.Color(0xffd49e),
    keyIntensity: 2.35,
    keyPosition: new THREE.Vector3(28, 16, -24),
    fillColor: new THREE.Color(0xa5b4fc),
    fillIntensity: 0.72,
    bgColor: new THREE.Color(0xf2a582),
    fogColor: new THREE.Color(0xdf979c),
    skyTint: new THREE.Color(0xffffff),
    shimmerColor: new THREE.Color(0xf7b99b),
    envIntensity: 0.12,
    nightAmount: 0,
  },
  {
    phase: 0.175,
    hemiSky: new THREE.Color(0xffe1b8),
    hemiGround: new THREE.Color(0x8578a8),
    hemiIntensity: 1.25,
    keyColor: new THREE.Color(0xffd49e),
    keyIntensity: 2.35,
    keyPosition: new THREE.Vector3(28, 16, -24),
    fillColor: new THREE.Color(0xa5b4fc),
    fillIntensity: 0.72,
    bgColor: new THREE.Color(0xf2a582),
    fogColor: new THREE.Color(0xdf979c),
    skyTint: new THREE.Color(0xffffff),
    shimmerColor: new THREE.Color(0xf7b99b),
    envIntensity: 0.12,
    nightAmount: 0,
  },
  {
    phase: 0.25,
    hemiSky: new THREE.Color(0xffa07a),
    hemiGround: new THREE.Color(0x593d78),
    hemiIntensity: 0.98,
    keyColor: new THREE.Color(0xff844b),
    keyIntensity: 1.95,
    keyPosition: new THREE.Vector3(34, 9, -20),
    fillColor: new THREE.Color(0x818cf8),
    fillIntensity: 0.68,
    bgColor: new THREE.Color(0xd46a7e),
    fogColor: new THREE.Color(0x9e5888),
    skyTint: new THREE.Color(0xd996a8),
    shimmerColor: new THREE.Color(0xf472b6),
    envIntensity: 0.11,
    nightAmount: 0.2,
  },
  {
    phase: 0.425,
    hemiSky: new THREE.Color(0xffa07a),
    hemiGround: new THREE.Color(0x593d78),
    hemiIntensity: 0.98,
    keyColor: new THREE.Color(0xff844b),
    keyIntensity: 1.95,
    keyPosition: new THREE.Vector3(34, 9, -20),
    fillColor: new THREE.Color(0x818cf8),
    fillIntensity: 0.68,
    bgColor: new THREE.Color(0xd46a7e),
    fogColor: new THREE.Color(0x9e5888),
    skyTint: new THREE.Color(0xd996a8),
    shimmerColor: new THREE.Color(0xf472b6),
    envIntensity: 0.11,
    nightAmount: 0.2,
  },
  {
    phase: 0.465,
    hemiSky: new THREE.Color(0x6d74b8),
    hemiGround: new THREE.Color(0x2b224a),
    hemiIntensity: 0.68,
    keyColor: new THREE.Color(0x93a8ff),
    keyIntensity: 1.35,
    keyPosition: new THREE.Vector3(14, 14, -26),
    fillColor: new THREE.Color(0x6366f1),
    fillIntensity: 0.64,
    bgColor: new THREE.Color(0x3a3768),
    fogColor: new THREE.Color(0x332e5c),
    skyTint: new THREE.Color(0x686ca8),
    shimmerColor: new THREE.Color(0x818cf8),
    envIntensity: 0.1,
    nightAmount: 0.68,
  },
  {
    phase: 0.5,
    hemiSky: new THREE.Color(0x2f437d),
    hemiGround: new THREE.Color(0x110e24),
    hemiIntensity: 0.45,
    keyColor: new THREE.Color(0x8bb4ff),
    keyIntensity: 1.05,
    keyPosition: new THREE.Vector3(-22, 22, -24),
    fillColor: new THREE.Color(0x38bdf8),
    fillIntensity: 0.62,
    bgColor: new THREE.Color(0x0d132b),
    fogColor: new THREE.Color(0x111736),
    skyTint: new THREE.Color(0x22294d),
    shimmerColor: new THREE.Color(0x38bdf8),
    envIntensity: 0.09,
    nightAmount: 1,
  },
  {
    phase: 0.675,
    hemiSky: new THREE.Color(0x2f437d),
    hemiGround: new THREE.Color(0x110e24),
    hemiIntensity: 0.45,
    keyColor: new THREE.Color(0x8bb4ff),
    keyIntensity: 1.05,
    keyPosition: new THREE.Vector3(-22, 22, -24),
    fillColor: new THREE.Color(0x38bdf8),
    fillIntensity: 0.62,
    bgColor: new THREE.Color(0x0d132b),
    fogColor: new THREE.Color(0x111736),
    skyTint: new THREE.Color(0x22294d),
    shimmerColor: new THREE.Color(0x38bdf8),
    envIntensity: 0.09,
    nightAmount: 1,
  },
  {
    phase: 0.75,
    hemiSky: new THREE.Color(0xf7b2c4),
    hemiGround: new THREE.Color(0x53457d),
    hemiIntensity: 0.92,
    keyColor: new THREE.Color(0xffb899),
    keyIntensity: 1.85,
    keyPosition: new THREE.Vector3(-30, 11, -22),
    fillColor: new THREE.Color(0x93c5fd),
    fillIntensity: 0.7,
    bgColor: new THREE.Color(0xd88ca0),
    fogColor: new THREE.Color(0xb87ea2),
    skyTint: new THREE.Color(0xdeb6c8),
    shimmerColor: new THREE.Color(0xfbbf24),
    envIntensity: 0.11,
    nightAmount: 0.25,
  },
  {
    phase: 0.925,
    hemiSky: new THREE.Color(0xf7b2c4),
    hemiGround: new THREE.Color(0x53457d),
    hemiIntensity: 0.92,
    keyColor: new THREE.Color(0xffb899),
    keyIntensity: 1.85,
    keyPosition: new THREE.Vector3(-30, 11, -22),
    fillColor: new THREE.Color(0x93c5fd),
    fillIntensity: 0.7,
    bgColor: new THREE.Color(0xd88ca0),
    fogColor: new THREE.Color(0xb87ea2),
    skyTint: new THREE.Color(0xdeb6c8),
    shimmerColor: new THREE.Color(0xfbbf24),
    envIntensity: 0.11,
    nightAmount: 0.25,
  },
];

export function createDayNightSample(): DayNightSample {
  return {
    hemiSky: new THREE.Color(0xffe1b8),
    hemiGround: new THREE.Color(0x8578a8),
    hemiIntensity: 1.25,
    keyColor: new THREE.Color(0xffd49e),
    keyIntensity: 2.35,
    keyPosition: new THREE.Vector3(28, 16, -24),
    fillColor: new THREE.Color(0xa5b4fc),
    fillIntensity: 0.72,
    bgColor: new THREE.Color(0xf2a582),
    fogColor: new THREE.Color(0xdf979c),
    skyTint: new THREE.Color(0xffffff),
    shimmerColor: new THREE.Color(0xf7b99b),
    envIntensity: 0.12,
    nightAmount: 0,
  };
}

export function sampleDayNightCycle(raceDurationSeconds: number, out: DayNightSample): void {
  const safeDuration = Math.max(0, raceDurationSeconds);
  const phase = (safeDuration % DAY_NIGHT_CYCLE_SECONDS) / DAY_NIGHT_CYCLE_SECONDS;

  let prev = CYCLE_KEYFRAMES[CYCLE_KEYFRAMES.length - 1];
  let next = CYCLE_KEYFRAMES[0];
  let spanStart = prev.phase;
  let spanEnd = 1.0;

  for (let i = 0; i < CYCLE_KEYFRAMES.length; i++) {
    const curr = CYCLE_KEYFRAMES[i];
    const following = i + 1 < CYCLE_KEYFRAMES.length ? CYCLE_KEYFRAMES[i + 1] : CYCLE_KEYFRAMES[0];
    const endPhase = i + 1 < CYCLE_KEYFRAMES.length ? following.phase : 1.0;
    if (phase >= curr.phase && phase <= endPhase) {
      prev = curr;
      next = following;
      spanStart = curr.phase;
      spanEnd = endPhase;
      break;
    }
  }

  const rawAlpha = spanEnd > spanStart ? (phase - spanStart) / (spanEnd - spanStart) : 0;
  const alpha = rawAlpha * rawAlpha * (3 - 2 * rawAlpha);

  out.hemiSky.copy(prev.hemiSky).lerp(next.hemiSky, alpha);
  out.hemiGround.copy(prev.hemiGround).lerp(next.hemiGround, alpha);
  out.hemiIntensity = THREE.MathUtils.lerp(prev.hemiIntensity, next.hemiIntensity, alpha);

  out.keyColor.copy(prev.keyColor).lerp(next.keyColor, alpha);
  out.keyIntensity = THREE.MathUtils.lerp(prev.keyIntensity, next.keyIntensity, alpha);
  out.keyPosition.copy(prev.keyPosition).lerp(next.keyPosition, alpha);

  out.fillColor.copy(prev.fillColor).lerp(next.fillColor, alpha);
  out.fillIntensity = THREE.MathUtils.lerp(prev.fillIntensity, next.fillIntensity, alpha);

  out.bgColor.copy(prev.bgColor).lerp(next.bgColor, alpha);
  out.fogColor.copy(prev.fogColor).lerp(next.fogColor, alpha);
  out.skyTint.copy(prev.skyTint).lerp(next.skyTint, alpha);
  out.shimmerColor.copy(prev.shimmerColor).lerp(next.shimmerColor, alpha);
  out.envIntensity = THREE.MathUtils.lerp(prev.envIntensity, next.envIntensity, alpha);
  out.nightAmount = THREE.MathUtils.lerp(prev.nightAmount, next.nightAmount, alpha);
}
