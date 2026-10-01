import type { Exercise } from "../../../lib/alarm-store";

export interface CountdownOverlayProps {
  msRemaining: number;
  exercise?: Exercise;
  prompt?: string;
}

export function CountdownOverlay({ msRemaining, exercise, prompt }: CountdownOverlayProps) {
  const ceil = Math.max(1, Math.ceil(msRemaining / 1000));
  const label = ceil > 0 && ceil <= 3 ? `${ceil}` : "GO";

  const exerciseName =
    exercise === "pushups"
      ? "Push-ups"
      : exercise === "squats"
        ? "Squats"
        : exercise === "burpees"
          ? "Burpees"
          : exercise === "plank"
            ? "Plank"
            : "Exercise";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <p className="mb-6 text-base font-bold uppercase tracking-[0.2em] text-white/80 drop-shadow">
        {prompt ?? `Get ready for ${exerciseName}`}
      </p>

      {/* Massive countdown number circle */}
      <div
        key={label}
        className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF6B2C] via-orange-500 to-amber-400 shadow-[0_0_50px_rgba(255,107,44,0.5)] border-2 border-white/40 animate-in zoom-in-50 duration-250"
      >
        <span
          className="text-7xl sm:text-8xl font-black text-white drop-shadow-lg font-number"
          style={{
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            fontWeight: 900,
          }}
        >
          {label}
        </span>
      </div>

      <p className="mt-8 font-mono text-xs uppercase tracking-widest text-neutral-300 drop-shadow">
        Hold your position
      </p>
    </div>
  );
}