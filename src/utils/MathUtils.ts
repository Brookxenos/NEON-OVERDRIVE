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
