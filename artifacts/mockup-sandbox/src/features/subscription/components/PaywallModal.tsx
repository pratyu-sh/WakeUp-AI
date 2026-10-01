import React, { useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { useOfferings } from "../hooks/useOfferings";
import { usePurchase } from "../hooks/usePurchase";
import { useRestorePurchases } from "../hooks/useRestorePurchases";
import type { PackageProduct } from "../subscriptionTypes";

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextTitle?: string;
  contextSubtitle?: string;
  onSuccess?: () => void;
}

export function PaywallModal({
  isOpen,
  onClose,
  contextTitle,
  contextSubtitle,
  onSuccess,
}: PaywallModalProps) {
  const { offering, loading: loadingOfferings } = useOfferings();
  const { purchasePackage, isPurchasing, error: purchaseError } = usePurchase();
  const { restore, isRestoring, error: restoreError } = useRestorePurchases();

  // Packages from RevenueCat Offerings
  const annualPkg =
    offering.annual ||
    offering.availablePackages.find((p) => p.packageType === "ANNUAL") ||
    null;
  const monthlyPkg =
    offering.monthly ||
    offering.availablePackages.find((p) => p.packageType === "MONTHLY") ||
    null;

  // Selected plan identifier: default to Annual / Yearly
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [trialEnabled, setTrialEnabled] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentPkg: PackageProduct | null =
    selectedPlan === "yearly" ? annualPkg : monthlyPkg;

  const handleStart = async () => {
    if (!currentPkg) return;
    const res = await purchasePackage(currentPkg);
    if (res.success) {
      onSuccess?.();
      onClose();
    }
  };

  const handleRestore = async () => {
    const res = await restore();
    if (res.success) {
      onSuccess?.();
      onClose();
    }
  };

  const dueTodayString = trialEnabled
    ? "$0.00"
    : (currentPkg?.priceString || (selectedPlan === "yearly" ? "₹1,499" : "₹199"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your WakeUp AI plan"
    >
      {/* Outer Phone Shell / Container */}
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-[40px] text-white shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-white/[0.10] max-h-[95vh] flex flex-col justify-between"
        style={{
          background:
            "radial-gradient(circle at 50% 12%, #1D1445 0%, #0B081A 45%, #05040E 100%)",
        }}
      >
        {/* Subtle Ambient Radial Highlights */}
        <div
          className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-gradient-to-t from-fuchsia-600/35 via-purple-600/25 to-transparent blur-3xl"
          aria-hidden="true"
        />

        {/* Top App Header with Close Button & Centered Dynamic Island Badge */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-5 pb-1">
          {/* Close '✕' Button */}
          <button
            onClick={onClose}
            disabled={isPurchasing || isRestoring}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            aria-label="Close paywall"
          >
            <X size={18} strokeWidth={2} />
          </button>

          {/* Top Dynamic Island Badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#121024]/80 backdrop-blur-md px-3.5 py-1 border border-white/[0.08] shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00] shadow-[0_0_8px_#D4FF00] animate-pulse" />
            <span className="font-mono text-[10px] font-semibold tracking-widest text-white/80 uppercase">
              WAKEUP
            </span>
          </div>

          <div className="w-9" />
        </div>

        {/* Main Body Content */}
        <div className="relative z-20 px-6 space-y-4 pt-1 pb-2 overflow-y-auto">
          {/* Hero Emblem Section with Rotating Curved Text */}
          <div className="relative mx-auto my-1 flex h-28 w-28 items-center justify-center">
            {/* Ambient Badge Back-Glow */}
            <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/20 blur-xl" />

            {/* Circular Rotating SVG Ribbon */}
            <svg
              className="absolute inset-0 h-full w-full animate-[spin_16s_linear_infinite]"
              viewBox="0 0 100 100"
            >
              <defs>
                <path
                  id="circlePath"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[7.5px] font-bold uppercase tracking-[0.24em] fill-[#C4B5FB]/80">
                <textPath href="#circlePath" startOffset="0%">
                  super · super · super · super ·
                </textPath>
              </text>
            </svg>

            {/* Central Brand Emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <span className="text-[20px] font-bold tracking-tight text-white leading-none">
                WAKE
              </span>
              <span className="text-[20px] font-bold tracking-tight text-[#C4B5FB] leading-none">
                UP AI
              </span>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="text-left space-y-1.5">
            <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
              {contextTitle || "Choose your plan"}
            </h2>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#A796D9] font-normal">
              {contextSubtitle ||
                "Wake up into a better state. Move, build unbreakable morning consistency, and unlock all AI motion challenges."}
            </p>
          </div>

          {/* Neon Chartreuse / Lime "Free Trial Enabled" Box (Image 2 style) */}
          <button
            type="button"
            onClick={() => setTrialEnabled((v) => !v)}
            className={`w-full rounded-[18px] p-4 transition-all duration-200 text-left cursor-pointer flex items-center justify-between backdrop-blur-[20px] ${
              trialEnabled
                ? "border-2 border-[#D4FF00] bg-[#121024]/90 shadow-[0_0_25px_rgba(212,255,0,0.18)]"
                : "border border-white/[0.08] bg-white/[0.035] opacity-70"
            }`}
          >
            <div>
              <p className="text-[15px] font-semibold text-white leading-tight">
                {trialEnabled ? "Free trial enabled" : "Free trial disabled"}
              </p>
              <p className="text-[12px] text-white/60 mt-0.5">
                {trialEnabled ? "Cancel anytime before trial ends." : "Instant membership access."}
              </p>
            </div>

            {/* Circular Checkmark Button in Neon Lime */}
            <div
              className={`grid h-7 w-7 place-items-center rounded-full transition ${
                trialEnabled
                  ? "bg-[#D4FF00] text-black shadow-[0_0_12px_rgba(212,255,0,0.5)] font-bold"
                  : "border border-white/20 text-transparent"
              }`}
            >
              <Check size={16} strokeWidth={3} />
            </div>
          </button>

          {/* Sub-label Under Box */}
          <div className="flex items-center justify-between px-1 text-[13px] font-medium text-white/70">
            <span>Due today - {dueTodayString}</span>
            <span className="text-[#C4B5FB] font-semibold">
              {trialEnabled ? "3 days free" : "Full access"}
            </span>
          </div>

          {/* Subscription Tier Cards */}
          <div className="space-y-3 pt-1">
            {/* Monthly Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`w-full rounded-[18px] p-4 transition text-left cursor-pointer flex items-center justify-between backdrop-blur-[20px] border ${
                selectedPlan === "monthly"
                  ? "border-[#A855F7]/70 bg-[#1E1738]/90 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                  : "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"
              }`}
            >
              <div>
                <p className="text-[15px] font-semibold text-white">Monthly</p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  {monthlyPkg?.priceString || "₹199 / month"}
                </p>
              </div>

              <span className="text-[12px] text-white/70 font-normal">
                {trialEnabled ? "3-day free trial" : "Billed monthly"}
              </span>
            </button>

            {/* Yearly Card (With Neon "BEST VALUE" Pill Badge) */}
            <div className="relative">
              {/* "BEST VALUE" Badge in Neon Lime sitting on the top right border */}
              <div className="absolute -top-3 right-5 z-20 rounded-full bg-[#D4FF00] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-[0_0_12px_rgba(212,255,0,0.4)]">
                BEST VALUE
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan("yearly")}
                className={`w-full rounded-[18px] p-4 transition text-left cursor-pointer flex items-center justify-between border relative backdrop-blur-[20px] ${
                  selectedPlan === "yearly"
                    ? "border-[#A855F7]/70 bg-[#1E1738]/90 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                    : "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"
                }`}
              >
                <div>
                  <p className="text-[15px] font-semibold text-white">Annual</p>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {annualPkg?.priceString || "₹1,499 / year"}
                  </p>
                </div>

                <span className="text-[13px] font-semibold text-white/90">
                  {annualPkg?.introPriceString || "₹125 / mo equivalent"}
                </span>
              </button>
            </div>
          </div>

          {/* Inline Error if any */}
          {(purchaseError || restoreError) && (
            <p className="text-center text-xs font-semibold text-rose-300">
              {purchaseError || restoreError}
            </p>
          )}

          {/* Legal / Policy Footer Links */}
          <div className="flex items-center justify-center gap-7 pt-2 text-[12px] text-[#A796D9]">
            <button
              type="button"
              onClick={() => window.open?.("#terms", "_blank")}
              className="hover:text-white transition cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => window.open?.("#privacy", "_blank")}
              className="hover:text-white transition cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring || isPurchasing}
              className="hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? "Restoring..." : "Restore"}
            </button>
          </div>
        </div>

        {/* Bottom CTA Area: Pure White Pill Button (Image 2 style) */}
        <div className="relative z-20 px-6 pb-6 pt-2 space-y-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={isPurchasing || isRestoring || loadingOfferings}
            className="flex h-14 w-full items-center justify-center rounded-full bg-white text-black font-bold text-[17px] tracking-tight shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition hover:bg-neutral-200 active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isPurchasing ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={17} className="animate-spin text-black" />
                <span>Processing...</span>
              </span>
            ) : (
              <span>{trialEnabled ? "Try For $0.00" : "Unlock WakeUp AI+"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isPurchasing || isRestoring}
            className="w-full text-center text-xs font-medium text-white/50 hover:text-white transition py-1 cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
