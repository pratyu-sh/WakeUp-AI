import type { Difficulty, Exercise, WorkoutResult } from "../../../lib/alarm-store";
import { CHALLENGE_CONFIG, DETECTION_CONFIG } from "../constants/exerciseDetection";
import type { ExerciseDetector } from "../exercises/base";
import type { FrameMetrics } from "../exercises/poseMetrics";
import { createExerciseDetector } from "../exercises/detectorFactory";
import { computeFrameMetrics } from "../exercises/poseMetrics";
import type { PoseFrame } from "../pose/poseTypes";
import { PoseFrameSmoother } from "../pose/smoothing";
import { AntiCheatValidator, type AntiCheatReason } from "./AntiCheatValidator";
import { evaluatePoseQuality, QUALITY_FEEDBACK, type QualityIssue } from "./PoseQualityValidator";

export type ChallengeStatus =
  | "idle"
  | "calibrating"
  | "countdown"
  | "active"
  | "paused"
  | "completed"
  | "failed";

export type FailedReason = "timeout" | "equipment" | "person_left" | "aborted" | "setup_error";

export interface ChallengeConfig {
  exercise: Exercise;
  difficulty: Difficulty;
  targetReps?: number;
  targetDurationMs?: number;
  timeoutMs?: number;
  countdownMs?: number;
  /** EMA alpha for landmark smoothing. Defaults to DETECTION_CONFIG.smoothingAlpha. */
  smoothingAlpha?: number;
}

export interface ChallengeResult {
  workoutResult: WorkoutResult;
  exercise: Exercise;
  difficulty: Difficulty;
  repsCompleted: number;
  durationMs: number;
  validHoldMs: number;
  reason: "target_met" | FailedReason;
}

export interface ChallengeSnapshot {
  status: ChallengeStatus;
  exercise: Exercise;
  reps: number;
  targetReps: number | null;
  validHoldMs: number;
  targetDurationMs: number | null;
  countdownRemainingMs: number;
  elapsedMs: number;
  timeoutRemainingMs: number;
  feedback: string | null;
  formQuality: number | null;
  qualityIssue: QualityIssue | null;
  cheatReason: AntiCheatReason | null;
  detectorState: string;
  cameraPaused: boolean;
  calibrationState: "positioning" | "detected" | "ready";
  stableFrameCount: number;
  requiredStableFrames: number;
  elbowAngle: number | null;
  kneeAngle: number | null;
  bodyDeviation: number | null;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const AUTO_PAUSE_MAX_MS = 60_000;
const DEFAULT_COUNTDOWN_MS = CHALLENGE_CONFIG.countdownSeconds * 1000;

export interface ChallengeEngineOptions {
  onSnapshot?: (snapshot: ChallengeSnapshot) => void;
  onComplete?: (result: ChallengeResult) => void;
}

/**
 * Owns the full challenge lifecycle. Pure orchestration (no DOM): the UI feeds
 * it pose frames and it advances status, reps, plank hold time and triggers
 * completion/failure. All timing is driven by the frame timestamps so tests can
 * replay synthetic sequences deterministically.
 */
export class ChallengeEngine {
  private readonly config: Required<Pick<ChallengeConfig, "countdownMs" | "timeoutMs">> & ChallengeConfig;
  private readonly detector: ExerciseDetector;
  private readonly smoother: PoseFrameSmoother;
  private readonly antiCheat = new AntiCheatValidator();
  private readonly listeners: ChallengeEngineOptions;

  private status: ChallengeStatus = "idle";
  private countdownEndAt = 0;
  private startedAt = 0;
  private pausedAt: number | null = null;
  private autoPausedAt: number | null = null;
  private lastFrameAt = 0;
  private noPersonStreak = 0;
  private stableFrameCount = 0;
  private resumeStableFrameCount = 0;
  private lastCountedReps = 0;
  private lastSnapshot: ChallengeSnapshot;

  constructor(config: ChallengeConfig, options: ChallengeEngineOptions = {}) {
    this.config = {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      countdownMs: DEFAULT_COUNTDOWN_MS,
      ...config,
    };
    this.listeners = options;
    this.detector = createExerciseDetector(this.config.exercise, this.config.difficulty);
    this.smoother = new PoseFrameSmoother({ alpha: config.smoothingAlpha });
    this.lastSnapshot = this.buildSnapshot();
  }

  getStatus(): ChallengeStatus {
    return this.status;
  }

  getDetector(): ExerciseDetector {
    return this.detector;
  }

  start(): void {
    if (this.status !== "idle") return;
    this.status = "calibrating";
    this.stableFrameCount = 0;
    this.emit();
  }

  /** Begin the on-screen countdown before reps count. */
  beginCountdown(): void {
    if (this.status !== "calibrating" && this.status !== "paused") return;
    this.status = "countdown";
    this.countdownEndAt = (this.lastFrameAt > 0 ? this.lastFrameAt : Date.now()) + this.config.countdownMs;
    if (this.startedAt === 0 && this.lastFrameAt !== 0) {
      this.startedAt = this.lastFrameAt;
    }
    this.stableFrameCount = 0;
    this.emit();
  }

  /** Feed one (already smoothed or raw) pose frame to the engine. */
  processPose(frame: PoseFrame): ChallengeSnapshot {
    this.lastFrameAt = frame.timestamp;

    if (this.status === "calibrating") {
      const rawMetrics = computeFrameMetrics(frame);
      const quality = evaluatePoseQuality(frame, rawMetrics);
      if (quality.okay) {
        this.stableFrameCount += 1;
        const isReady = this.stableFrameCount >= DETECTION_CONFIG.requiredStableFrames;
        const calibrationState: "positioning" | "detected" | "ready" = isReady ? "ready" : "detected";
        this.emit({
          calibrationState,
          stableFrameCount: this.stableFrameCount,
          requiredStableFrames: DETECTION_CONFIG.requiredStableFrames,
          elbowAngle: Math.round(rawMetrics.elbowAvg) || null,
          kneeAngle: Math.round(rawMetrics.kneeMin) || null,
          bodyDeviation: Math.round(rawMetrics.bodyDeviation),
          feedback: isReady ? "Good position! Starting countdown..." : "Person detected — hold still",
        });
        if (isReady) {
          this.beginCountdown();
        }
      } else {
        this.stableFrameCount = 0;
        this.emit({
          calibrationState: "positioning",
          stableFrameCount: 0,
          requiredStableFrames: DETECTION_CONFIG.requiredStableFrames,
          feedback: quality.feedback ?? QUALITY_FEEDBACK[quality.issue ?? "no_person"],
          qualityIssue: quality.issue,
        });
      }
      return this.lastSnapshot;
    }

    if (this.status === "paused") {
      const rawMetrics = computeFrameMetrics(frame);
      const quality = evaluatePoseQuality(frame, rawMetrics);
      if (quality.okay) {
        this.resumeStableFrameCount += 1;
        if (this.resumeStableFrameCount >= 3) {
          this.resumeStableFrameCount = 0;
          this.resume();
        }
      } else {
        this.resumeStableFrameCount = 0;
      }
      return this.inactiveEmit();
    }

    if (this.status === "countdown") {
      if (frame.timestamp >= this.countdownEndAt) {
        this.status = "active";
        if (this.startedAt === 0) this.startedAt = frame.timestamp;
      } else {
        return this.inactiveEmit();
      }
    }
    if (this.status !== "active") {
      return this.inactiveEmit();
    }

    // Quality gate.
    const rawMetrics = computeFrameMetrics(frame);
    const quality = evaluatePoseQuality(frame, rawMetrics);
    if (!quality.okay) {
      this.noPersonStreak += 1;
      const feedback = QUALITY_FEEDBACK[quality.issue ?? "no_person"];
      if (this.noPersonStreak >= DETECTION_CONFIG.requiredStableFrames && (quality.issue === "no_person" || quality.issue === "too_far")) {
        this.autoPause("person_left");
        return this.inactiveEmit();
      }
      this.emit({ feedback, qualityIssue: quality.issue, formQuality: 0 });
      return this.lastSnapshot;
    }
    this.noPersonStreak = 0;

    // Anti-cheat gate.
    const cheat = this.antiCheat.push(frame);
    if (!cheat.ok) {
      this.emit({
        feedback: CHEAT_FEEDBACK[cheat.reason],
        cheatReason: cheat.reason,
        formQuality: 0,
      });
      return this.lastSnapshot;
    }

    // Smoothing.
    const smoothed = this.smoother.push(frame) as PoseFrame;
    if (!smoothed) {
      this.emit();
      return this.lastSnapshot;
    }

    const result = this.detector.process(smoothed);
    const validHoldMs = this.detector.getElapsedValidHoldMs();
    const reps = this.detector.getReps();

    if (reps > this.lastCountedReps) {
      const rateVerdict = this.antiCheat.validateRepRate(frame.timestamp);
      if (!rateVerdict.ok) {
        this.emit({
          feedback: CHEAT_FEEDBACK[rateVerdict.reason],
          cheatReason: rateVerdict.reason,
          formQuality: 0,
        });
        return this.lastSnapshot;
      }
      this.lastCountedReps = reps;
    }

    // Timeout check.
    const elapsedMs = this.startedAt === 0 ? 0 : frame.timestamp - this.startedAt;
    if (elapsedMs > this.config.timeoutMs) {
      this.fail("timeout");
      return this.lastSnapshot;
    }

    const done =
      (this.config.targetReps !== undefined && reps >= this.config.targetReps) ||
      (this.config.targetDurationMs !== undefined && validHoldMs >= this.config.targetDurationMs);

    this.emit({
      reps,
      validHoldMs,
      feedback: result.feedback,
      formQuality: result.formQuality,
      cheatReason: null,
      qualityIssue: null,
      detectorState: result.state,
      cameraPaused: false,
      calibrationState: "ready",
      elbowAngle: Math.round(rawMetrics.elbowAvg) || null,
      kneeAngle: Math.round(rawMetrics.kneeMin) || null,
      bodyDeviation: Math.round(rawMetrics.bodyDeviation),
    });

    if (done && this.status === "active") {
      this.settle("completed", "target_met", reps, validHoldMs, elapsedMs);
    }

    return this.lastSnapshot;
  }

  pause(reason: "user" | "person_left" | "app_background" = "user"): void {
    if (this.status === "active" || this.status === "countdown") {
      this.pausedAt = Date.now();
      if (reason !== "user") {
        this.autoPausedAt = Date.now();
      }
      this.status = "paused";
      this.emit();
    }
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.autoPausedAt = null;
    this.status = "countdown";
    this.countdownEndAt = Date.now() + Math.min(this.config.countdownMs, 1500);
    this.emit();
  }

  fail(reason: FailedReason): void {
    if (this.status === "completed" || this.status === "failed") return;
    const elapsedMs = this.startedAt === 0 ? 0 : Date.now() - this.startedAt;
    this.settle("skipped", reason, this.detector.getReps(), this.detector.getElapsedValidHoldMs(), elapsedMs);
  }

  aborted(): void {
    this.fail("aborted");
  }

  forceComplete(): void {
    if (this.status === "completed" || this.status === "failed") return;
    const reps = this.config.targetReps ?? 10;
    const holdMs = this.config.targetDurationMs ?? 30000;
    const elapsedMs = this.startedAt === 0 ? 30000 : Math.max(1000, Date.now() - this.startedAt);
    this.settle("completed", "target_met", reps, holdMs, elapsedMs);
  }

  /** Wall-clock safety net for paused states and countdown completion. */
  tick(nowMs: number): void {
    if (this.status === "countdown" && nowMs >= this.countdownEndAt) {
      this.status = "active";
      if (this.startedAt === 0) this.startedAt = nowMs;
      this.emit();
      return;
    }
    if (this.status === "paused" && this.autoPausedAt !== null && nowMs - this.autoPausedAt > AUTO_PAUSE_MAX_MS) {
      this.fail("person_left");
    }
    if (this.status === "active" && this.startedAt !== 0 && nowMs - this.startedAt > this.config.timeoutMs) {
      this.fail("timeout");
    }
  }

  private settle(workoutResult: WorkoutResult, reason: ChallengeResult["reason"], reps: number, validHoldMs: number, elapsedMs: number): void {
    this.status = workoutResult === "completed" ? "completed" : "failed";
    const result: ChallengeResult = {
      workoutResult,
      exercise: this.config.exercise,
      difficulty: this.config.difficulty,
      repsCompleted: reps,
      durationMs: elapsedMs,
      validHoldMs,
      reason,
    };
    this.listeners.onComplete?.(result);
    this.emit();
  }

  private autoPause(reason: "person_left" | "app_background"): void {
    this.pause(reason);
  }

  private inactiveEmit(): ChallengeSnapshot {
    this.emit();
    return this.lastSnapshot;
  }

  private buildSnapshot(): ChallengeSnapshot {
    return {
      status: this.status,
      exercise: this.config.exercise,
      reps: this.detector.getReps(),
      targetReps: this.config.targetReps ?? null,
      validHoldMs: this.detector.getElapsedValidHoldMs(),
      targetDurationMs: this.config.targetDurationMs ?? null,
      countdownRemainingMs: 0,
      elapsedMs: 0,
      timeoutRemainingMs: this.config.timeoutMs,
      feedback: null,
      formQuality: null,
      qualityIssue: null,
      cheatReason: null,
      detectorState: this.detector.getState(),
      cameraPaused: false,
      calibrationState: this.status === "active" ? "ready" : this.stableFrameCount >= DETECTION_CONFIG.requiredStableFrames ? "ready" : this.stableFrameCount > 0 ? "detected" : "positioning",
      stableFrameCount: this.stableFrameCount,
      requiredStableFrames: DETECTION_CONFIG.requiredStableFrames,
      elbowAngle: null,
      kneeAngle: null,
      bodyDeviation: null,
    };
  }

  /**
   * Publish the current truth to listeners. `data` merges over the freshly
   * rebuilt base so per-frame feedback / issues survive; wall-clock timers are
   * always recomputed from the last captured frame time.
   */
  private emit(data?: Partial<ChallengeSnapshot>): void {
    const now = Date.now();
    const merged: ChallengeSnapshot = { ...this.buildSnapshot(), ...data };
    if (this.status === "countdown") {
      merged.countdownRemainingMs = Math.max(0, this.countdownEndAt - now);
    }
    if (this.status === "active") {
      const activeNow = this.lastFrameAt || now;
      merged.elapsedMs = this.startedAt === 0 ? 0 : Math.max(0, activeNow - this.startedAt);
      merged.timeoutRemainingMs = Math.max(0, this.config.timeoutMs - (this.startedAt === 0 ? 0 : activeNow - this.startedAt));
    }
    this.lastSnapshot = merged;
    this.listeners.onSnapshot?.(merged);
  }
}

const CHEAT_FEEDBACK: Record<Exclude<AntiCheatReason, "ok">, string> = {
  camera_shake: "Please keep the camera steady",
  camera_moved: "The camera moved — get back in front of it",
  person_swapped: "We lost you — get back in position",
  rapid_movement: "Movement too fast — perform controlled reps",
};