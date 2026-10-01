import { Play } from "lucide-react";

export function ChallengePausedOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white border border-white/20">
          <Play size={28} className="translate-x-0.5" fill="currentColor" />
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">Challenge paused</h2>
        <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
          Get back into position when you&apos;re ready. Your alarm is still active.
        </p>

        <button
          onClick={onResume}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-[#FF6B2C] text-base font-bold text-white shadow-xl shadow-orange-500/25 active:scale-[0.98] transition"
        >
          <Play size={18} fill="currentColor" />
          <span>Resume Challenge</span>
        </button>
      </div>
    </div>
  );
}
