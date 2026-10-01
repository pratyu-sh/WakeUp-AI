import { useCallback, useEffect, useRef, useState } from "react";

export type CameraPermissionState = "unknown" | "requested" | "granted" | "denied";

export interface UseCameraPermissionResult {
  state: CameraPermissionState;
  error: string | null;
  stream: MediaStream | null;
  attach: (video: HTMLVideoElement | null) => void;
  request: () => Promise<void>;
  stop: () => void;
}

/**
 * Requests the camera, attaches the live stream to a <video> element and
 * tracks the permission lifecycle. Call `stop()` on unmount.
 */
export function useCameraPermission(): UseCameraPermissionResult {
  const [state, setState] = useState<CameraPermissionState>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const attach = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => undefined);
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const request = useCallback(async () => {
    if (streamRef.current) {
      setState("granted");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not available in this browser.");
      setState("denied");
      return;
    }
    setState("requested");
    try {
      const devStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = devStream;
      setStream(devStream);
      if (videoRef.current) {
        videoRef.current.srcObject = devStream;
        await videoRef.current.play();
      }
      setState("granted");
      setError(null);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(name === "NotAllowedError" ? "Camera permission blocked" : "Could not start the camera");
      setState("denied");
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { state, error, stream, attach, request, stop };
}

export function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}