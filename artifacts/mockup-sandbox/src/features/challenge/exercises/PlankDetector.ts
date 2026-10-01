import { EXERCISE_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";
import { computeFrameMetrics } from "./poseMetrics";
import { RepStateMachineBase, type ExerciseDetectionResult } from "./base";

const CFG = EXERCISE_CONFIG.plank;

/**
 * Plank detection (time-based, no reps).
 * - Body must stay straight (shoulder-hip-ankle deviation ≤ max).
 * - Hips must stay level with the shoulders (torso horizontal).
 * The accumulated "valid hold time" grows only while those conditions hold,
 * and resets to zero if form collapses — so cheating (sagging/arching) never
 * banks time. Completion is decided by the engine based on elapsed valid time.
 */
export class PlankDetector extends RepStateMachineBase {
  private validHoldMs = 0;
  private lastValidAt = 0;

  constructor(options: { minStateDurationMs?: number; repCooldownMs?: number } = {}) {
    super({
      minStateDurationMs: options.minStateDurationMs ?? 100,
      repCooldownMs: options.repCooldownMs ?? 0,
    });
  }

  getReps(): number {
    return 0;
  }

  getElapsedValidHoldMs(): number {
    return this.validHoldMs;
  }

  reset(): void {
    super.reset();
    this.validHoldMs = 0;
    this.lastValidAt = 0;
  }

  process(frame: PoseFrame): ExerciseDetectionResult {
    const now = frame.timestamp;
    this.touch(now);
    if (this.isStale(now)) {
      this.handleStale(now);
    }
    const m = computeFrameMetrics(frame);
    const result: ExerciseDetectionResult = {
      repCompleted: false,
      reps: 0,
      formQuality: 0,
      feedback: null,
      state: this.state,
    };

    if (!m.hasLowerBody || !m.hasUpperBody) {
      this.setState("invalid", now);
      this.lastValidAt = 0;
      return { ...result, state: this.state, feedback: "Get into position so your whole body fits the frame" };
    }

    const hipLevelDelta = Math.abs(m.shoulderYAvg - m.hipYAvg);
    const isStraight = m.bodyDeviation <= CFG.maxBodyDeviationDeg;
    const isLevel = hipLevelDelta <= CFG.maxHipLevelDelta * m.bodySize;

    if (isStraight && isLevel) {
      if (this.state !== "holding") {
        this.setState("holding", now);
        this.lastValidAt = now;
      } else if (this.lastValidAt > 0) {
        const delta = now - this.lastValidAt;
        // Only advance in bounded increments to avoid clock-skew jumps.
        this.validHoldMs += Math.max(0, Math.min(delta, 250));
      }
      this.lastValidAt = now;
      result.state = "holding";
      result.formQuality = 1 - m.bodyDeviation / 90;
    } else {
      this.lastValidAt = 0;
      if (this.state === "holding") {
        // Form collapsed — previously banked time is forfeited so sagging can
        // never buy the user a completion.
        this.validHoldMs = 0;
        this.setState("invalid", now);
      }
      result.state = "invalid";
      result.formQuality = Math.max(0.1, 1 - m.bodyDeviation / 90);
      if (!isStraight) result.feedback = "Hips sagging — squeeze your core and glutes";
      else if (!isLevel) result.feedback = "Keep your body in one straight line";
    }

    return result;
  }
}