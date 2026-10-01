import { FilesetResolver, PoseLandmarker } from "../../../../vendor/mediapipe/index.mjs";
import { LANDMARK_INDEX } from "./landmarkIndex";
import type { PoseDetector } from "./PoseDetector";
import type { PoseFrame, PoseLandmark, PoseLandmarkMap } from "./poseTypes";

export interface MediaPipePoseDetectorOptions {
  /** Base path to the MediaPipe wasm loader + wasm files (absolute, e.g. "/mediapipe/wasm"). */
  wasmBasePath: string;
  /** Absolute path to the pose landmarker model task file (e.g. "/mediapipe/models/..."). */
  modelAssetPath: string;
  delegate?: "GPU" | "CPU";
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

/**
 * Real pose detection via MediaPipe Pose Landmarker running in a browser tab.
 * All landmarks are mapped into a normalized [0,1] x/y frame; y grows downward,
 * matching MediaPipe's normalized coordinates.
 */
export class MediaPipePoseDetector implements PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private readonly options: Required<MediaPipePoseDetectorOptions>;
  private lastTimestamp = 0;

  constructor(options: MediaPipePoseDetectorOptions) {
    this.options = {
      delegate: "GPU",
      numPoses: 2,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...options,
    };
  }

  static async create(options: MediaPipePoseDetectorOptions): Promise<MediaPipePoseDetector> {
    const detector = new MediaPipePoseDetector(options);
    await detector.load();
    return detector;
  }

  private async load(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(this.options.wasmBasePath);
    this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: this.options.modelAssetPath,
        delegate: this.options.delegate,
      },
      runningMode: "VIDEO",
      numPoses: this.options.numPoses,
      minPoseDetectionConfidence: this.options.minPoseDetectionConfidence,
      minPosePresenceConfidence: this.options.minPosePresenceConfidence,
      minTrackingConfidence: this.options.minTrackingConfidence,
      outputSegmentationMasks: false,
    });
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }
    const safeTimestamp = Math.max(timestampMs, this.lastTimestamp + 1);
    this.lastTimestamp = safeTimestamp;
    const result = this.landmarker.detectForVideo(video, safeTimestamp);
    const poses = result.landmarks ?? [];
    const primary = poses[0] ?? [];
    const map = {} as PoseLandmarkMap;
    let confidenceSum = 0;
    let confidenceCount = 0;
    for (const [index, landmark] of primary.entries()) {
      const name = LANDMARK_INDEX[index];
      if (!name) continue;
      const point: PoseLandmark = {
        x: landmark.x,
        y: landmark.y,
        z: landmark.z ?? 0,
        visibility: landmark.visibility ?? 0,
      };
      map[name] = point;
      confidenceSum += point.visibility ?? 0;
      confidenceCount += 1;
    }
    const overallConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
    return {
      ...map,
      timestamp: timestampMs,
      overallConfidence,
      personCount: poses.length,
    };
  }

  reset(): void {
    // Vision tasks keep internal state per-request; nothing to reset between challenges.
  }

  close(): void {
    try {
      this.landmarker?.close();
    } catch {
      /* already closed */
    }
    this.landmarker = null;
  }
}