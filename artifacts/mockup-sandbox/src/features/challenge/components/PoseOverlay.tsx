import { useEffect, useRef } from "react";
import type { PoseFrame, PoseLandmarkMap } from "../pose/poseTypes";

const CONNECTIONS: Array<[keyof PoseLandmarkMap, keyof PoseLandmarkMap]> = [
  // Arms
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  // Torso box
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  // Legs
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

export interface PoseOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  frameRef: React.RefObject<PoseFrame | null>;
  tone?: "neutral" | "valid" | "warn" | "lost";
}

/**
 * Pose skeleton rendered over the live camera.
 * Vibrant green bones and glowing yellow joint dots matching the reference design.
 * Coordinates are mirrored to align with the selfie video.
 */
export function PoseOverlay({
  videoRef,
  frameRef,
  tone = "valid",
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const frame = frameRef.current;
      if (canvas && video) {
        const w = video.clientWidth || video.videoWidth;
        const h = video.clientHeight || video.videoHeight;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          if (frame && tone !== "lost") {
            drawSkeleton(ctx, frame, w, h, tone);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, frameRef, tone]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  w: number,
  h: number,
  tone: "neutral" | "valid" | "warn" | "lost",
): void {
  // Determine bone and joint palette
  let boneColor = "#22c55e"; // Vibrant green (matching screenshot)
  let jointColor = "#facc15"; // Vibrant yellow
  let glowColor = "rgba(34, 197, 94, 0.4)";

  if (tone === "warn") {
    boneColor = "#f59e0b";
    jointColor = "#fbbf24";
    glowColor = "rgba(245, 158, 11, 0.4)";
  } else if (tone === "neutral") {
    boneColor = "rgba(226, 232, 240, 0.85)";
    jointColor = "#facc15";
    glowColor = "rgba(255, 255, 255, 0.3)";
  }

  // Draw connecting bones
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = boneColor;

  for (const [a, b] of CONNECTIONS) {
    const pa = frame[a];
    const pb = frame[b];
    if (!pa || !pb) continue;
    // Don't draw if confidence is too low
    if (typeof pa.visibility === "number" && pa.visibility < 0.35) continue;
    if (typeof pb.visibility === "number" && pb.visibility < 0.35) continue;

    ctx.beginPath();
    ctx.moveTo(sx(pa.x, w), pa.y * h);
    ctx.lineTo(sx(pb.x, w), pb.y * h);
    ctx.stroke();
  }
  ctx.restore();

  // Draw glowing joint landmark nodes
  const jointKeys: Array<keyof PoseLandmarkMap> = [
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
  ];

  for (const key of jointKeys) {
    const p = frame[key];
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
    if (typeof p.visibility === "number" && p.visibility < 0.35) continue;

    const x = sx(p.x, w);
    const y = p.y * h;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.fill();

    // Solid core dot
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = jointColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }
}

/** Mirror x coordinate to match the mirrored selfie video */
function sx(x: number, w: number): number {
  return w - x * w;
}