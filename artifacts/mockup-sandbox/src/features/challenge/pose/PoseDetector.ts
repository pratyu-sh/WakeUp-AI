import type { PoseFrame } from "./poseTypes";

export interface PoseDetector {
  /** Detect poses in the given video frame. Returns a frame (personCount may be 0). */
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null;
  reset(): void;
  close(): void;
}