import { test } from "node:test";
import assert from "node:assert/strict";
import { PoseFrameSmoother } from "../pose/smoothing";
import { poseAt, PUSHUP } from "./poseFixtures";

test("smoother returns a value after the first push", () => {
  const s = new PoseFrameSmoother();
  const out = s.push(poseAt(1000, PUSHUP.TOP));
  assert.ok(out.leftShoulder);
  assert.equal(s.lastUpdate(), 1000);
});

test("smoother blends landmarks toward the latest frame", () => {
  const s = new PoseFrameSmoother({ alpha: 0.5, timeoutMs: 300 });
  s.push(poseAt(1000, PUSHUP.TOP));
  s.push(poseAt(1100, PUSHUP.BOTTOM));
  const out = s.get();
  assert.ok(out?.leftShoulder);
  assert.ok(Math.abs(out.leftShoulder.y - (0.62 + 0.8) / 2) < 1e-9);
});

test("smoother keeps a stale landmark alive within the timeout", () => {
  const s = new PoseFrameSmoother({ alpha: 0.5, timeoutMs: 300 });
  s.push(poseAt(1000, PUSHUP.TOP));
  let out = s.get();
  assert.ok(out?.leftShoulder);
  out = s.get();
  assert.ok(out?.leftShoulder, "landmark stays while under timeout");
});

test("smoother reports staleness", () => {
  const s = new PoseFrameSmoother({ timeoutMs: 200 });
  s.push(poseAt(1000, PUSHUP.TOP));
  assert.equal(s.isStale(1100), false);
  s.push(poseAt(1500, PUSHUP.BOTTOM));
  assert.equal(s.isStale(2000), true);
});

test("reset clears everything", () => {
  const s = new PoseFrameSmoother();
  s.push(poseAt(1000, PUSHUP.TOP));
  s.reset();
  assert.equal(s.get(), null);
  assert.equal(s.isStale(2000), true);
});