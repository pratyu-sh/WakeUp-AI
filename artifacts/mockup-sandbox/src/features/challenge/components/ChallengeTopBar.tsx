import { Volume2, VolumeX, X } from "lucide-react";
import { AIStatusPill, type AIStatusType } from "./AIStatusPill";
import type { Exercise } from "../../../lib/alarm-store";

export interface ChallengeTopBarProps {
  exercise: Exercise;
  aiStatus: AIStatusType;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onRequestClose: () => void;
}

export function ChallengeTopBar({
  exercise,
  aiStatus,
  voiceEnabled,
  onToggleVoice,
  onRequestClose,
}: ChallengeTopBarProps) {
  const titles: Record<Exercise, string> = {
    pushups: "Push-Up Counter",
    squats: "Squat Counter",
    burpees: "Burpee Counter",
    plank: "Plank Timer",
  };

  return (
    <header className="relative z-30 flex w-full items-center justify-between px-5 pt-6 pb-3">
      {/* Close button that triggers pause confirmation */}
      <button
        onClick={onRequestClose}
        aria-label="Pause and exit challenge"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 hover:bg-white/30 border border-white/15 shadow-sm"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {/* Screen Title */}
      <h1 className="text-base font-bold tracking-tight text-white drop-shadow-md">
        {titles[exercise]}
      </h1>

      {/* Right controls: AI Status & Voice toggle */}
      <div className="flex items-center gap-2">
        <AIStatusPill status={aiStatus} />

        <button
          onClick={onToggleVoice}
          aria-label={voiceEnabled ? "Mute voice coach" : "Unmute voice coach"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 hover:bg-white/30 border border-white/15"
        >
          {voiceEnabled ? (
            <Volume2 size={16} className="text-emerald-300" />
          ) : (
            <VolumeX size={16} className="text-white/60" />
          )}
        </button>
      </div>
    </header>
  );
}
