import { useCallback, useEffect, useRef, useState } from "react";
import { DETECTION_CONFIG } from "../constants/exerciseDetection";
import { MediaPipePoseDetector } from "../pose/MediaPipePoseDetector";
import type { PoseFrame } from "../pose/poseTypes";

export type DetectionStatus = "idle" | "loading" | "ready" | "detecting" | "error";

export interface UsePoseDetectionOptions {
  wasmBasePath?: string;
  modelAssetPath?: string;
  onPose: (frame: PoseFrame) => void;
}

/**
 * Owns the MediaPipe instance and a requestAnimationFrame loop. The detector is
 * created lazily on the first `start()`, reused until unmount, and runs at a
 * throttled interval (`frameIntervalMs`) so mid-range devices stay smooth.
 */
export function usePoseDetection(options: UsePoseDetectionOptions) {
  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<MediaPipePoseDetector | null>(null);
  const rafRef = useRef(0);
  const lastDetectAtRef = useRef(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const onPoseRef = useRef(options.onPose);
  onPoseRef.current = options.onPose;

  const wasmBasePath = options.wasmBasePath ?? "/mediapipe/wasm";
  const modelAssetPath = options.modelAssetPath ?? "/mediapipe/models/pose_landmarker_lite.task";

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    activeVideoRef.current = null;
    setStatus((s) => (s === "detecting" || s === "ready" ? "idle" : s));
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement) => {
      stop();
      activeVideoRef.current = video;
      if (!detectorRef.current) {
        setStatus("loading");
        try {
          detectorRef.current = await MediaPipePoseDetector.create({
            wasmBasePath,
            modelAssetPath,
            delegate: "GPU",
          });
        } catch {
          try {
            detectorRef.current = await MediaPipePoseDetector.create({
              wasmBasePath,
              modelAssetPath,
              delegate: "CPU",
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Pose model failed to load");
            setStatus("error");
            return;
          }
        }
      }
      setStatus("ready");

      const loop = (t: number) => {
        const v = activeVideoRef.current;
        if (v && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          if (t - lastDetectAtRef.current >= DETECTION_CONFIG.frameIntervalMs) {
            lastDetectAtRef.current = t;
            try {
              const frame = detectorRef.current?.detect(v, Date.now()) ?? null;
              if (frame && frame.timestamp > 0 && detectorRef.current) {
                onPoseRef.current(frame);
                setStatus("detecting");
              }
            } catch {
              /* one bad frame must not kill the loop */
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [modelAssetPath, stop, wasmBasePath],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  return { status, error, start, stop };
}