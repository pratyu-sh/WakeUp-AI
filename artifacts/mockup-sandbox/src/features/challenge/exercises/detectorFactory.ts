import type { Difficulty, Exercise } from "../../../lib/alarm-store";
import type { ExerciseDetector } from "./base";
import { PushUpDetector } from "./PushUpDetector";
import { SquatDetector } from "./SquatDetector";
import { BurpeeDetector } from "./BurpeeDetector";
import { PlankDetector } from "./PlankDetector";

export interface DetectionDifficultyOptions {
  minStateDurationMs: number;
  repCooldownMs: number;
}

const DIFFICULTY_OPTIONS: Record<Difficulty, DetectionDifficultyOptions> = {
  easy: { minStateDurationMs: 220, repCooldownMs: 300 },
  medium: { minStateDurationMs: 260, repCooldownMs: 350 },
  hard: { minStateDurationMs: 300, repCooldownMs: 420 },
};

export function createExerciseDetector(exercise: Exercise, difficulty: Difficulty = "medium"): ExerciseDetector {
  const opts = DIFFICULTY_OPTIONS[difficulty];
  switch (exercise) {
    case "pushups":
      return new PushUpDetector(opts);
    case "squats":
      return new SquatDetector(opts);
    case "burpees":
      return new BurpeeDetector(opts);
    case "plank":
      return new PlankDetector(opts);
  }
}