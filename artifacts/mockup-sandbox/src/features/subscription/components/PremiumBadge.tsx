import React from "react";
import { Sparkles } from "lucide-react";

export interface PremiumBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export function PremiumBadge({ size = "sm", className = "" }: PremiumBadgeProps) {
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider text-white bg-[#1C1832] shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-white/15 ${
        isSm
          ? "px-2 py-0.5 text-[10px]"
          : "px-3 py-1 text-xs"
      } ${className}`}
    >
      <Sparkles size={isSm ? 10 : 13} className="text-[#EDE9FE]" />
      <span>AI+</span>
    </span>
  );
}
