import React, { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Flame,
  Lock,
  Shield,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { setOnboardingCompleted } from "../onboardingStorage";

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedExercise, setSelectedExercise] = useState<"pushups" | "squats" | "plank">("pushups");
  const [selectedGoal, setSelectedGoal] = useState<string>("Finish my React project");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [isCustomActive, setIsCustomActive] = useState<boolean>(false);

  const goalOptions = [
    "Finish my React project",
    "Hit the gym at 6:30 AM",
    "Morning run & meditation",
    "Deep focus work session",
  ];

  const handleFinish = () => {
    setOnboardingCompleted();
    onComplete();
  };

  const nextStep = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
    } else {
      // Prompt notification permission if supported on final completion
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      handleFinish();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep((s) => (s - 1) as 0 | 1 | 2);
    }
  };

  const stepLabels = [
    "WAKEUP · 01/04",
    "MOVEMENT · 02/04",
    "AI VISION · 03/04",
    "PURPOSE · 04/04",
  ];

  return (
    <main
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col justify-between overflow-y-auto text-white font-['Plus_Jakarta_Sans',sans-serif] selection:bg-purple-900/30 selection:text-[#B0AFFA] select-none bg-[#07060E]"
      role="region"
      aria-label="Welcome and Onboarding Tour"
    >
      {/* Subtle Ambient Radial Highlight */}
      <div
        className="pointer-events-none fixed -bottom-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-purple-900/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-20 flex shrink-0 items-center justify-between px-6 pt-5 pb-2 max-w-[430px] mx-auto w-full">
        {/* Left Action / Brand */}
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={prevStep}
              aria-label="Go back to previous screen"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#C4B5FB] hover:bg-white/20 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#1C1832] border border-white/15 text-white shadow-md">
                <Flame size={16} />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest text-white uppercase">
                WAKEUP AI
              </span>
            </div>
          )}
        </div>

        {/* Center Dynamic Island Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#121020]/90 backdrop-blur-md px-3.5 py-1 border border-white/10 shadow-inner">
          <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7] animate-pulse" />
          <span className="font-mono text-[10px] font-semibold tracking-widest text-[#B0AFFA] uppercase">
            {stepLabels[step]}
          </span>
        </div>

        {/* Right Skip Action */}
        <div className="w-12 text-right">
          {step < 3 ? (
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs font-medium text-[#8775B5] hover:text-[#C4B5FB] transition active:scale-95 cursor-pointer py-1"
            >
              Skip
            </button>
          ) : (
            <span className="text-xs font-semibold text-[#B0AFFA]">FINAL</span>
          )}
        </div>
      </header>

      {/* Center Screen Content Body */}
      <div className="relative z-20 flex-1 max-w-[430px] mx-auto w-full px-6 py-2 flex flex-col justify-center overflow-y-auto">
        {/* SCREEN 0: WELCOME & PURPOSE */}
        {step === 0 && (
          <section className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Hero Emblem Section with Rotating Curved Text */}
            <div className="relative mx-auto my-2 flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/25 blur-xl" />
              <svg
                className="absolute inset-0 h-full w-full animate-[spin_16s_linear_infinite]"
                viewBox="0 0 100 100"
              >
                <defs>
                  <path
                    id="circlePathOnboard"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                  />
                </defs>
                <text className="text-[7px] font-bold uppercase tracking-[0.24em] fill-[#B0AFFA]/80">
                  <textPath href="#circlePathOnboard" startOffset="0%">
                    SUPER · WAKE · SUPER · WAKE ·
                  </textPath>
                </text>
              </svg>
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <span className="text-[20px] font-bold tracking-tight text-white leading-none">
                  WAKE
                </span>
                <span className="text-[20px] font-bold tracking-tight text-[#B0AFFA] leading-none">
                  UP AI
                </span>
              </div>
            </div>

            {/* Typography */}
            <div className="text-left space-y-1.5">
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
                Wake up. With purpose.
              </h1>
              <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#A796D9] font-normal">
                The only alarm that makes you physically move before starting your day. Wake up into a better state.
              </p>
            </div>

            {/* Futuristic Feature Card */}
            <div className="w-full rounded-[18px] p-4 transition-all duration-200 text-left border border-white/10 bg-[#121020]/90 backdrop-blur-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-white leading-tight flex items-center gap-1.5">
                  <Zap size={16} className="text-[#B0AFFA]" />
                  <span>Movement-Powered Mornings</span>
                </p>
                <p className="text-[12px] text-[#A796D9] mt-1">
                  Activate your body before your mind can make excuses.
                </p>
              </div>
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1C1832] border border-white/15 text-white shadow-md">
                <Check size={16} strokeWidth={2.5} />
              </div>
            </div>

            {/* Glass Pill Highlights */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-[16px] border border-white/[0.08] bg-[#121020]/80 backdrop-blur-[20px] p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B0AFFA]">
                  NO SNOOZING
                </p>
                <p className="text-xs text-white/80 mt-0.5">Physical reps shut off sound</p>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-[#121020]/80 backdrop-blur-[20px] p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B0AFFA]">
                  ON-DEVICE AI
                </p>
                <p className="text-xs text-white/80 mt-0.5">100% private pose tracking</p>
              </div>
            </div>
          </section>
        )}

        {/* SCREEN 1: MOVEMENT REQUIREMENT */}
        {step === 1 && (
          <section className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Text */}
            <div className="text-left space-y-1.5">
              <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
                Don&apos;t just wake up. Move.
              </h2>
              <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#A796D9] font-normal">
                Complete a physical movement challenge before your alarm dismisses. Choose your preferred morning discipline:
              </p>
            </div>

            {/* Exercise Selector Cards */}
            <div className="space-y-2.5 pt-1">
              {/* Push-ups (Free & Default) */}
              <button
                type="button"
                onClick={() => setSelectedExercise("pushups")}
                className={`w-full rounded-[18px] p-4 transition text-left cursor-pointer flex items-center justify-between border relative backdrop-blur-[20px] ${
                  selectedExercise === "pushups"
                    ? "border-white/20 bg-[#1C1832] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                    : "border-white/[0.08] bg-[#121020]/80 hover:bg-[#1C1832]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${selectedExercise === "pushups" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "bg-white/10 text-white"}`}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-white">Push-ups</p>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        FREE
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A796D9] mt-0.5">10 reps · Arm extension verification</p>
                  </div>
                </div>
                <div className={`grid h-6 w-6 place-items-center rounded-full ${selectedExercise === "pushups" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "border border-white/20 text-transparent"}`}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
              </button>

              {/* Squats */}
              <button
                type="button"
                onClick={() => setSelectedExercise("squats")}
                className={`w-full rounded-[18px] p-4 transition text-left cursor-pointer flex items-center justify-between border relative backdrop-blur-[20px] ${
                  selectedExercise === "squats"
                    ? "border-white/20 bg-[#1C1832] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                    : "border-white/[0.08] bg-[#121020]/80 hover:bg-[#1C1832]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${selectedExercise === "squats" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "bg-white/10 text-white"}`}>
                    <Target size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-white">Squats</p>
                      <span className="rounded-full bg-[#1C1832] border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#B0AFFA]">
                        AI+
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A796D9] mt-0.5">15 reps · Knee angle depth tracking</p>
                  </div>
                </div>
                <div className={`grid h-6 w-6 place-items-center rounded-full ${selectedExercise === "squats" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "border border-white/20 text-transparent"}`}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
              </button>

              {/* Plank */}
              <button
                type="button"
                onClick={() => setSelectedExercise("plank")}
                className={`w-full rounded-[18px] p-4 transition text-left cursor-pointer flex items-center justify-between border relative backdrop-blur-[20px] ${
                  selectedExercise === "plank"
                    ? "border-white/20 bg-[#1C1832] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                    : "border-white/[0.08] bg-[#121020]/80 hover:bg-[#1C1832]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${selectedExercise === "plank" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "bg-white/10 text-white"}`}>
                    <Timer size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-white">Plank Hold</p>
                      <span className="rounded-full bg-[#1C1832] border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#B0AFFA]">
                        AI+
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A796D9] mt-0.5">30 sec · Spine alignment detection</p>
                  </div>
                </div>
                <div className={`grid h-6 w-6 place-items-center rounded-full ${selectedExercise === "plank" ? "bg-[#252042] border border-white/20 text-white shadow-md" : "border border-white/20 text-transparent"}`}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
              </button>
            </div>

            {/* Dynamic Status Pill */}
            <div className="flex items-center justify-between px-1 text-[13px] font-medium text-[#C4B5FB] pt-1">
              <span>Ready for tomorrow at 07:00 AM</span>
              <span className="text-[#B0AFFA] font-semibold">100% Verified</span>
            </div>
          </section>
        )}

        {/* SCREEN 2: AI COMPUTER VISION & PRIVACY */}
        {step === 2 && (
          <section className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Text */}
            <div className="text-left space-y-1.5">
              <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
                Your movement. Verified by AI.
              </h2>
              <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#A796D9] font-normal">
                On-device computer vision tracks key skeletal landmarks in real time to ensure every rep is clean and valid.
              </p>
            </div>

            {/* AI Vision Viewport Simulation Card */}
            <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7] animate-ping" />
                  <span className="font-mono text-[11px] font-semibold text-[#B0AFFA] uppercase tracking-wider">
                    VISION ENGINE LIVE
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] text-[#C4B5FB]">
                  30 FPS · 178°
                </span>
              </div>

              {/* Neural Mesh Skeleton Graphic */}
              <div className="relative my-4 flex h-36 items-center justify-center">
                {/* Simulated Joint Nodes */}
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <div className="absolute top-0 h-4 w-4 rounded-full border-2 border-[#A855F7] bg-white/40 shadow-[0_0_10px_#A855F7] animate-pulse" />
                  <div className="absolute top-8 left-2 h-3.5 w-3.5 rounded-full border-2 border-[#8B5CF6] bg-[#A855F7]/60 shadow-[0_0_8px_#8B5CF6]" />
                  <div className="absolute top-8 right-2 h-3.5 w-3.5 rounded-full border-2 border-[#8B5CF6] bg-[#A855F7]/60 shadow-[0_0_8px_#8B5CF6]" />
                  <div className="absolute top-16 left-6 h-3 w-3 rounded-full border-2 border-[#8B5CF6] bg-[#A855F7]/60 shadow-[0_0_6px_#8B5CF6]" />
                  <div className="absolute top-16 right-6 h-3 w-3 rounded-full border-2 border-[#8B5CF6] bg-[#A855F7]/60 shadow-[0_0_6px_#8B5CF6]" />
                  <div className="absolute bottom-0 left-4 h-3.5 w-3.5 rounded-full border-2 border-[#A855F7] bg-[#B0AFFA] shadow-[0_0_8px_#A855F7]" />
                  <div className="absolute bottom-0 right-4 h-3.5 w-3.5 rounded-full border-2 border-[#A855F7] bg-[#B0AFFA] shadow-[0_0_8px_#A855F7]" />

                  {/* SVG Connecting Bones */}
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    <line x1="50" y1="16" x2="20" y2="40" stroke="#A855F7" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="50" y1="16" x2="80" y2="40" stroke="#A855F7" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="20" y1="40" x2="35" y2="65" stroke="#8B5CF6" strokeWidth="2" />
                    <line x1="80" y1="40" x2="65" y2="65" stroke="#8B5CF6" strokeWidth="2" />
                    <line x1="35" y1="65" x2="28" y2="92" stroke="#B0AFFA" strokeWidth="2" />
                    <line x1="65" y1="65" x2="72" y2="92" stroke="#B0AFFA" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Quality Metric Pill */}
              <div className="flex items-center justify-between text-xs text-[#A796D9]">
                <span>Joint Landmark Tracking</span>
                <span className="font-semibold text-emerald-300">99.4% Form Confidence</span>
              </div>
            </div>

            {/* Privacy Card */}
            <div className="w-full rounded-[18px] p-4 transition-all duration-200 text-left border border-white/10 bg-[#121020]/90 backdrop-blur-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1C1832] border border-white/15 text-white shadow-md">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white leading-tight">
                    100% On-Device & Private
                  </p>
                  <p className="text-[11px] text-[#A796D9] mt-0.5">
                    Camera stream never leaves your phone. Zero cloud upload.
                  </p>
                </div>
              </div>
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1C1832] border border-white/15 text-white shadow-sm">
                <Lock size={14} />
              </div>
            </div>
          </section>
        )}

        {/* SCREEN 3: MORNING GOAL & PURPOSE */}
        {step === 3 && (
          <section className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Text */}
            <div className="text-left space-y-1.5">
              <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
                Remember why you got up.
              </h2>
              <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#A796D9] font-normal">
                Set a morning intention. When your alarm rings, your purpose is displayed front and center.
              </p>
            </div>

            {/* Selected Goal Banner */}
            <div className="w-full rounded-[18px] p-4 border border-white/15 bg-[#121020]/90 backdrop-blur-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-[10px] font-semibold tracking-widest text-[#B0AFFA] uppercase">
                  TOMORROW AT 07:00 AM
                </span>
                <span className="text-xs text-[#C4B5FB]">10 Push-ups</span>
              </div>
              <p className="text-[17px] font-semibold text-white mt-1">
                &ldquo;{isCustomActive && customGoal.trim() ? customGoal.trim() : selectedGoal}&rdquo;
              </p>
            </div>

            {/* Quick Option Chips */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-[#A796D9]">Choose or customize your intention:</p>
              <div className="grid grid-cols-1 gap-2">
                {goalOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelectedGoal(opt);
                      setIsCustomActive(false);
                    }}
                    className={`rounded-[14px] px-4 py-3 text-left text-xs font-medium transition cursor-pointer flex items-center justify-between border backdrop-blur-[20px] ${
                      !isCustomActive && selectedGoal === opt
                        ? "border-white/20 bg-[#1C1832] text-white font-semibold shadow-md"
                        : "border-white/[0.08] bg-[#121020]/80 text-[#C4B5FB] hover:bg-[#1C1832]/60"
                    }`}
                  >
                    <span>{opt}</span>
                    {!isCustomActive && selectedGoal === opt && (
                      <Check size={14} className="text-white" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Input Option */}
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Or write a custom morning goal..."
                  value={customGoal}
                  onChange={(e) => {
                    setCustomGoal(e.target.value);
                    setIsCustomActive(true);
                  }}
                  onFocus={() => setIsCustomActive(true)}
                  className={`w-full h-12 rounded-full border bg-[#121020]/90 backdrop-blur-[20px] px-4 text-xs text-white placeholder-[#8775B5] focus:outline-none transition ${
                    isCustomActive ? "border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-white/10"
                  }`}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom Sticky Action Area */}
      <footer className="relative z-20 px-6 pb-6 pt-2 max-w-[430px] mx-auto w-full space-y-3">
        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 pb-1">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === idx
                  ? "w-7 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                  : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={nextStep}
          className="flex h-14 w-full items-center justify-center rounded-full bg-[#1C1832] border border-white/15 text-white font-semibold text-[17px] tracking-tight shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition hover:bg-[#252042] active:scale-[0.98] cursor-pointer"
        >
          {step === 0 && "Get Started →"}
          {step === 1 && "Next: See AI Detection →"}
          {step === 2 && "Next: Set Morning Purpose →"}
          {step === 3 && "Start Waking Up ⚡"}
        </button>

        {/* Bottom Policy Reassurance Note */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#8775B5] pt-1">
          <span>100% On-Device AI</span>
          <span>·</span>
          <span>Camera Privacy First</span>
          <span>·</span>
          <span>Zero Snooze</span>
        </div>
      </footer>
    </main>
  );
}
