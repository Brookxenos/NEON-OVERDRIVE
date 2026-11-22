import * as THREE from 'three';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function aabbIntersects2D(
  ax: number,
  az: number,
  aHalfW: number,
  aHalfZ: number,
  bx: number,
  bz: number,
  bHalfW: number,
  bHalfZ: number,
): boolean {
  return Math.abs(ax - bx) < aHalfW + bHalfW && Math.abs(az - bz) < aHalfZ + bHalfZ;
}

export function sweptAabbIntersects2D(
  ax0: number,
  az0: number,
  ax1: number,
  az1: number,
  aHalfW: number,
  aHalfZ: number,
  bx0: number,
  bz0: number,
  bx1: number,
  bz1: number,
  bHalfW: number,
  bHalfZ: number,
): number | null {
  const sumW = aHalfW + bHalfW;
  const sumZ = aHalfZ + bHalfZ;

  const dx0 = ax0 - bx0;
  const dx1 = ax1 - bx1;
  const vx = dx1 - dx0;

  let txEnter = 0;
  let txExit = 1;

  if (Math.abs(vx) < 1e-8) {
    if (Math.abs(dx0) >= sumW) return null;
  } else {
    const t0 = (-sumW - dx0) / vx;
    const t1 = (sumW - dx0) / vx;
    const axisMin = Math.min(t0, t1);
    const axisMax = Math.max(t0, t1);
    if (axisMax <= 0 || axisMin >= 1) return null;
    txEnter = Math.max(0, axisMin);
    txExit = Math.min(1, axisMax);
  }

  const dz0 = az0 - bz0;
  const dz1 = az1 - bz1;
  const vz = dz1 - dz0;

  let tzEnter = 0;
  let tzExit = 1;

  if (Math.abs(vz) < 1e-8) {
    if (Math.abs(dz0) >= sumZ) return null;
  } else {
    const t0 = (-sumZ - dz0) / vz;
    const t1 = (sumZ - dz0) / vz;
    const axisMin = Math.min(t0, t1);
    const axisMax = Math.max(t0, t1);
    if (axisMax <= 0 || axisMin >= 1) return null;
    tzEnter = Math.max(0, axisMin);
    tzExit = Math.min(1, axisMax);
  }

  const tEnter = Math.max(txEnter, tzEnter);
  const tExit = Math.min(txExit, tzExit);

  if (tEnter < tExit || (tEnter === tExit && tEnter >= 0 && tEnter <= 1)) {
    return tEnter;
  }
  return null;
}
