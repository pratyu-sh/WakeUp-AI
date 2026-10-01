import { angleDeg, deviationFromStraight, distance, normalizedVerticalDelta } from "../pose/angleUtils";
import type { PoseFrame } from "../pose/poseTypes";

export interface FrameMetrics {
  /** Whether shoulder/elbow/wrist landmarks are all present. */
  hasUpperBody: boolean;
  /** Whether hip/knee/ankle landmarks are all present. */
  hasLowerBody: boolean;
  elbowMin: number;
  elbowMax: number;
  elbowAvg: number;
  kneeMin: number;
  kneeMax: number;
  shoulderYAvg: number;
  hipYAvg: number;
  wristYAvg: number;
  bodySize: number;
  /**
   * Deviation of the torso line from straight, measured at the hip
   * between shoulder, hip and ankle/knee (degrees, 0 = perfectly straight).
   */
  bodyDeviation: number;
  /** Vertical drop of the wrists below the shoulders, normalized by body size. */
  shoulderDepth: number;
  /** Shoulder-to-hip vertical distance normalized by body size (positive = hips below shoulders). */
  hipDrop: number;
}

function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function mid(values: Array<{ x: number; y: number }>): { x: number; y: number } {
  return { x: avg(values.map((v) => v.x)), y: avg(values.map((v) => v.y)) };
}

/** Computes repeatable, per-frame metrics that all exercise detectors share. */
export function computeFrameMetrics(frame: PoseFrame): FrameMetrics {
  const {
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
  } = frame;

  const shoulder = [leftShoulder, rightShoulder].filter(Boolean) as NonNullable<typeof leftShoulder>[];
  const elbow = [leftElbow, rightElbow].filter(Boolean) as NonNullable<typeof leftElbow>[];
  const wrist = [leftWrist, rightWrist].filter(Boolean) as NonNullable<typeof leftWrist>[];
  const hip = [leftHip, rightHip].filter(Boolean) as NonNullable<typeof leftHip>[];
  const knee = [leftKnee, rightKnee].filter(Boolean) as NonNullable<typeof leftKnee>[];
  const ankle = [leftAnkle, rightAnkle].filter(Boolean) as NonNullable<typeof leftAnkle>[];

  const hasUpperBody = shoulder.length >= 2 && elbow.length >= 2 && wrist.length >= 2;
  const hasLowerBody = hip.length >= 2 && knee.length >= 2 && ankle.length >= 1;

  const elbowAngles: number[] = [];
  if (leftShoulder && leftElbow && leftWrist) {
    elbowAngles.push(angleDeg(leftShoulder, leftElbow, leftWrist));
  }
  if (rightShoulder && rightElbow && rightWrist) {
    elbowAngles.push(angleDeg(rightShoulder, rightElbow, rightWrist));
  }
  const kneeAngles: number[] = [];
  if (leftHip && leftKnee && leftAnkle) {
    kneeAngles.push(angleDeg(leftHip, leftKnee, leftAnkle));
  }
  if (rightHip && rightKnee && rightAnkle) {
    kneeAngles.push(angleDeg(rightHip, rightKnee, rightAnkle));
  }

  const shoulderCenter = mid(shoulder);
  const hipCenter = mid(hip);
  const wristCenterY = avg(wrist.map((s) => s.y));

  // Stabler scale reference than the shoulder-hip distance alone: torso + leg
  // length stay meaningful across sitting, crouching and planking.
  const legEnd = ankle.length ? mid(ankle) : knee.length ? mid(knee) : hipCenter;
  const bodySize = distance(shoulderCenter, hipCenter) + distance(hipCenter, legEnd) || 0.0001;
  const scale = bodySize;

  // Body straightness: shoulder — hip — (ankle if visible else knee)
  let bodyDeviation = 0;
  if (shoulder.length >= 1 && hip.length >= 1 && (ankle.length >= 1 || knee.length >= 2)) {
    const end = ankle.length ? mid(ankle) : mid(knee);
    bodyDeviation = deviationFromStraight(angleDeg(mid(shoulder), mid(hip), end));
  }

  const shoulderDepth = normalizedVerticalDelta(
    { x: 0, y: wristCenterY, z: 0 },
    { x: 0, y: shoulderCenter.y, z: 0 },
    scale,
  );
  const hipDrop = normalizedVerticalDelta({ x: 0, y: hipCenter.y, z: 0 }, { x: 0, y: shoulderCenter.y, z: 0 }, scale);

  return {
    hasUpperBody,
    hasLowerBody,
    elbowMin: elbowAngles.length ? Math.min(...elbowAngles) : 0,
    elbowMax: elbowAngles.length ? Math.max(...elbowAngles) : 0,
    elbowAvg: elbowAngles.length ? avg(elbowAngles) : 0,
    kneeMin: kneeAngles.length ? Math.min(...kneeAngles) : 0,
    kneeMax: kneeAngles.length ? Math.max(...kneeAngles) : 0,
    shoulderYAvg: shoulderCenter.y,
    hipYAvg: hipCenter.y,
    wristYAvg: wristCenterY,
    bodySize: scale,
    bodyDeviation,
    shoulderDepth,
    hipDrop,
  };
}