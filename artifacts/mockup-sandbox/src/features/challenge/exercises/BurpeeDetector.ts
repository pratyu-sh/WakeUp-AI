import { EXERCISE_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";
import { computeFrameMetrics } from "./poseMetrics";
import { RepStateMachineBase, type ExerciseDetectionResult } from "./base";

const CFG = EXERCISE_CONFIG.burpees;

type BurpeePhase = "none" | "down" | "plank" | "return";

/**
 * Burpee detection — a four-phase, sequence-gated state machine. A rep is only
 * counted when the full cycle DOWN → PLANK → RETURN → STANDING is observed in
 * order, which makes half-burpees and bounce "cheats" structurally impossible.
 */
export class BurpeeDetector extends RepStateMachineBase {
  private reps = 0;
  private standingHipBaseline: number | null = null;
  private seen: BurpeePhase = "none";

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
    this.seen = "none";
  }

  process(frame: PoseFrame): ExerciseDetectionResult {
    const now = frame.timestamp;
    this.touch(now);
    if (this.isStale(now)) {
      this.handleStale(now);
      this.seen = "none";
      this.standingHipBaseline = null;
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
      this.seen = "none";
      return { ...result, state: this.state, feedback: "Step back so your whole body fits the frame" };
    }

    if (m.kneeMin >= CFG.standingKneeMinDeg) {
      this.standingHipBaseline =
        this.standingHipBaseline === null ? m.hipYAvg : this.standingHipBaseline * 0.9 + m.hipYAvg * 0.1;
    }
    const baseline = this.standingHipBaseline;
    const hipDropDepth = baseline === null ? 0 : m.hipYAvg - baseline;
    const downHipDrop = CFG.downHipDrop * m.bodySize;
    const plankHipDrop = CFG.plankHipDrop * m.bodySize;
    const kneeMin = m.kneeMin;

    const isDown = baseline !== null && hipDropDepth >= downHipDrop;
    const isPlank =
      baseline !== null && hipDropDepth >= plankHipDrop && m.bodyDeviation <= CFG.maxBodyDeviationDeg && m.elbowMin >= 145;
    const isReturning = baseline !== null && hipDropDepth <= downHipDrop * 0.7 && kneeMin >= CFG.standingKneeMinDeg - 20;
    const isStanding = baseline !== null && hipDropDepth <= 0.1 * m.bodySize && kneeMin >= CFG.standingKneeMinDeg;

    switch (this.state) {
      case "ready":
      case "standing":
        if (this.canTransition(now) && isDown) {
          this.seen = "down";
          this.setState("down", now);
        }
        break;
      case "down":
        if (this.canTransition(now)) {
          if (isPlank) {
            this.seen = "plank";
            this.setState("plank", now);
          } else {
            result.feedback = "Grounded position before jumping back";
          }
        }
        break;
      case "plank":
        if (this.canTransition(now)) {
          if (isReturning) {
            this.seen = "return";
            this.setState("returning", now);
          } else if (!m.hasUpperBody) {
            result.feedback = "Keep your hands on the floor";
          }
        }
        break;
      case "returning":
        if (this.canTransition(now)) {
          if (isStanding) {
            if (this.canCount(now) && this.seen === "return") {
              this.reps += 1;
              this.markRep(now);
              this.seen = "none";
              this.setState("standing", now);
              return { repCompleted: true, reps: this.reps, formQuality: 0.95, feedback: null, state: this.state };
            }
            this.seen = "none";
            this.setState("standing", now);
          } else if (isDown && hipDropDepth >= plankHipDrop) {
            this.setState("plank", now);
          }
        }
        break;
      default:
        this.setState("ready", now);
    }

    result.formQuality = Math.max(0.15, 1 - m.bodyDeviation / 45);
    if (this.state === "plank" && isPlank) result.formQuality = 1;
    result.feedback = this.feedbackFor(m, baseline, isDown, isPlank);
    return result;
  }

  private feedbackFor(
    m: ReturnType<typeof computeFrameMetrics>,
    baseline: number | null,
    isDown: boolean,
    isPlank: boolean,
  ): string | null {
    if (this.state === "down" && !isPlank) return "Hips to the floor — then kick back";
    if (this.state === "plank" && !isPlank) return "Full plank — arms straight";
    if (this.state === "returning" && !baseline) return "Jump back up";
    void m;
    return null;
  }
}