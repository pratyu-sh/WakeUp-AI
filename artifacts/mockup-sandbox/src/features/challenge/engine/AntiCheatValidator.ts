import { DETECTION_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";

export type AntiCheatReason = "camera_shake" | "camera_moved" | "person_swapped" | "rapid_movement" | "ok";

export type AntiCheatVerdict =
  | { ok: true; reason: "ok" }
  | { ok: false; reason: Exclude<AntiCheatReason, "ok"> };

interface MovingPoint {
  x: number;
  y: number;
  t: number;
  bodySize: number;
}

export const MIN_REP_INTERVAL_MS = 450;

/**
 * Structural anti-cheat: watches the body centroid's motion across frames.
 * - A sudden huge jump = the subject was swapped / the camera panned.
 * - Sustained fast jitter = the device is shaking (motions a real person
 *   performing an exercise wouldn't produce).
 * - Rep-rate ceiling = impossible superhuman repetition rates (<450ms) are rejected.
 * These are hard gates: while active, the rep machines must not advance.
 */
export class AntiCheatValidator {
  private prev: MovingPoint | null = null;
  private shakeCounter = 0;
  private lastDecayAt = 0;
  private lastRepAt = 0;

  constructor(private readonly options: { shakeThreshold?: number; swapThreshold?: number; minShakeFrames?: number; minRepIntervalMs?: number } = {}) {}

  reset(): void {
    this.prev = null;
    this.shakeCounter = 0;
    this.lastRepAt = 0;
  }

  /**
   * Verifies that a repetition completion did not occur abnormally fast (<450ms).
   */
  validateRepRate(nowMs: number): AntiCheatVerdict {
    const minInterval = this.options.minRepIntervalMs ?? MIN_REP_INTERVAL_MS;
    if (this.lastRepAt > 0 && nowMs - this.lastRepAt < minInterval) {
      return { ok: false, reason: "rapid_movement" };
    }
    this.lastRepAt = nowMs;
    return { ok: true, reason: "ok" };
  }

  push(frame: PoseFrame): AntiCheatVerdict {
    const points = [frame.leftShoulder, frame.rightShoulder, frame.leftHip, frame.rightHip].filter(
      (p): p is NonNullable<typeof p> => Boolean(p),
    );
    if (points.length === 0 || !frame.leftShoulder || !frame.leftHip) {
      this.prev = null;
      return { ok: true, reason: "ok" };
    }
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const bodySize = Math.hypot(frame.leftShoulder.x - frame.leftHip.x, frame.leftShoulder.y - frame.leftHip.y) || 0.0001;

    const swapThreshold = this.options.swapThreshold ?? 0.55;
    const shakeThreshold = this.options.shakeThreshold ?? DETECTION_CONFIG.cameraShakeMaxFrameDelta;
    const minShakeFrames = this.options.minShakeFrames ?? 8;

    if (this.prev) {
      const deltaT = frame.timestamp - this.prev.t;
      const dx = cx - this.prev.x;
      const dy = cy - this.prev.y;
      const dist = Math.hypot(dx, dy);

      if (deltaT > DETECTION_CONFIG.maxFrameGapMs || deltaT <= 0) {
        this.prev = { x: cx, y: cy, t: frame.timestamp, bodySize };
        return { ok: true, reason: "ok" };
      }

      if (dist > swapThreshold) {
        this.prev = { x: cx, y: cy, t: frame.timestamp, bodySize };
        return { ok: false, reason: "person_swapped" };
      }

      if (dist > shakeThreshold) {
        this.shakeCounter += 1;
      } else if (this.shakeCounter > 0) {
        this.shakeCounter = Math.max(0, this.shakeCounter - 2);
      }
      if (this.shakeCounter >= minShakeFrames) {
        this.prev = { x: cx, y: cy, t: frame.timestamp, bodySize };
        return { ok: false, reason: "camera_shake" };
      }
    }

    this.prev = { x: cx, y: cy, t: frame.timestamp, bodySize };
    if (frame.timestamp - this.lastDecayAt > 1500 && this.shakeCounter > 0) {
      this.shakeCounter = Math.max(0, this.shakeCounter - 3);
      this.lastDecayAt = frame.timestamp;
    }
    return { ok: true, reason: "ok" };
  }
}