import React, { useEffect, useState } from "react";

export interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 1800 }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, Math.max(300, durationMs - 400));

    const finishTimer = window.setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  const handleTapToSkip = () => {
    setFading(true);
    window.setTimeout(() => {
      onFinish();
    }, 150);
  };

  return (
    <div
      onClick={handleTapToSkip}
      className={`fixed inset-0 z-50 flex h-full w-full cursor-pointer flex-col items-center justify-between px-6 py-12 text-white select-none transition-opacity duration-300 bg-[#07060E] ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient Radial Bloom */}
      <div
        className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-purple-900/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Dynamic Island Badge */}
      <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-[#121020]/90 backdrop-blur-md px-3.5 py-1 border border-white/10 shadow-inner">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7] animate-pulse" />
        <span className="font-mono text-[10px] font-semibold tracking-widest text-[#B0AFFA] uppercase">
          WAKEUP AI
        </span>
      </div>

      {/* Center Branding Hero */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Hero Emblem Section with Rotating Curved Text */}
        <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/25 blur-xl" />
          <svg
            className="absolute inset-0 h-full w-full animate-[spin_16s_linear_infinite]"
            viewBox="0 0 100 100"
          >
            <defs>
              <path
                id="circlePathSplash"
                d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              />
            </defs>
            <text className="text-[7px] font-bold uppercase tracking-[0.24em] fill-[#B0AFFA]/80">
              <textPath href="#circlePathSplash" startOffset="0%">
                SUPER · WAKE · SUPER · WAKE ·
              </textPath>
            </text>
          </svg>
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <span className="text-[22px] font-bold tracking-tight text-white leading-none">
              WAKE
            </span>
            <span className="text-[22px] font-bold tracking-tight text-[#B0AFFA] leading-none">
              UP AI
            </span>
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="font-mono text-3xl font-bold tracking-[0.16em] text-white uppercase">
          WAKEUP <span className="text-[#A855F7]">AI</span>
        </h1>
        <p className="mt-2 text-sm font-medium tracking-wide text-[#A796D9]">
          Don&apos;t just wake up. <span className="text-[#B0AFFA] font-semibold">Wake up into a better state.</span>
        </p>

        {/* Loading Progress Bar */}
        <div className="mt-7 h-1 w-36 overflow-hidden rounded-full bg-white/10 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          <div className="h-full w-full bg-gradient-to-r from-[#6D5BEF] via-[#8B5CF6] to-[#A855F7] animate-[progress_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Bottom Footer Hint */}
      <div className="relative z-10 text-center">
        <p className="text-[11px] font-medium tracking-wider text-[#8775B5] uppercase">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
