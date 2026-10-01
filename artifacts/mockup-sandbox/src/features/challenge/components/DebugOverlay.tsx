import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ChallengeSnapshot } from "../engine/ChallengeEngine";
import type { DetectionStatus } from "../hooks/usePoseDetection";
import type { CameraPermissionState } from "../hooks/useCameraPermission";

export interface DebugOverlayProps {
  snapshot: ChallengeSnapshot | null;
  detection: DetectionStatus;
  cameraState: CameraPermissionState;
  frameRate: number;
}

/** Dev-only panel proving the loop is live: statuses, counters, quality, metrics. */
export function DebugOverlay({ snapshot, detection, cameraState, frameRate }: DebugOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (!snapshot) return null;

  const rows: Array<[string, string]> = [
    ["status", snapshot.status.toUpperCase()],
    ["camera", cameraState],
    ["pose", detection],
    ["fps", frameRate.toFixed(1)],
    ["reps", `${snapshot.reps}${snapshot.targetReps ? `/${snapshot.targetReps}` : ""}`],
    ["form", snapshot.formQuality === null ? "—" : snapshot.formQuality.toFixed(2)],
    ["elbow", snapshot.elbowAngle !== null && snapshot.elbowAngle !== undefined ? `${snapshot.elbowAngle}°` : "—"],
    ["knee", snapshot.kneeAngle !== null && snapshot.kneeAngle !== undefined ? `${snapshot.kneeAngle}°` : "—"],
    ["deviation", snapshot.bodyDeviation !== null && snapshot.bodyDeviation !== undefined ? `${snapshot.bodyDeviation}°` : "—"],
    ["stable", `${snapshot.stableFrameCount ?? 0}/${snapshot.requiredStableFrames ?? 6}`],
    ["issue", snapshot.qualityIssue ?? "—"],
    ["cheat", snapshot.cheatReason ?? "—"],
    ["state", snapshot.detectorState],
    ["feedback", snapshot.feedback ?? "—"],
  ];

  return (
    <div className="absolute right-4 top-24 z-30 pointer-events-auto">
      {isOpen ? (
        <div className="w-64 rounded-2xl border border-emerald-400/30 bg-black/85 p-3.5 font-mono text-[10px] text-emerald-200 shadow-2xl backdrop-blur-md transition-all">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> debug · telemetry live
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/20"
            >
              <span>Hide</span>
              <ChevronDown size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-slate-400">{k}</span>
                <span className="truncate text-right font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-black/70 px-3 py-1 font-mono text-[10px] font-medium text-emerald-300 backdrop-blur shadow-lg transition active:scale-95"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span>telemetry: {frameRate.toFixed(0)} fps</span>
          <ChevronUp size={12} />
        </button>
      )}
    </div>
  );
}