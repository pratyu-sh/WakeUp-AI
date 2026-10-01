import { EXERCISE_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";
import { computeFrameMetrics } from "./poseMetrics";
import { RepStateMachineBase, type ExerciseDetectionResult } from "./base";

const CFG = EXERCISE_CONFIG.squats;

/**
 * Squat detection:
 * - Driving signal = min(left, right) knee angle (both knees must bend).
 * - Hip-drop gate: hips must sink at least `minHipDrop` below their running
 *   standing baseline (validates real range of motion, not a 5cm bob).
 * - Torso gate: chest must stay reasonably up at the bottom.
 */
export class SquatDetector extends RepStateMachineBase {
  private reps = 0;
  private standingHipBaseline: number | null = null;

  constructor(options: { minStateDurationMs?: number; repCooldownMs?: number } = {}) {
    super({
      minStateDurationMs: options.minStateDurationMs ?? CFG.minElapsedMs,
      repCooldownMs: options.repCooldownMs ?? CFG.repCooldownMs,
    });
  }

  getReps(): number {
    return this.reps;
  }

  reset(): void {
    super.reset();
    this.standingHipBaseline = null;
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
      reps: this.reps,
      formQuality: 0,
      feedback: null,
      state: this.state,
    };

    if (!m.hasLowerBody) {
      this.setState("ready", now);
      this.standingHipBaseline = null;
      return { ...result, state: this.state, feedback: "Step back so your knees and feet are visible" };
    }

    // Baseline only learned while near standing; re-learn periodically.
    if (this.standingHipBaseline === null || m.kneeMin >= CFG.standingKneeMinDeg) {
      if (m.kneeMin >= CFG.standingKneeMinDeg) {
        this.standingHipBaseline =
          this.standingHipBaseline === null ? m.hipYAvg : this.standingHipBaseline * 0.9 + m.hipYAvg * 0.1;
      }
    }
    const baseline = this.standingHipBaseline;
    const hipDropDepth = baseline === null ? 0 : m.hipYAvg - baseline;
    const kneeMin = m.kneeMin;

    const standing = kneeMin >= CFG.standingKneeMinDeg && hipDropDepth <= 0.08 * m.bodySize;
    const deepEnough = baseline !== null && hipDropDepth >= CFG.minHipDrop * m.bodySize;

    switch (this.state) {
      case "ready":
      case "standing":
        if (this.canTransition(now) && kneeMin <= CFG.loweringEnterDeg) {
          this.setState("lowering", now);
        }
        break;
      case "lowering":
        if (this.canTransition(now)) {
          if (kneeMin <= CFG.bottomKneeMaxDeg && deepEnough) {
            this.setState("bottom", now);
          } else if (standing) {
            this.setState("standing", now);
          }
        }
        break;
      case "bottom":
        if (this.canTransition(now) && kneeMin >= CFG.raisingEnterDeg) {
          this.setState("raising", now);
        }
        break;
      case "raising":
        if (this.canTransition(now) && standing && this.canCount(now)) {
          this.reps += 1;
          this.markRep(now);
          this.setState("standing", now);
          return { repCompleted: true, reps: this.reps, formQuality: 0.95, feedback: null, state: this.state };
        }
        break;
      default:
        this.setState("standing", now);
    }

    result.formQuality = this.computeQuality(m);
    result.feedback = this.feedbackFor(m, baseline);
    return result;
  }

  private computeQuality(m: ReturnType<typeof computeFrameMetrics>): number {
    let q = 1;
    if (m.kneeMin > CFG.bottomKneeMaxDeg && this.state === "bottom") q -= 0.5; // not deep enough
    if (m.kneeMin < 30) q -= 0.5; // improbable joint angle → sensor noise
    return Math.max(0.05, Math.min(1, q));
  }

  private feedbackFor(m: ReturnType<typeof computeFrameMetrics>, baseline: number | null): string | null {
    if (this.state === "lowering" || this.state === "bottom") {
      if (baseline !== null && m.hipYAvg - baseline < CFG.minHipDrop * m.bodySize) {
        return "Sit deeper — hips below knee level";
      }
      if (m.kneeMin > CFG.bottomKneeMaxDeg) return "Bend your knees further";
    }
    if (this.state === "raising" && m.kneeMin < CFG.standingKneeMinDeg) return "Stand up all the way";
    return null;
  }
}