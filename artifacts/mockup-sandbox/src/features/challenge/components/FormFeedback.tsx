export interface FormFeedbackProps {
  message: string | null;
  quality: number | null;
  tone?: "info" | "warn" | "pass";
}

export function FormFeedback({ message, quality, tone = "info" }: FormFeedbackProps) {
  if (!message && quality === null) return null;
  const toneClass =
    tone === "pass"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : tone === "warn"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
        : "border-white/10 bg-black/50 text-slate-200";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-6">
      <div className={`flex flex-col items-center gap-2 rounded-3xl border px-5 py-3 backdrop-blur ${toneClass}`}>
        {message && <p className="text-center text-sm font-medium">{message}</p>}
        {quality !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Form</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.round(quality * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}