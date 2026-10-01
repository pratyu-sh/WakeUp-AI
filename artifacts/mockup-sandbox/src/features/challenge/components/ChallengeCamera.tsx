import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  FastForward,
  Flame,
  Info,
  Play,
  Zap,
} from "lucide-react";
import { BodyGuide } from "./BodyGuide";
import { CameraLostOverlay } from "./CameraLostOverlay";
import { ChallengePausedOverlay } from "./ChallengePausedOverlay";
import { ChallengeTopBar } from "./ChallengeTopBar";
import { CoachFeedback } from "./CoachFeedback";
import { CountdownOverlay } from "./CountdownOverlay";
import { DebugOverlay } from "./DebugOverlay";
import { PauseConfirmationModal } from "./PauseConfirmationModal";
import { PlankTimer } from "./PlankTimer";
import { PoseOverlay } from "./PoseOverlay";
import { RepCounter } from "./RepCounter";
import { useCameraPermission } from "../hooks/useCameraPermission";
import { useChallenge } from "../hooks/useChallenge";
import { useChallengeFeedback } from "../hooks/useChallengeFeedback";
import { usePoseDetection } from "../hooks/usePoseDetection";
import { ChallengeAudioService } from "../services/ChallengeAudioService";
import type { AIStatusType } from "./AIStatusPill";
import type { ChallengeResult } from "../engine/ChallengeEngine";
import type { PoseFrame } from "../pose/poseTypes";
import type { Difficulty, Exercise } from "../../../lib/alarm-store";
import { poseAt, PUSHUP, SQUAT, BURPEE, PLANK } from "../__tests__/poseFixtures";

export interface ChallengeCameraProps {
  exercise: Exercise;
  difficulty: Difficulty;
  targetReps?: number;
  targetDurationMs?: number;
  debug?: boolean;
  onComplete: (result: ChallengeResult) => void;
  onExit: () => void;
}

const HELPER_GUIDES: Record<Exercise, string> = {
  pushups: "Place phone low against wall · camera faces you",
  squats: "Prop phone waist high · keep full body visible",
  burpees: "Make sure you have enough space around you",
  plank: "Place phone on floor · side-on to camera",
};

export function ChallengeCamera({
  exercise,
  difficulty,
  targetReps,
  targetDurationMs,
  debug = false,
  onComplete,
  onExit,
}: ChallengeCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<PoseFrame | null>(null);
  const audioRef = useRef<ChallengeAudioService | null>(null);
  if (audioRef.current === null) audioRef.current = new ChallengeAudioService();
  const audio = audioRef.current;

  const [demoMode, setDemoMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const cam = useCameraPermission();

  const config = useMemo(
    () => ({ exercise, difficulty, targetReps, targetDurationMs }),
    [exercise, difficulty, targetReps, targetDurationMs],
  );

  const lastSpokenInt = useRef(0);
  const lastAnnouncedReps = useRef(0);
  const lastAnnouncedHold = useRef(0);

  const challenge = useChallenge(
    config,
    (result) => {
      audio.playVictory();
      onComplete(result);
    },
    (snap) => {
      if (!audio.isVoiceEnabled()) return;

      if (snap.status === "countdown") {
        const i = Math.max(1, Math.ceil(snap.countdownRemainingMs / 1000));
        if (snap.countdownRemainingMs > 0 && i !== lastSpokenInt.current) {
          lastSpokenInt.current = i;
          audio.playTone(520 + i * 40, 100);
          audio.speak(`${i}`, 3, 450);
        }
        return;
      }

      if (snap.status !== "active") return;
      lastSpokenInt.current = 0;

      // Spoken rep announcements
      if (snap.reps > lastAnnouncedReps.current) {
        lastAnnouncedReps.current = snap.reps;
        audio.playTone(800, 160);
        const remaining = snap.targetReps ? snap.targetReps - snap.reps : null;

        if (remaining === 0) {
          audio.speak("Target reached! Challenge complete!", 3, 800);
        } else if (remaining === 1) {
          audio.speak("One more!", 2, 800);
        } else if (remaining === 2) {
          audio.speak("Two more!", 2, 800);
        } else if (remaining === 3) {
          audio.speak("Three more!", 2, 800);
        } else if (snap.targetReps && snap.reps === Math.floor(snap.targetReps / 2)) {
          audio.speak("Halfway there!", 2, 800);
        } else {
          audio.speak(`${snap.reps}`, 2, 600);
        }
      }

      // Plank hold coaching
      if (exercise === "plank" && snap.validHoldMs - lastAnnouncedHold.current >= 5_000) {
        lastAnnouncedHold.current = snap.validHoldMs;
        audio.playTone(650, 140);
        const remHoldSec = snap.targetDurationMs
          ? Math.max(0, Math.round((snap.targetDurationMs - snap.validHoldMs) / 1000))
          : null;

        if (remHoldSec !== null && remHoldSec <= 3 && remHoldSec > 0) {
          audio.speak(`${remHoldSec}!`, 2, 500);
        } else if (remHoldSec !== null && remHoldSec === 5) {
          audio.speak("Five seconds left! Hold strong!", 2, 700);
        } else if (
          snap.targetDurationMs &&
          Math.round(snap.validHoldMs / 1000) === Math.round(snap.targetDurationMs / 2000)
        ) {
          audio.speak("Halfway there! Keep breathing!", 2, 800);
        } else {
          audio.speak(`Keep holding, ${Math.round(snap.validHoldMs / 1000)} seconds`, 1, 900);
        }
      }
    },
  );

  const snap = challenge.snapshot;
  const activeFeedback = useChallengeFeedback(snap);

  const toggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    audio.setVoiceEnabled(nextState);
  };

  // Simulated pose sequence loop when in demo mode and calibrating
  useEffect(() => {
    if (!demoMode) return;
    const interval = window.setInterval(() => {
      if (challenge.snapshot?.status === "calibrating") {
        const now = Date.now();
        const fixture =
          exercise === "pushups"
            ? PUSHUP.TOP
            : exercise === "squats" || exercise === "burpees"
              ? SQUAT.STAND
              : PLANK.HOLD;
        const frame = poseAt(now, fixture);
        frameRef.current = frame;
        challenge.processPose(frame);
      }
    }, 300);
    return () => window.clearInterval(interval);
  }, [demoMode, exercise, challenge]);

  const handleSimulateRep = () => {
    const now = Date.now();
    audio.playTone(550, 90);
    if (exercise === "pushups") {
      challenge.processPose(poseAt(now, PUSHUP.TOP));
      setTimeout(() => challenge.processPose(poseAt(now + 150, PUSHUP.LOWER)), 100);
      setTimeout(() => challenge.processPose(poseAt(now + 300, PUSHUP.BOTTOM)), 200);
      setTimeout(() => {
        challenge.processPose(poseAt(now + 450, PUSHUP.TOP));
        audio.playTone(850, 160);
      }, 300);
    } else if (exercise === "squats") {
      challenge.processPose(poseAt(now, SQUAT.STAND));
      setTimeout(() => challenge.processPose(poseAt(now + 150, SQUAT.LOWER)), 100);
      setTimeout(() => challenge.processPose(poseAt(now + 300, SQUAT.BOTTOM)), 200);
      setTimeout(() => {
        challenge.processPose(poseAt(now + 450, SQUAT.STAND));
        audio.playTone(850, 160);
      }, 300);
    } else if (exercise === "burpees") {
      challenge.processPose(poseAt(now, BURPEE.STAND));
      setTimeout(() => challenge.processPose(poseAt(now + 150, BURPEE.DOWN)), 100);
      setTimeout(() => challenge.processPose(poseAt(now + 300, BURPEE.PLANK)), 200);
      setTimeout(() => challenge.processPose(poseAt(now + 450, BURPEE.RETURN)), 300);
      setTimeout(() => {
        challenge.processPose(poseAt(now + 600, BURPEE.STAND));
        audio.playTone(850, 160);
      }, 400);
    } else if (exercise === "plank") {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          challenge.processPose(poseAt(now + i * 500, PLANK.HOLD));
        }, i * 40);
      }
      audio.playTone(720, 180);
    }
  };

  const handleForceComplete = () => {
    audio.playVictory();
    challenge.controls.forceComplete();
  };

  const pose = usePoseDetection({
    onPose: (frame) => {
      frameRef.current = frame;
      frameCount.current += 1;
      challenge.processPose(frame);
    },
  });

  const frameCount = useRef(0);
  const pumpElapsed = useRef(0);
  const [frameRate, setFrameRate] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      challenge.engine.tick(Date.now());
      const now = Date.now();
      if (now - pumpElapsed.current > 600) {
        setFrameRate((frameCount.current * 1000) / Math.max(1, now - pumpElapsed.current));
        frameCount.current = 0;
        pumpElapsed.current = now;
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cam.state === "granted" && videoRef.current) {
      cam.attach(videoRef.current);
      void pose.start(videoRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.state]);

  useEffect(() => {
    challenge.controls.start();
    const onVis = () => {
      if (document.hidden) {
        challenge.engine.pause("app_background");
        audio.clearQueue();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      pose.stop();
      cam.stop();
      audioRef.current?.clearQueue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCameraReady = cam.state === "granted" || demoMode;

  // Derive active AI Status
  let aiStatus: AIStatusType = "tracking";
  if (snap?.status === "paused") {
    aiStatus = "paused";
  } else if (snap?.qualityIssue === "no_person") {
    aiStatus = "lost";
  } else if (snap?.status === "calibrating") {
    aiStatus = snap.calibrationState === "ready" ? "ready" : "preparing";
  }

  // Derive skeleton tone
  let skeletonTone: "neutral" | "valid" | "warn" | "lost" = "valid";
  if (aiStatus === "lost") {
    skeletonTone = "lost";
  } else if (snap?.qualityIssue || snap?.cheatReason) {
    skeletonTone = "warn";
  } else if (snap?.status === "calibrating") {
    skeletonTone = "neutral";
  }

  return (
    <div className="fixed inset-0 z-50 flex h-dvh w-full flex-col justify-between overflow-hidden bg-black text-white select-none">
      {/* 1. Camera Background Video / Simulation */}
      {isCameraReady ? (
        <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
          {cam.state === "granted" ? (
            <video
              ref={(el) => {
                videoRef.current = el;
              }}
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              playsInline
              muted
              autoPlay
            />
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-900 to-black p-6 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,44,0.18)_0%,transparent_75%)]" />
              {snap?.status !== "active" && (
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#FF6B2C]/20 text-[#FF6B2C] border border-[#FF6B2C]/40">
                    <Flame size={32} />
                  </div>
                  <p className="text-base font-bold text-white">Simulation Mode</p>
                  <p className="max-w-xs text-xs text-neutral-300">
                    Simulating computer vision skeleton detection and {exercise} rep verification.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Pose Skeleton Overlay */}
          <PoseOverlay videoRef={videoRef} frameRef={frameRef} tone={skeletonTone} />
        </div>
      ) : (
        <CalibrationGate
          exercise={exercise}
          cameraState={cam.state}
          cameraError={cam.error}
          onEnable={() => void cam.request()}
          onEnableDemo={() => setDemoMode(true)}
          onMount={(el) => {
            videoRef.current = el;
          }}
        />
      )}

      {/* 3. Subtle Gradient Scrims */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20" />

      {/* 4. Top Bar */}
      {isCameraReady && (
        <div className="relative z-30 flex w-full flex-col items-center">
          <ChallengeTopBar
            exercise={exercise}
            aiStatus={aiStatus}
            voiceEnabled={voiceEnabled}
            onToggleVoice={toggleVoice}
            onRequestClose={() => {
              challenge.engine.pause("user");
              setIsPauseModalOpen(true);
            }}
          />

          {/* Top Helper Guidance Pill (matching reference screenshot) */}
          <div className="mt-1 flex justify-center px-4">
            <div className="rounded-full bg-black/50 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md border border-white/10 shadow-sm drop-shadow">
              {HELPER_GUIDES[exercise]}
            </div>
          </div>
        </div>
      )}

      {/* 5. Center Visual: Massive Rep Counter or Calibrating Body Guide */}
      {isCameraReady && (
        <div className="pointer-events-none relative z-30 flex flex-1 flex-col items-center justify-center px-6">
          {snap?.status === "active" && (
            <div className="pointer-events-auto">
              {exercise === "plank" && snap.targetDurationMs !== null ? (
                <PlankTimer
                  heldMs={snap.validHoldMs}
                  targetMs={snap.targetDurationMs}
                  formValid={snap.qualityIssue === null}
                />
              ) : snap.targetReps !== null ? (
                <RepCounter
                  reps={snap.reps}
                  target={snap.targetReps}
                  exercise={exercise}
                />
              ) : null}
            </div>
          )}

          {snap?.status === "calibrating" && (
            <div className="pointer-events-auto w-full max-w-sm">
              <BodyGuide
                exercise={exercise}
                calibrationState={snap.calibrationState}
                stableFrameCount={snap.stableFrameCount}
                requiredStableFrames={snap.requiredStableFrames}
                feedback={snap.feedback}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Bottom Floating Feedback & Action Area */}
      {isCameraReady && (
        <div className="relative z-30 flex flex-col gap-3.5 px-6 pb-8 pt-2">
          {/* Floating AI Coach Feedback Pill (matching reference screenshot) */}
          {snap?.status === "active" && (
            <CoachFeedback
              message={activeFeedback.text}
              tone={activeFeedback.tone}
            />
          )}

          {/* Calibration Start Button (if user wants to start instantly) */}
          {snap?.status === "calibrating" && (
            <button
              onClick={() => challenge.controls.beginCountdown()}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1C1832] border border-white/20 text-base font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition active:scale-[0.98] hover:bg-[#252042]"
            >
              <Play size={18} fill="currentColor" />
              <span>
                {snap.calibrationState === "ready"
                  ? "Starting automatically…"
                  : "Start Challenge Now"}
              </span>
            </button>
          )}

          {/* Active Bottom Action Buttons */}
          {snap?.status === "active" && (
            <div className="flex items-center gap-3">
              {/* Dev-only simulate + force-complete buttons — hidden in production */}
              {debug && (
                <>
                  <button
                    onClick={handleSimulateRep}
                    aria-label="Simulate rep for testing"
                    className="flex h-14 items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-4 text-xs font-semibold text-white backdrop-blur-md border border-white/10 active:scale-95 transition"
                  >
                    <Zap size={16} className="text-amber-400" />
                    <span>+1 Rep</span>
                  </button>
                  <button
                    onClick={handleForceComplete}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 text-sm font-bold text-white/80 border border-white/15 transition active:scale-[0.98]"
                  >
                    <FastForward size={18} />
                    <span>Skip (debug)</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. State Overlays */}
      {/* 3-2-1-GO Countdown */}
      {snap?.status === "countdown" && (
        <CountdownOverlay
          msRemaining={snap.countdownRemainingMs}
          exercise={exercise}
        />
      )}

      {/* Camera Lost Scrim (person stepped out of view) */}
      {snap?.status === "paused" && snap.qualityIssue === "no_person" && (
        <CameraLostOverlay />
      )}

      {/* Paused by user */}
      {snap?.status === "paused" && !isPauseModalOpen && snap.qualityIssue !== "no_person" && (
        <ChallengePausedOverlay onResume={() => challenge.controls.resume()} />
      )}

      {/* Pause & Exit Confirmation Dialog */}
      <PauseConfirmationModal
        isOpen={isPauseModalOpen}
        onResume={() => {
          setIsPauseModalOpen(false);
          challenge.controls.resume();
        }}
        onConfirmExit={() => {
          setIsPauseModalOpen(false);
          audio.clearQueue();
          onExit();
        }}
      />

      {/* Dev telemetry (collapsible, neatly tucked away) */}
      {debug && (
        <DebugOverlay
          snapshot={snap}
          detection={pose.status}
          cameraState={cam.state}
          frameRate={frameRate}
        />
      )}
    </div>
  );
}

function CalibrationGate({
  exercise,
  cameraState,
  cameraError,
  onEnable,
  onEnableDemo,
  onMount,
}: {
  exercise: Exercise;
  cameraState: ReturnType<typeof useCameraPermission>["state"];
  cameraError: string | null;
  onEnable: () => void;
  onEnableDemo: () => void;
  onMount: (el: HTMLVideoElement | null) => void;
}) {
  return (
    <div className="my-auto flex flex-col items-center text-center px-6">
      <video ref={onMount} className="hidden" playsInline muted autoPlay />

      <div className="mb-6 grid h-24 w-24 place-items-center rounded-full bg-[#8B5CF6]/15 text-[#B0AFFA] border border-[#8B5CF6]/35 shadow-[0_0_30px_rgba(139,92,246,0.35)]">
        <Camera size={44} />
      </div>

      <h2 className="text-2xl font-semibold tracking-tight text-white">Enable Camera</h2>
      <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-[#A796D9]">
        WakeUp-AI verifies your{" "}
        <span className="font-semibold text-[#B0AFFA] capitalize">{exercise}</span> reps with
        on-device AI computer vision. No video is ever stored or sent to any server.
      </p>

      {cameraError && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-2.5 text-xs text-rose-300 border border-rose-500/30">
          <Info size={16} />
          <span>{cameraError}</span>
        </div>
      )}

      <div className="mt-8 flex w-full flex-col gap-3 max-w-sm">
        <button
          onClick={onEnable}
          disabled={cameraState === "requested"}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1C1832] border border-white/20 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-70 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:bg-[#252042]"
        >
          <Camera size={19} />
          <span>{cameraState === "requested" ? "Requesting Camera…" : "Allow Camera"}</span>
        </button>

        <button
          onClick={onEnableDemo}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white/[0.05] text-sm font-semibold text-white/80 backdrop-blur transition active:scale-[0.98] hover:bg-white/10 border border-white/10"
        >
          <Zap size={16} className="text-white" />
          <span>Test in Simulation Mode</span>
        </button>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <BodyGuide exercise={exercise} />
      </div>
    </div>
  );
}