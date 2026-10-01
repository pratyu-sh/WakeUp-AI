import { useEffect, useRef, useState } from "react";
import type { ChallengeSnapshot } from "../engine/ChallengeEngine";

export type FeedbackTone = "pass" | "warn" | "info";

export interface ActiveFeedback {
  text: string;
  tone: FeedbackTone;
  priority: number; // 1 = Highest (camera lost), 6 = Lowest (motivation)
  timestamp: number;
}

const MIN_FEEDBACK_DURATION_MS = 1400;

export function useChallengeFeedback(snapshot: ChallengeSnapshot | null) {
  const [activeFeedback, setActiveFeedback] = useState<ActiveFeedback>({
    text: "Get into position",
    tone: "info",
    priority: 6,
    timestamp: Date.now(),
  });

  const activeRef = useRef(activeFeedback);
  activeRef.current = activeFeedback;

  useEffect(() => {
    if (!snapshot) return;

    let candidate: { text: string; tone: FeedbackTone; priority: number } | null = null;

    if (snapshot.status === "paused") {
      candidate = { text: "Challenge paused", tone: "info", priority: 1 };
    } else if (snapshot.cheatReason === "camera_shake") {
      candidate = { text: "Keep phone steady", tone: "warn", priority: 2 };
    } else if (snapshot.cheatReason === "rapid_movement") {
      candidate = { text: "Slow down · full range required", tone: "warn", priority: 3 };
    } else if (snapshot.qualityIssue === "no_person") {
      candidate = { text: "Step back into frame", tone: "warn", priority: 2 };
    } else if (snapshot.qualityIssue === "poor_lighting") {
      candidate = { text: "More light needed on your body", tone: "warn", priority: 3 };
    } else if (snapshot.qualityIssue) {
      const formatted = snapshot.qualityIssue.replace(/_/g, " ");
      candidate = {
        text: formatted.charAt(0).toUpperCase() + formatted.slice(1),
        tone: "warn",
        priority: 4,
      };
    } else if (snapshot.feedback) {
      const isPositive =
        snapshot.feedback.toLowerCase().includes("great") ||
        snapshot.feedback.toLowerCase().includes("good") ||
        snapshot.feedback.toLowerCase().includes("target") ||
        snapshot.feedback.toLowerCase().includes("up") ||
        snapshot.feedback.toLowerCase().includes("complete");
      candidate = {
        text: snapshot.feedback,
        tone: isPositive ? "pass" : "info",
        priority: isPositive ? 5 : 4,
      };
    } else if (snapshot.status === "active") {
      if (snapshot.formQuality !== null && snapshot.formQuality >= 0.75) {
        candidate = { text: "Great form", tone: "pass", priority: 6 };
      } else {
        candidate = { text: "Keep moving", tone: "info", priority: 6 };
      }
    }

    if (!candidate) return;

    const now = Date.now();
    const current = activeRef.current;
    const elapsed = now - current.timestamp;

    const isHigherPriority = candidate.priority < current.priority;
    const isMinDurationSatisfied = elapsed >= MIN_FEEDBACK_DURATION_MS;

    if (isHigherPriority || isMinDurationSatisfied || current.text !== candidate.text) {
      if (isHigherPriority || isMinDurationSatisfied) {
        setActiveFeedback({
          text: candidate.text,
          tone: candidate.tone,
          priority: candidate.priority,
          timestamp: now,
        });
      }
    }
  }, [snapshot]);

  return activeFeedback;
}
