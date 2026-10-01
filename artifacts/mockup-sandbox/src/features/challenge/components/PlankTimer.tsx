export interface PlankTimerProps {
  heldMs: number;
  targetMs: number;
  formValid?: boolean;
}

export function PlankTimer({ heldMs, targetMs, formValid = true }: PlankTimerProps) {
  const pct = Math.min(100, Math.max(0, (heldMs / Math.max(1, targetMs)) * 100));

  const totalSecHeld = Math.floor(heldMs / 1000);
  const m = Math.floor(totalSecHeld / 60);
  const s = totalSecHeld % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const remainingSec = Math.max(0, Math.ceil((targetMs - heldMs) / 1000));

  return (
    <div className="pointer-events-none flex flex-col items-center text-center select-none">
      {/* Massive Duration Timer */}
      <span
        className="text-7xl sm:text-8xl font-black tracking-tighter leading-none text-white select-none font-number"
        style={{
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 6px 28px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.8)",
        }}
      >
        {timeFormatted}
      </span>

      {/* Exercise Label */}
      <p
        className="mt-1.5 text-base sm:text-lg font-extrabold uppercase tracking-[0.25em] text-white/90 drop-shadow-md"
        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
      >
        PLANK
      </p>

      {/* Remaining Duration & Form Status */}
      <div className="mt-1 flex items-center gap-2">
        <span
          className="text-xs sm:text-sm font-bold tracking-widest text-[#FF6B2C] drop-shadow"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
        >
          {remainingSec === 0 ? "COMPLETE ✓" : `${remainingSec} SEC LEFT`}
        </span>

        {formValid && (
          <span className="rounded-full bg-emerald-500/30 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            GOOD FORM ✓
          </span>
        )}
      </div>

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