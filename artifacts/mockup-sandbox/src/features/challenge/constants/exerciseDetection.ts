/** Central tuning for the whole detection pipeline. Kept here so behavior is auditable and testable. */
import type { Exercise } from "../../../lib/alarm-store";

const DETECTION_DEFAULTS = {
  smoothingAlpha: 0.45,
  staleFrameTimeoutMs: 500,
};

/** Named exports so modules that need a single knob don't drag in the whole table. */
export const EMA_ALPHA = DETECTION_DEFAULTS.smoothingAlpha;
export const STALE_FRAME_TIMEOUT_MS = DETECTION_DEFAULTS.staleFrameTimeoutMs;

export const DETECTION_CONFIG = {
  /** Minimum gap between two raw detections (ms). */
  frameIntervalMs: 32,
  /** How often UI state (reps, feedback) is pushed to React (ms). */
  uiThrottleMs: 120,
  /** EMA smoothing alpha applied to landmark positions (0 = ignore new fx). */
  smoothingAlpha: 0.45,
  /** Consecutive stable frames required before "person seen" is trusted. */
  requiredStableFrames: 6,
  /** Below this average visibility we treat the pose as low quality. */
  minConfidence: 0.35,
  minLandmarkVisibility: 0.45,
  /** Min/max span of the shoulder-to-ankle box to be a plausible subject. */
  minBodySpanNormalized: 0.15,
  maxBodySpanNormalized: 0.9,
  /** Fail-safe: if no detection for this long, the pipeline considers the person gone. */
  staleFrameTimeoutMs: 500,
  /** Global-feature translation above this (normalized units per frame) smells like camera shake. */
  cameraShakeMaxFrameDelta: 0.04,
  /** Sudden gap in frame timing above this (ms) deems the buffer unusable. */
  maxFrameGapMs: 400,
  /** Number of frames kept for anti-cheat history. */
  historyWindow: 24,
  /** How quickly history entries decay (per ms). */
  historyTtlMs: 4000,
  maxPeople: 1,
} as const;

export interface CountdownConfig {
  countdownSeconds: number;
  promptSeconds: number;
}

export const CHALLENGE_CONFIG: CountdownConfig = {
  countdownSeconds: 3,
  promptSeconds: 4,
};

/** Global per-exercise geometry thresholds (angles in degrees, depths normalized by body height). */
export const EXERCISE_CONFIG = {
  pushups: {
    topElbowMinDeg: 150,
    bottomElbowMaxDeg: 100,
    loweringEnterDeg: 135,
    raisingEnterDeg: 125,
    /** Shoulder must sink such that wrist-to-shoulder vertical gap drops below this fraction of body size. */
    minDepth: 0.2,
    maxBodyDeviationDeg: 25,
    minElapsedMs: 250,
    repCooldownMs: 350,
  },
  squats: {
    standingKneeMinDeg: 160,
    bottomKneeMaxDeg: 100,
    loweringEnterDeg: 140,
    raisingEnterDeg: 120,
    minHipDrop: 0.22,
    maxTorsoLeanDeg: 35,
    minElapsedMs: 250,
    repCooldownMs: 350,
  },
  burpees: {
    standingKneeMinDeg: 150,
    downHipDrop: 0.28,
    plankHipDrop: 0.42,
    maxBodyDeviationDeg: 28,
    minElapsedMs: 200,
    repCooldownMs: 500,
  },
  plank: {
    /** Max deviation of the shoulder-hip-ankle line from straight (degrees). */
    maxBodyDeviationDeg: 22,
    /** |shoulderY - hipY| relative to shoulder-hip length; plank keeps hips level. */
    maxHipLevelDelta: 0.3,
    /** Knee may stay behind if within this vertical tolerance of hips. */
    maxKneeHipDelta: 0.25,
    minValidTimeMs: 1200,
  },
} as const;

export type ExerciseConfig = (typeof EXERCISE_CONFIG)[Exercise];