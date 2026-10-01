import { AlertCircle } from "lucide-react";

export interface PauseConfirmationModalProps {
  isOpen: boolean;
  onResume: () => void;
  onConfirmExit: () => void;
}

export function PauseConfirmationModal({
  isOpen,
  onResume,
  onConfirmExit,
}: PauseConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-neutral-900/95 p-6 text-center shadow-2xl">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertCircle size={32} />
        </div>

        <h3 className="text-xl font-bold text-white">Pause challenge?</h3>
        <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
          Your alarm will stay active until all exercise reps are verified.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            onClick={onResume}
            className="flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-[#FF6B2C] text-base font-bold text-white shadow-lg shadow-orange-500/25 active:scale-[0.98] transition"
          >
            Keep Going
          </button>

          <button
            onClick={onConfirmExit}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-neutral-300 hover:bg-white/15 active:scale-[0.98] transition"
          >
            Exit Challenge
          </button>
        </div>
      </div>
    </div>
  );
}
