import { EXERCISE_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";
import { computeFrameMetrics } from "./poseMetrics";
import { RepStateMachineBase, type ExerciseDetectionResult } from "./base";

const CFG = EXERCISE_CONFIG.pushups;

/**
 * Push-up detection:
 * - Driving signal = min(left, right) elbow angle so BOTH arms must bend to
 *   confirm a bottom and BOTH must extend to confirm a top.
 * - Depth gate: at the bottom the wrist→shoulder vertical gap must have
 *   collapsed below `minDepth` of body size.
 * - Straightness gate: body must stay near straight through the lowering/bottom.
 */
export class PushUpDetector extends RepStateMachineBase {
  private reps = 0;

  constructor(options: { minStateDurationMs?: number; repCooldownMs?: number } = {}) {
    super({
      minStateDurationMs: options.minStateDurationMs ?? CFG.minElapsedMs,
      repCooldownMs: options.repCooldownMs ?? CFG.repCooldownMs,
    });
  }

  getReps(): number {
    return this.reps;
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

    if (!m.hasUpperBody || !m.hasLowerBody) {
      this.setState("ready", now);
      return { ...result, state: this.state, feedback: "Stand back so your whole body fits the frame" };
    }

    const elbowMin = m.elbowMin;
    const atTop = elbowMin >= CFG.topElbowMinDeg;
    const deepEnough = m.shoulderDepth <= CFG.minDepth;
    const straightEnough = m.bodyDeviation <= CFG.maxBodyDeviationDeg;

    switch (this.state) {
      case "ready":
      case "top":
        if (this.canTransition(now) && elbowMin <= CFG.loweringEnterDeg) {
          this.setState("lowering", now);
        }
        break;
      case "lowering":
        if (this.canTransition(now)) {
          if (!straightEnough) {
            result.feedback = "Keep your back straight — don't flare your hips";
          } else if (elbowMin <= CFG.bottomElbowMaxDeg && deepEnough) {
            this.setState("bottom", now);
          } else if (elbowMin >= CFG.raisingEnterDeg) {
            this.setState("top", now);
          }
        }
        break;
      case "bottom":
        if (this.canTransition(now) && elbowMin >= CFG.raisingEnterDeg) {
          this.setState("raising", now);
        }
        break;
      case "raising":
        if (this.canTransition(now) && atTop && this.canCount(now)) {
          this.reps += 1;
          this.markRep(now);
          this.setState("top", now);
          return {
            repCompleted: true,
            reps: this.reps,
            formQuality: Math.max(0.4, 1 - m.bodyDeviation / 45),
            feedback: null,
            state: this.state,
          };
        }
        break;
      default:
        this.setState("ready", now);
    }

    result.formQuality = this.computeQuality(m);
    result.feedback = this.feedbackFor(m);
    return result;
  }

  private computeQuality(m: ReturnType<typeof computeFrameMetrics>): number {
    let q = 1;
    q -= Math.abs(m.bodyDeviation) / 60;
    if (m.elbowMin < 10) q -= 0.4; // both arms fully locked is suspicious
    return Math.max(0.05, Math.min(1, q));
  }

  private feedbackFor(m: ReturnType<typeof computeFrameMetrics>): string | null {
    if (this.state === "lowering" || this.state === "bottom") {
      if (m.bodyDeviation > CFG.maxBodyDeviationDeg) return "Keep your body in a straight line";
      if (m.shoulderDepth > CFG.minDepth + 0.15) return "Lower your chest closer to the floor";
    }
    if (this.state === "raising" && m.elbowMin < CFG.raisingEnterDeg) return "Push all the way up";
    return null;
  }
}