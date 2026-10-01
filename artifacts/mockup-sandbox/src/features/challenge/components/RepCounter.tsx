import { useEffect, useState } from "react";
import type { Exercise } from "../../../lib/alarm-store";

export interface RepCounterProps {
  reps: number;
  target: number;
  exercise: Exercise;
}

export function RepCounter({ reps, target, exercise }: RepCounterProps) {
  const [pulsing, setPulsing] = useState(false);

  // Trigger smooth scale pulse when a valid rep increments
  useEffect(() => {
    if (reps <= 0) return;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 260);
    return () => clearTimeout(timer);
  }, [reps]);

  const remaining = Math.max(0, target - reps);
  const pct = Math.min(100, Math.max(0, (reps / Math.max(1, target)) * 100));

  const exerciseLabel =
    exercise === "pushups"
      ? "PUSH-UPS"
      : exercise === "squats"
        ? "SQUATS"
        : exercise === "burpees"
          ? "BURPEES"
          : "REPS";

  return (
    <div className="pointer-events-none flex flex-col items-center text-center select-none">
      {/* Massive Rep Number */}
      <div
        className={`transition-transform duration-200 ease-out ${
          pulsing ? "scale-115 text-orange-400" : "scale-100 text-white"
        }`}
      >
        <span
          className="text-8xl sm:text-9xl font-black tracking-tighter leading-none text-white select-none font-number"
          style={{
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 6px 28px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.8)",
          }}
        >
          {reps}
        </span>
      </div>

      {/* Exercise Label */}
      <p
        className="mt-1.5 text-base sm:text-lg font-extrabold uppercase tracking-[0.25em] text-white/90 drop-shadow-md"
        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
      >
        {exerciseLabel}
      </p>

      {/* Remaining Count */}
      <p
        className="mt-1 text-xs sm:text-sm font-bold tracking-widest text-[#FF6B2C] drop-shadow"
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
      >
        {remaining === 0 ? "COMPLETE ✓" : `${remaining} LEFT`}
      </p>

      {/* Smooth Progress Bar */}
      <div className="mt-3.5 h-2 w-48 max-w-[70vw] overflow-hidden rounded-full bg-white/25 backdrop-blur-sm shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-[#FF6B2C] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}