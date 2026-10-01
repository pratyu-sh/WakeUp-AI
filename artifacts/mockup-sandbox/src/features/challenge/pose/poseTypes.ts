export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  confidence?: number;
}

export type LandmarkName =
  | "nose"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle";

export type PoseLandmarkMap = Record<LandmarkName, PoseLandmark | undefined>;

export interface PoseFrame extends PoseLandmarkMap {
  timestamp: number;
  /** Aggregate pose confidence (0-1). */
  overallConfidence: number;
  /** Number of people detected in this frame (MediaPipe may return >1). */
  personCount: number;
}

export type NullablePoseFrame = Omit<PoseFrame, "timestamp" | "overallConfidence" | "personCount">;