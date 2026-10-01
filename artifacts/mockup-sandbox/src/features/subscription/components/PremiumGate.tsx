import React, { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useEntitlement } from "../hooks/useEntitlement";
import type { FeatureGate } from "../subscriptionTypes";

export interface PremiumGateProps {
  feature: FeatureGate;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onUnlock?: () => void;
  inline?: boolean;
}

export function PremiumGate({
  feature,
  children,
  fallbackTitle,
  fallbackDescription,
  onUnlock,
  inline = false,
}: PremiumGateProps) {
  const { canUse } = useEntitlement();

  if (canUse(feature)) {
    return <>{children}</>;
  }

  if (inline) {
    return (
      <button
        onClick={onUnlock}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 px-3 py-1 text-xs font-semibold text-[#B0AFFA] hover:bg-[#8B5CF6]/25 transition"
      >
        <Lock size={12} className="text-[#A855F7]" />
        <span>Unlock AI+</span>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#1C1832] border border-white/15 text-white shadow-lg">
        <Lock size={22} strokeWidth={2} />
      </div>

      <h4 className="mt-4 text-base font-semibold text-white">
        {fallbackTitle || "WakeUp AI+ Feature"}
      </h4>

      <p className="mt-1 text-xs text-[#A796D9] max-w-xs mx-auto leading-relaxed">
        {fallbackDescription || "Unlock unlimited access with a WakeUp AI+ subscription."}
      </p>

      {onUnlock && (
        <button
          onClick={onUnlock}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[#1C1832] border border-white/15 px-6 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition active:scale-95 hover:bg-[#252042]"
        >
          Upgrade to AI+
        </button>
      )}
    </div>
  );
}
