import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { FeedbackTone } from "../hooks/useChallengeFeedback";

export interface CoachFeedbackProps {
  message: string;
  tone: FeedbackTone;
}

export function CoachFeedback({ message, tone }: CoachFeedbackProps) {
  if (!message) return null;

  // Determine icon based on message contents
  const lowerText = message.toLowerCase();
  let Icon = Info;
  if (lowerText.includes("up") || lowerText.includes("stand")) {
    Icon = ArrowUp;
  } else if (lowerText.includes("lower") || lowerText.includes("down") || lowerText.includes("deep")) {
    Icon = ArrowDown;
  } else if (lowerText.includes("great") || lowerText.includes("good") || lowerText.includes("perfect") || tone === "pass") {
    Icon = CheckCircle2;
  } else if (tone === "warn") {
    Icon = TriangleAlert;
  }

  // Tone color styling
  let containerStyle =
    "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] border border-emerald-400/40";
  if (tone === "warn") {
    containerStyle =
      "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.4)] border border-amber-300/40";
  } else if (tone === "info") {
    containerStyle =
      "bg-black/75 text-white/95 backdrop-blur-md shadow-lg border border-white/20";
  }

  return (
    <div className="pointer-events-none flex justify-center px-4 transition-all duration-200 ease-out">
      <div
        className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-wide transition-transform ${containerStyle}`}
      >
        <Icon size={18} strokeWidth={2.6} className="shrink-0 drop-shadow" />
        <span className="drop-shadow-sm">{message}</span>
      </div>
    </div>
  );
}
