import type { PoseLandmark } from "./poseTypes";

/** Angle in degrees at vertex `b` formed by the vectors (a-b) and (c-b). Result is [0, 180]. */
export function angleDeg(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const cx = c.x - b.x;
  const cy = c.y - b.y;
  const dot = ax * cx + ay * cy;
  const cross = ax * cy - ay * cx;
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
}

export function distance(a: PoseLandmark, b: PoseLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Signed vertical distance (a.y - b.y) normalized against the reference length. */
export function normalizedVerticalDelta(a: PoseLandmark, b: PoseLandmark, referenceLength: number): number {
  if (referenceLength <= 0) return 0;
  return (a.y - b.y) / referenceLength;
}

/** Standard deviation of a numeric sample from a reference value (for straightness checks). */
export function deviationFromStraight(angleAtJoint: number): number {
  return Math.abs(180 - angleAtJoint);
}

export { distance as normDistance };