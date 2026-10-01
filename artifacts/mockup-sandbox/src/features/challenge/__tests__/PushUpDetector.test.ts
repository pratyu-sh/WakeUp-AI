import { test } from "node:test";
import assert from "node:assert/strict";
import { PushUpDetector } from "../exercises/PushUpDetector";
import { poseAt, PUSHUP } from "./poseFixtures";

const detector = () => new PushUpDetector({ minStateDurationMs: 80, repCooldownMs: 50 });

test("pushups: one clean rep counts", () => {
  const d = detector();
  const feed = [
    poseAt(2000, PUSHUP.TOP),
    poseAt(2100, PUSHUP.LOWER),
    poseAt(2200, PUSHUP.LOWER),
    poseAt(2300, PUSHUP.BOTTOM),
    poseAt(2400, PUSHUP.BOTTOM),
    poseAt(2600, PUSHUP.TOP),
    poseAt(2700, PUSHUP.TOP),
  ];
  let completed = 0;
  for (const f of feed) {
    const r = d.process(f);
    if (r.repCompleted) completed += 1;
  }
  assert.equal(completed, 1);
  assert.equal(d.getReps(), 1);
  assert.equal(d.getState(), "top");
});

test("pushups: needs BOTH arms to extend before counting", () => {
  const d = detector();
  const oneArmLocked: typeof PUSHUP.TOP = { ...PUSHUP.TOP, elbowR: [0.6, 0.88] };
  const feed = [
    poseAt(2000, PUSHUP.TOP),
    poseAt(2100, PUSHUP.LOWER),
    poseAt(2300, PUSHUP.BOTTOM),
    poseAt(2600, oneArmLocked),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 0, "one-sided lock must not be a completed rep");
});

test("pushups: shallow bounce does NOT count", () => {
  const d = detector();
  const feed = [
    poseAt(2000, PUSHUP.TOP),
    // elbow bends a little but shoulders never sink
    poseAt(2100, { ...PUSHUP.LOWER, shoulderL: [0.44, 0.64], shoulderR: [0.56, 0.64] }),
    poseAt(2200, { ...PUSHUP.LOWER, shoulderL: [0.44, 0.64], shoulderR: [0.56, 0.64] }),
    poseAt(2600, PUSHUP.TOP),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 0, "no sink = no burst depth = no rep");
});

test("pushups: missing frame halves stop the counter", () => {
  const d = detector();
  const incomplete = poseAt(2000, PUSHUP.TOP);
  const missing = { ...incomplete, leftElbow: undefined } as typeof incomplete;
  const r = d.process(missing);
  assert.equal(r.feedback, "Stand back so your whole body fits the frame");
  assert.equal(d.getReps(), 0);
});