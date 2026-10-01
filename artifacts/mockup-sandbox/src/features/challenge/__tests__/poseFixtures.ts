import type { PoseFrame } from "../pose/poseTypes";

export interface FixtureSet {
  shoulderL: [number, number];
  shoulderR: [number, number];
  elbowL: [number, number];
  elbowR: [number, number];
  wristL: [number, number];
  wristR: [number, number];
  hipL: [number, number];
  hipR: [number, number];
  kneeL: [number, number];
  kneeR: [number, number];
  ankleL: [number, number];
  ankleR: [number, number];
  nose?: [number, number];
}

export function poseAt(t: number, s: FixtureSet, personCount = 1): PoseFrame {
  const mk = (p: [number, number]) => ({ x: p[0], y: p[1], z: 0, visibility: 0.92 });
  return {
    timestamp: t,
    overallConfidence: 0.92,
    personCount,
    nose: s.nose ? mk(s.nose) : undefined,
    leftShoulder: mk(s.shoulderL),
    rightShoulder: mk(s.shoulderR),
    leftElbow: mk(s.elbowL),
    rightElbow: mk(s.elbowR),
    leftWrist: mk(s.wristL),
    rightWrist: mk(s.wristR),
    leftHip: mk(s.hipL),
    rightHip: mk(s.hipR),
    leftKnee: mk(s.kneeL),
    rightKnee: mk(s.kneeR),
    leftAnkle: mk(s.ankleL),
    rightAnkle: mk(s.ankleR),
  };
}

export function emptyPose(t: number, personCount = 0): PoseFrame {
  return {
    timestamp: t,
    overallConfidence: 0,
    personCount,
    nose: undefined,
    leftShoulder: undefined,
    rightShoulder: undefined,
    leftElbow: undefined,
    rightElbow: undefined,
    leftWrist: undefined,
    rightWrist: undefined,
    leftHip: undefined,
    rightHip: undefined,
    leftKnee: undefined,
    rightKnee: undefined,
    leftAnkle: undefined,
    rightAnkle: undefined,
  };
}

const pushupTop: FixtureSet = {
  shoulderL: [0.44, 0.62],
  shoulderR: [0.56, 0.62],
  elbowL: [0.44, 0.71],
  elbowR: [0.56, 0.71],
  wristL: [0.46, 0.8],
  wristR: [0.54, 0.8],
  hipL: [0.48, 0.72],
  hipR: [0.52, 0.72],
  kneeL: [0.48, 0.82],
  kneeR: [0.52, 0.82],
  ankleL: [0.48, 0.9],
  ankleR: [0.52, 0.9],
  nose: [0.5, 0.52],
};

const pushupLower: FixtureSet = {
  shoulderL: [0.44, 0.62],
  shoulderR: [0.56, 0.62],
  elbowL: [0.4, 0.72],
  elbowR: [0.6, 0.72],
  wristL: [0.46, 0.8],
  wristR: [0.54, 0.8],
  hipL: [0.48, 0.74],
  hipR: [0.52, 0.74],
  kneeL: [0.48, 0.84],
  kneeR: [0.52, 0.84],
  ankleL: [0.48, 0.92],
  ankleR: [0.52, 0.92],
  nose: [0.5, 0.52],
};

const pushupBottom: FixtureSet = {
  shoulderL: [0.4, 0.8],
  shoulderR: [0.6, 0.8],
  elbowL: [0.35, 0.76],
  elbowR: [0.65, 0.76],
  wristL: [0.42, 0.82],
  wristR: [0.58, 0.82],
  hipL: [0.46, 0.84],
  hipR: [0.54, 0.84],
  kneeL: [0.48, 0.9],
  kneeR: [0.52, 0.9],
  ankleL: [0.48, 0.94],
  ankleR: [0.52, 0.94],
  nose: [0.5, 0.7],
};

export const PUSHUP = { TOP: pushupTop, LOWER: pushupLower, BOTTOM: pushupBottom };

const squatStand: FixtureSet = {
  shoulderL: [0.42, 0.3],
  shoulderR: [0.58, 0.3],
  elbowL: [0.43, 0.52],
  elbowR: [0.57, 0.52],
  wristL: [0.44, 0.68],
  wristR: [0.56, 0.68],
  hipL: [0.42, 0.5],
  hipR: [0.58, 0.5],
  kneeL: [0.44, 0.7],
  kneeR: [0.56, 0.7],
  ankleL: [0.44, 0.88],
  ankleR: [0.56, 0.88],
  nose: [0.5, 0.2],
};

const squatLower: FixtureSet = {
  shoulderL: [0.4, 0.38],
  shoulderR: [0.56, 0.38],
  elbowL: [0.4, 0.52],
  elbowR: [0.56, 0.52],
  wristL: [0.42, 0.64],
  wristR: [0.54, 0.64],
  hipL: [0.4, 0.58],
  hipR: [0.56, 0.58],
  kneeL: [0.48, 0.74],
  kneeR: [0.52, 0.74],
  ankleL: [0.44, 0.88],
  ankleR: [0.56, 0.88],
  nose: [0.48, 0.28],
};

const squatBottom: FixtureSet = {
  shoulderL: [0.36, 0.5],
  shoulderR: [0.6, 0.5],
  elbowL: [0.4, 0.52],
  elbowR: [0.56, 0.52],
  wristL: [0.42, 0.62],
  wristR: [0.54, 0.62],
  hipL: [0.34, 0.7],
  hipR: [0.62, 0.7],
  kneeL: [0.48, 0.78],
  kneeR: [0.52, 0.78],
  ankleL: [0.4, 0.9],
  ankleR: [0.56, 0.9],
  nose: [0.48, 0.42],
};

export const SQUAT = { STAND: squatStand, LOWER: squatLower, BOTTOM: squatBottom };

const burpeeDown: FixtureSet = {
  shoulderL: [0.36, 0.5],
  shoulderR: [0.6, 0.5],
  elbowL: [0.42, 0.54],
  elbowR: [0.54, 0.54],
  wristL: [0.46, 0.6],
  wristR: [0.5, 0.6],
  hipL: [0.34, 0.7],
  hipR: [0.62, 0.7],
  kneeL: [0.48, 0.78],
  kneeR: [0.52, 0.78],
  ankleL: [0.4, 0.9],
  ankleR: [0.56, 0.9],
  nose: [0.48, 0.42],
};

const burpeePlank: FixtureSet = {
  shoulderL: [0.28, 0.76],
  shoulderR: [0.44, 0.76],
  elbowL: [0.28, 0.82],
  elbowR: [0.44, 0.82],
  wristL: [0.28, 0.88],
  wristR: [0.44, 0.88],
  hipL: [0.52, 0.76],
  hipR: [0.66, 0.76],
  kneeL: [0.78, 0.76],
  kneeR: [0.88, 0.76],
  ankleL: [0.94, 0.76],
  ankleR: [0.96, 0.76],
  nose: [0.36, 0.76],
};

const burpeeReturn: FixtureSet = {
  shoulderL: [0.4, 0.4],
  shoulderR: [0.56, 0.4],
  elbowL: [0.42, 0.54],
  elbowR: [0.54, 0.54],
  wristL: [0.44, 0.64],
  wristR: [0.52, 0.64],
  hipL: [0.42, 0.56],
  hipR: [0.58, 0.56],
  kneeL: [0.46, 0.71],
  kneeR: [0.54, 0.71],
  ankleL: [0.44, 0.88],
  ankleR: [0.56, 0.88],
  nose: [0.48, 0.3],
};

export const BURPEE = { STAND: squatStand, DOWN: burpeeDown, PLANK: burpeePlank, RETURN: burpeeReturn };

const plankHold: FixtureSet = {
  shoulderL: [0.3, 0.42],
  shoulderR: [0.46, 0.42],
  elbowL: [0.31, 0.5],
  elbowR: [0.47, 0.5],
  wristL: [0.32, 0.58],
  wristR: [0.48, 0.58],
  hipL: [0.6, 0.42],
  hipR: [0.74, 0.42],
  kneeL: [0.84, 0.42],
  kneeR: [0.9, 0.42],
  ankleL: [0.92, 0.42],
  ankleR: [0.94, 0.42],
  nose: [0.38, 0.42],
};

const plankSag: FixtureSet = {
  shoulderL: [0.3, 0.42],
  shoulderR: [0.46, 0.42],
  elbowL: [0.31, 0.5],
  elbowR: [0.47, 0.5],
  wristL: [0.32, 0.58],
  wristR: [0.48, 0.58],
  hipL: [0.6, 0.54],
  hipR: [0.74, 0.54],
  kneeL: [0.84, 0.44],
  kneeR: [0.9, 0.44],
  ankleL: [0.92, 0.42],
  ankleR: [0.94, 0.42],
  nose: [0.38, 0.42],
};

export const PLANK = { HOLD: plankHold, SAG: plankSag };