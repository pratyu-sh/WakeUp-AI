import { useCallback, useMemo, useRef, useState } from "react";
import { ChallengeEngine, type ChallengeConfig, type ChallengeResult, type ChallengeSnapshot } from "../engine/ChallengeEngine";
import type { PoseFrame } from "../pose/poseTypes";

function sameConfig(a: ChallengeConfig, b: ChallengeConfig): boolean {
  return (
    a.exercise === b.exercise &&
    a.difficulty === b.difficulty &&
    a.targetReps === b.targetReps &&
    a.targetDurationMs === b.targetDurationMs
  );
}

export interface UseChallengeResult {
  engine: ChallengeEngine;
  snapshot: ChallengeSnapshot | null;
  /** Feed a raw pose frame into the engine (called from the detection loop). */
  processPose: (frame: PoseFrame) => void;
  controls: {
    start: () => void;
    beginCountdown: () => void;
    pause: () => void;
    resume: () => void;
    abort: () => void;
    forceComplete: () => void;
  };
  reset: () => void;
}

/**
 * Binds a ChallengeEngine to React state. The engine is recreated when its
 * config (exercise / difficulty / target) changes, so switching alarms never
 * leaks a previous challenge's counters.
 */
export function useChallenge(
  config: ChallengeConfig,
  onComplete?: (result: ChallengeResult) => void,
  onSnapshot?: (snapshot: ChallengeSnapshot) => void,
): UseChallengeResult {
  const [snapshot, setSnapshot] = useState<ChallengeSnapshot | null>(null);
  const configRef = useRef(config);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const engineRef = useRef<ChallengeEngine | null>(null);
  if (!engineRef.current || !sameConfig(configRef.current, config)) {
    configRef.current = config;
    engineRef.current = new ChallengeEngine(config, {
      onSnapshot: (s) => {
        setSnapshot(s);
        onSnapshotRef.current?.(s);
      },
      onComplete: (r) => onCompleteRef.current?.(r),
    });
  }

  const processPose = useCallback((frame: PoseFrame) => {
    engineRef.current?.processPose(frame);
  }, []);

  const controls = useMemo(
    () => ({
      start: () => engineRef.current?.start(),
      beginCountdown: () => engineRef.current?.beginCountdown(),
      pause: () => engineRef.current?.pause("user"),
      resume: () => engineRef.current?.resume(),
      abort: () => engineRef.current?.aborted(),
      forceComplete: () => engineRef.current?.forceComplete(),
    }),
    [],
  );

  const reset = useCallback(() => {
    engineRef.current?.start();
  }, []);

  return { engine: engineRef.current as ChallengeEngine, snapshot, processPose, controls, reset };
}