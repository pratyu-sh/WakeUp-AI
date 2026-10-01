import React from "react";
import { Sparkles, X, Lock } from "lucide-react";
import type { Exercise } from "../../../lib/alarm-store";

export interface PremiumExerciseSheetProps {
  isOpen: boolean;
  exercise: Exercise | "adaptive_ai";
  onClose: () => void;
  onUpgrade: () => void;
}

const EXERCISE_METADATA: Record<
  Exercise | "adaptive_ai",
  { title: string; subtitle: string; description: string }
> = {
  pushups: {
    title: "Push-ups",
    subtitle: "Core movement",
    description: "Included in Free tier.",
  },
  squats: {
    title: "Squats",
    subtitle: "Lower body activation",
    description: "Fire up your legs and boost morning blood circulation with full-depth squats.",
  },
  burpees: {
    title: "Burpees",
    subtitle: "Maximum cardiovascular wake-up",
    description: "The ultimate anti-snooze exercise. Elevates heart rate in under 60 seconds.",
  },
  plank: {
    title: "Plank Hold",
    subtitle: "Core stability & focus",
    description: "Timed isometric challenge verified with strict spine-alignment detection.",
  },
  adaptive_ai: {
    title: "Adaptive Challenge",
    subtitle: "Intelligent difficulty",
    description: "WakeUp AI+ dynamically calibrates target reps based on your historical sleep and completion speed.",
  },
};

export function PremiumExerciseSheet({
  isOpen,
  exercise,
  onClose,
  onUpgrade,
}: PremiumExerciseSheetProps) {
  if (!isOpen) return null;

  const meta = EXERCISE_METADATA[exercise];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#07060E]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] rounded-t-[32px] sm:rounded-[28px] bg-[#121020]/95 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/[0.08] backdrop-blur-[30px] animate-in slide-in-from-bottom-6 duration-200">
        {/* Drag Handle on mobile */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[#C4B5FB] hover:bg-white/20 transition active:scale-95"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1C1832] border border-white/15 text-white shadow-md">
            <Lock size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-[#1C1832] border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#B0AFFA]">
              <Sparkles size={10} className="text-[#A855F7]" />
              <span>WAKEUP AI+ EXCLUSIVE</span>
            </div>
            <h3 className="text-xl font-semibold text-white mt-0.5">{meta.title}</h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#A796D9]">
          {meta.description}
        </p>

        <div className="mt-4 rounded-2xl bg-white/[0.045] border border-white/[0.08] p-3.5 text-xs text-[#A796D9]">
          <span className="font-semibold text-white">Why WakeUp AI+?</span> Add more ways to wake up with advanced AI challenges, adaptive difficulty, and unlimited alarms.
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#1C1832] border border-white/15 text-[15px] font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition active:scale-[0.98] hover:bg-[#252042]"
          >
            <span>UNLOCK AI+</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full text-xs font-semibold text-[#8775B5] hover:text-[#C4B5FB] transition active:scale-95"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
