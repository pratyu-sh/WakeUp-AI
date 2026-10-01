export type AIStatusType =
  | "preparing"
  | "ready"
  | "tracking"
  | "lost"
  | "paused";

export function AIStatusPill({ status }: { status: AIStatusType }) {
  const configs = {
    tracking: {
      label: "TRACKING",
      color: "text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
      bg: "bg-emerald-500/20 border-emerald-500/40",
    },
    ready: {
      label: "AI READY",
      color: "text-emerald-300",
      dot: "bg-emerald-400",
      bg: "bg-emerald-500/20 border-emerald-500/40",
    },
    preparing: {
      label: "GETTING READY",
      color: "text-amber-300",
      dot: "bg-amber-400 animate-pulse",
      bg: "bg-amber-500/20 border-amber-500/40",
    },
    lost: {
      label: "CAMERA LOST",
      color: "text-rose-300",
      dot: "bg-rose-400 animate-pulse",
      bg: "bg-rose-500/20 border-rose-500/40",
    },
    paused: {
      label: "PAUSED",
      color: "text-slate-300",
      dot: "bg-slate-400",
      bg: "bg-white/10 border-white/20",
    },
  };

  const cfg = configs[status] ?? configs.tracking;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wider backdrop-blur-md transition-all ${cfg.bg} ${cfg.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </div>
  );
}
