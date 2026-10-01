import { test } from "node:test";
import assert from "node:assert/strict";
import { ChallengeEngine, type ChallengeResult, type ChallengeSnapshot } from "../engine/ChallengeEngine";
import { emptyPose, poseAt, PUSHUP, type FixtureSet } from "./poseFixtures";

function mkEngine(opts: Partial<ConstructorParameters<typeof ChallengeEngine>[0]> = {}) {
  const completed: ChallengeResult[] = [];
  const snapshots: ChallengeSnapshot[] = [];
  const engine = new ChallengeEngine(
    { exercise: "pushups", difficulty: "easy", targetReps: 1, countdownMs: 100, smoothingAlpha: 1, ...opts },
    { onComplete: (r) => completed.push(r), onSnapshot: (s) => snapshots.push(s) },
  );
  return { engine, completed, snapshots };
}

test("engine: pushes rep machine and completes when target is met", () => {
  const { engine, completed } = mkEngine();
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  let t = 500;
  const feed = (set: typeof PUSHUP.TOP, n: number) => {
    for (let i = 0; i < n; i++) {
      engine.processPose(poseAt(t0 + t, set));
      t += 300;
    }
  };
  feed(PUSHUP.TOP, 4); // warm in standing top
  feed(PUSHUP.LOWER, 1);
  feed(PUSHUP.BOTTOM, 2);
  feed(PUSHUP.TOP, 2); // raising -> count

  assert.equal(engine.getStatus(), "completed");
  assert.equal(completed.length, 1);
  assert.equal(completed[0].repsCompleted, 1);
  assert.equal(completed[0].workoutResult, "completed");
});

test("engine: fails on timeout if target never reached", () => {
  const { engine, completed } = mkEngine({ targetReps: 5, timeoutMs: 3000, countdownMs: 50 });
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  for (let i = 0; i < 16; i++) {
    engine.processPose(poseAt(t0 + 500 + i * 500, PUSHUP.TOP));
  }
  assert.equal(engine.getStatus(), "failed");
  assert.equal(completed[0]?.workoutResult, "skipped");
  assert.equal(completed[0]?.reason, "timeout");
});

test("engine: auto-pauses when the person leaves the frame", () => {
  const { engine, snapshots } = mkEngine({ timeoutMs: 60000 });
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  for (let i = 0; i < 8; i++) {
    engine.processPose(emptyPose(t0 + 500 + i * 40));
  }
  assert.equal(engine.getStatus(), "paused");
  assert.ok(snapshots.some((s) => s.qualityIssue === "no_person"), "no_person surfaced during the streak");
});

test("engine: prolonged pause fails the challenge", () => {
  const { engine, completed } = mkEngine({ timeoutMs: 60000 });
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  for (let i = 0; i < 8; i++) {
    engine.processPose(emptyPose(t0 + 500 + i * 40));
  }
  assert.equal(engine.getStatus(), "paused");
  engine.tick(t0 + 4000 + 61_000);
  assert.equal(engine.getStatus(), "failed");
  assert.equal(completed[0]?.reason, "person_left");
});

test("engine: aborted challenge records skipped", () => {
  const { engine, completed } = mkEngine();
  engine.start();
  engine.beginCountdown();
  engine.aborted();
  assert.equal(engine.getStatus(), "failed");
  assert.equal(completed[0]?.reason, "aborted");
});

test("engine: plank challenge completes after the target hold", () => {
  const { engine, completed } = mkEngine({
    exercise: "plank",
    targetDurationMs: 1000,
    countdownMs: 50,
    timeoutMs: 30000,
  });
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  const hold: FixtureSet = {
    shoulderL: [0.3, 0.42],
    shoulderR: [0.46, 0.42],
    elbowL: [0.31, 0.5],
    elbowR: [0.47, 0.5],
    wristL: [0.32, 0.58],
    wristR: [0.48, 0.58],
    hipL: [0.6, 0.42],
    hipR: [0.74, 0.42],
    kneeL: [0.86, 0.42],
    kneeR: [0.92, 0.42],
    ankleL: [0.92, 0.42],
    ankleR: [0.94, 0.42],
  };
  for (let i = 0; i < 14; i++) {
    engine.processPose(poseAt(t0 + 500 + i * 120, hold));
  }
  assert.equal(engine.getStatus(), "completed");
  assert.equal(completed[0]?.reason, "target_met");
});

test("engine: auto-calibrates and starts countdown when person remains stable for 6 frames", () => {
  const { engine } = mkEngine({ countdownMs: 2000 });
  engine.start();
  assert.equal(engine.getStatus(), "calibrating");

  const t0 = Date.now();
  for (let i = 0; i < 5; i++) {
    const snap = engine.processPose(poseAt(t0 + i * 50, PUSHUP.TOP));
    assert.equal(snap.calibrationState, "detected");
    assert.equal(engine.getStatus(), "calibrating");
  }

  // 6th stable frame triggers auto-countdown
  engine.processPose(poseAt(t0 + 250, PUSHUP.TOP));
  assert.equal(engine.getStatus(), "countdown");
});

test("engine: auto-resumes after pause when user returns and holds steady for 3 frames", () => {
  const { engine } = mkEngine({ countdownMs: 2000 });
  engine.start();
  engine.beginCountdown();
  const t0 = Date.now();
  engine.processPose(poseAt(t0 + 2500, PUSHUP.TOP));
  assert.equal(engine.getStatus(), "active");

  engine.pause("person_left");
  assert.equal(engine.getStatus(), "paused");

  // User returns
  engine.processPose(poseAt(t0 + 3000, PUSHUP.TOP));
  engine.processPose(poseAt(t0 + 3100, PUSHUP.TOP));
  assert.equal(engine.getStatus(), "paused");

  engine.processPose(poseAt(t0 + 3200, PUSHUP.TOP));
  assert.equal(engine.getStatus(), "countdown");
});