import type { Exercise } from "../../../lib/alarm-store";

const GUIDE: Record<Exercise, { title: string; tips: string[]; figure: "pushup" | "squat" | "burpee" | "plank" }> = {
  pushups: {
    title: "Push-ups",
    tips: [
      "Face the camera, not toward it",
      "Whole body in frame — head to toes",
      "Body straight, chest to the floor, arms full extension",
    ],
    figure: "pushup",
  },
  squats: {
    title: "Squats",
    tips: [
      "Stand side-on or diagonal to the camera",
      "Feet visible — knees bend past 90°",
      "Chest up, sit hips back and down",
    ],
    figure: "squat",
  },
  burpees: {
    title: "Burpees",
    tips: [
      "Full sequence: squat → plank → jump up",
      "Every phase must be visible — hips to the floor",
      "Step (don't hop) back to keep it detected",
    ],
    figure: "burpee",
  },
  plank: {
    title: "Plank",
    tips: [
      "Body in one straight line, side-on to camera",
      "Don't sag — squeeze core and glutes",
      "Time counts only while form is valid",
    ],
    figure: "plank",
  },
};

function StickFigure({ kind }: { kind: "pushup" | "squat" | "burpee" | "plank" }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 80 120" className="h-40 w-full text-slate-700">
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none">
        {kind === "pushup" && (
          <>
            <line x1="14" y1="40" x2="14" y2="85" />
            <line x1="14" y1="85" x2="14" y2="110" />
            <circle cx="14" cy="37" r="4" fill="currentColor" stroke="none" />
            <line x1="14" y1="42" x2="46" y2="42" />
            <circle cx="46" cy="42" r="3" fill="currentColor" stroke="none" />
            <line x1="14" y1="85" x2="46" y2="85" />
          </>
        )}
        {kind === "squat" && (
          <>
            <line x1="40" y1="12" x2="40" y2="38" />
            <circle cx="40" cy="9" r="4" fill="currentColor" stroke="none" />
            <line x1="28" y1="26" x2="40" y2="38" />
            <line x1="52" y1="26" x2="40" y2="38" />
            <line x1="40" y1="38" x2="30" y2="78" />
            <line x1="40" y1="38" x2="50" y2="78" />
            <line x1="16" y1="96" x2="30" y2="78" />
            <line x1="64" y1="96" x2="50" y2="78" />
            <line x1="16" y1="96" x2="22" y2="112" />
            <line x1="64" y1="96" x2="58" y2="112" />
          </>
        )}
        {kind === "burpee" && (
          <>
            <line x1="40" y1="46" x2="40" y2="12" />
            <circle cx="40" cy="9" r="4" fill="currentColor" stroke="none" />
            <line x1="40" y1="46" x2="20" y2="60" />
            <line x1="40" y1="46" x2="60" y2="60" />
            <line x1="20" y1="60" x2="24" y2="106" />
            <line x1="60" y1="60" x2="56" y2="106" />
            <line x1="40" y1="46" x2="36" y2="92" />
            <line x1="40" y1="46" x2="44" y2="92" />
            <line x1="36" y1="92" x2="24" y2="106" />
            <line x1="44" y1="92" x2="56" y2="106" />
          </>
        )}
        {kind === "plank" && (
          <>
            <line x1="8" y1="60" x2="72" y2="60" />
            <circle cx="72" cy="60" r="4" fill="currentColor" stroke="none" />
            <line x1="8" y1="60" x2="18" y2="60" />
            <line x1="18" y1="60" x2="26" y2="78" />
            <line x1="26" y1="78" x2="40" y2="78" />
          </>
        )}
      </g>
    </svg>
  );
}

export interface BodyGuideProps {
  exercise: Exercise;
  calibrationState?: "positioning" | "detected" | "ready";
  stableFrameCount?: number;
  requiredStableFrames?: number;
  feedback?: string | null;
}

export function BodyGuide({
  exercise,
  calibrationState = "positioning",
  stableFrameCount = 0,
  requiredStableFrames = 6,
  feedback,
}: BodyGuideProps) {
  const guide = GUIDE[exercise];
  const isReady = calibrationState === "ready" || stableFrameCount >= requiredStableFrames;
  const isDetected = calibrationState === "detected" || stableFrameCount > 0;

  return (
    <div className="rounded-3xl border border-white/15 bg-black/60 p-4.5 backdrop-blur-md shadow-2xl transition-all">
      {/* Dynamic Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isReady
                ? "bg-emerald-400 animate-ping"
                : isDetected
                  ? "bg-amber-400 animate-pulse"
                  : "bg-white/40"
            }`}
          />
          <p className="text-xs font-bold uppercase tracking-widest text-white">
            {isReady
              ? "Good position ✓"
              : isDetected
                ? "Person detected — Hold still"
                : "Step into position"}
          </p>
        </div>
        {requiredStableFrames > 0 && (
          <span className="font-mono text-xs font-semibold text-slate-300">
            {Math.min(stableFrameCount, requiredStableFrames)}/{requiredStableFrames}
          </span>
        )}
      </div>

      {/* Stability Progress Bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-200 ${
            isReady ? "bg-emerald-400" : "bg-[#FF6B2C]"
          }`}
          style={{
            width: `${Math.min(100, (stableFrameCount / Math.max(1, requiredStableFrames)) * 100)}%`,
          }}
        />
      </div>

      {/* Actionable Feedback or Posture Tips */}
      <div className="mt-3 flex items-center gap-4">
        <div
          className={`shrink-0 rounded-2xl p-2 transition-colors ${
            isReady ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-300"
          }`}
        >
          <StickFigure kind={guide.figure} />
        </div>
        <div className="flex-1">
          {feedback ? (
            <p className="text-sm font-semibold text-amber-300 animate-pulse">{feedback}</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-200">
              {guide.tips.slice(0, 2).map((tip) => (
                <li key={tip} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#FF6B2C]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}