import { STALE_FRAME_TIMEOUT_MS } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";

export type RepState = "ready" | "top" | "lowering" | "bottom" | "raising" | "standing" | "down" | "plank" | "returning" | "positioning" | "holding" | "invalid";

export interface ExerciseDetectionResult {
  /** Whether this frame completed a full rep (or a time increment for plank). */
  repCompleted: boolean;
  /** Total completed reps after this frame. */
  reps: number;
  /** Overall form quality 0-1 for this frame. */
  formQuality: number;
  /** Short user-facing guidance message, if any. */
  feedback: string | null;
  /** Machine-readable human-readable state of the detector. */
  state: RepState;
}

export interface ExerciseDetector {
  process(frame: PoseFrame): ExerciseDetectionResult;
  getReps(): number;
  getElapsedValidHoldMs(): number;
  getState(): RepState;
  reset(): void;
}

export interface DetectorBaseOptions {
  minStateDurationMs: number;
  repCooldownMs: number;
  staleFrameTimeoutMs?: number;
}

/**
 * Shared plumbing used by every exercise detector: min-state timing so a rep
 * can't spam-count, a per-rep cooldown, and stale-frame handling that returns
 * the machine to a safe baseline.
 */
export class RepStateMachineBase {
  protected state: RepState = "ready";
  private stateEnteredAt = 0;
  private lastFrameAt = 0;
  private lastRepAt = 0;
  private readonly minStateDurationMs: number;
  private readonly repCooldownMs: number;
  private readonly staleFrameTimeoutMs: number;

  constructor(options: DetectorBaseOptions) {
    this.minStateDurationMs = options.minStateDurationMs;
    this.repCooldownMs = options.repCooldownMs;
    this.staleFrameTimeoutMs = options.staleFrameTimeoutMs ?? STALE_FRAME_TIMEOUT_MS;
  }

  protected elapsedInState(nowMs: number): number {
    return nowMs - this.stateEnteredAt;
  }

  /** True when the frame gap suggests the subject left / tracking was lost. */
  protected isStale(nowMs: number): boolean {
    if (this.lastFrameAt === 0) return false;
    return nowMs - this.lastFrameAt > this.staleFrameTimeoutMs;
  }

  protected touch(nowMs: number): void {
    this.lastFrameAt = nowMs;
  }

  /** Transition only if the minimum dwell time elapsed. */
  protected canTransition(nowMs: number): boolean {
    return this.elapsedInState(nowMs) >= this.minStateDurationMs;
  }

  protected setState(state: RepState, nowMs: number): void {
    this.state = state;
    this.stateEnteredAt = nowMs;
  }

  protected canCount(nowMs: number): boolean {
    return nowMs - this.lastRepAt >= this.repCooldownMs;
  }

  protected markRep(nowMs: number): void {
    this.lastRepAt = nowMs;
  }

  /** Called when stale frames are detected: return to a baseline but keep totals. */
  protected handleStale(nowMs: number): void {
    this.setState("ready", nowMs);
  }

  public reset(): void {
    this.state = "ready";
    this.stateEnteredAt = 0;
    this.lastFrameAt = 0;
    this.lastRepAt = 0;
  }

  public getState(): RepState {
    return this.state;
  }

  /** Rep-exercises return 0; the plank detector overrides this. */
  public getElapsedValidHoldMs(): number {
    return 0;
  }
}