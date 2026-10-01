export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-150"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}