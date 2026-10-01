import { EMA_ALPHA, STALE_FRAME_TIMEOUT_MS } from "../constants/exerciseDetection";
import type { NullablePoseFrame, PoseFrame, PoseLandmark } from "./poseTypes";

export interface FrameSmootherOptions {
  alpha?: number;
  /** If a path has no value on the new frame, the previous value lives this long. */
  timeoutMs?: number;
}

/** One-pole (EMA) smoother over the whole pose, with per-landmark staleness tracking. */
export class PoseFrameSmoother {
  private alpha: number;
  private timeoutMs: number;
  private smoothed: NullablePoseFrame | null = null;
  private lastSeenAt = 0;
  private lastTimestamp = 0;
  private lastSeenByLandmark = new Map<keyof NullablePoseFrame, number>();

  constructor(options: FrameSmootherOptions = {}) {
    this.alpha = options.alpha ?? EMA_ALPHA;
    this.timeoutMs = options.timeoutMs ?? STALE_FRAME_TIMEOUT_MS;
  }

  /** Returns the smoothed pose, or null when nothing has been fed yet. */
  get(): NullablePoseFrame | null {
    return this.smoothed;
  }

  lastUpdate(): number {
    return this.lastTimestamp;
  }

  reset(): void {
    this.smoothed = null;
    this.lastSeenAt = 0;
    this.lastTimestamp = 0;
    this.lastSeenByLandmark.clear();
  }

  private smoothValue(name: keyof NullablePoseFrame, next: PoseLandmark | undefined, now: number): PoseLandmark | undefined {
    if (next) {
      const prev = this.smoothed?.[name];
      const out: PoseLandmark = prev
        ? {
            x: prev.x * (1 - this.alpha) + next.x * this.alpha,
            y: prev.y * (1 - this.alpha) + next.y * this.alpha,
            z: (prev.z ?? 0) * (1 - this.alpha) + (next.z ?? 0) * this.alpha,
            visibility: (prev.visibility ?? 0) * (1 - this.alpha) + (next.visibility ?? 0) * this.alpha,
            confidence: next.confidence ?? next.visibility,
          }
        : { ...next };
      this.lastSeenByLandmark.set(name, now);
      return out;
    }
    const lastSeen = this.lastSeenByLandmark.get(name);
    if (lastSeen !== undefined && now - lastSeen < this.timeoutMs) {
      return this.smoothed?.[name];
    }
    return undefined;
  }

  push(frame: PoseFrame): NullablePoseFrame {
    const now = frame.timestamp;
    this.lastSeenAt = now;
    this.lastTimestamp = now;
    const out = {
      timestamp: now,
      overallConfidence: frame.overallConfidence,
      personCount: frame.personCount,
    } as unknown as NullablePoseFrame;
    const keys = [
      "nose",
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ] as const;
    for (const key of keys) {
      const value = this.smoothValue(key, frame[key], now);
      if (value) {
        (out[key] as PoseLandmark | undefined) = value;
      }
    }
    this.smoothed = out;
    return out;
  }

  isStale(nowMs: number): boolean {
    return this.smoothed === null || nowMs - this.lastSeenAt > this.timeoutMs;
  }
}