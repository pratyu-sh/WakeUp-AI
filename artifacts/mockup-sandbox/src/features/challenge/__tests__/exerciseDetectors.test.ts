import { test } from "node:test";
import assert from "node:assert/strict";
import { SquatDetector } from "../exercises/SquatDetector";
import { BurpeeDetector } from "../exercises/BurpeeDetector";
import { PlankDetector } from "../exercises/PlankDetector";
import { poseAt, SQUAT, BURPEE, PLANK } from "./poseFixtures";

test("squats: deep, both-knee squat counts", () => {
  const d = new SquatDetector({ minStateDurationMs: 80, repCooldownMs: 50 });
  const feed = [
    poseAt(2000, SQUAT.STAND),
    poseAt(2100, SQUAT.LOWER),
    poseAt(2200, SQUAT.LOWER),
    poseAt(2300, SQUAT.BOTTOM),
    poseAt(2400, SQUAT.BOTTOM),
    poseAt(2500, SQUAT.LOWER),
    poseAt(2600, SQUAT.STAND),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 1);
  assert.equal(d.getReps(), 1);
});

test("squats: half squat (knees ~120°) does not count", () => {
  const d = new SquatDetector({ minStateDurationMs: 80, repCooldownMs: 50 });
  const half = { ...SQUAT.LOWER, hipL: [0.4, 0.6] as [number, number], hipR: [0.56, 0.6] as [number, number] };
  const feed = [
    poseAt(2000, SQUAT.STAND),
    poseAt(2100, SQUAT.LOWER),
    poseAt(2100 + 1, half),
    poseAt(2300, SQUAT.LOWER),
    poseAt(2400, SQUAT.STAND),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 0, "knees not below ~100° means no squat depth");
});

test("burpees: full cycle counts exactly once", () => {
  const d = new BurpeeDetector({ minStateDurationMs: 80, repCooldownMs: 50 });
  const feed = [
    poseAt(2000, BURPEE.STAND),
    poseAt(2100, BURPEE.DOWN),
    poseAt(2200, BURPEE.DOWN),
    poseAt(2300, BURPEE.PLANK),
    poseAt(2400, BURPEE.PLANK),
    poseAt(2500, BURPEE.RETURN),
    poseAt(2600, BURPEE.RETURN),
    poseAt(2700, BURPEE.STAND),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 1);
  assert.equal(d.getReps(), 1);
});

test("burpees: skipping the plank phase prevents counting", () => {
  const d = new BurpeeDetector({ minStateDurationMs: 80, repCooldownMs: 50 });
  const feed = [
    poseAt(2000, BURPEE.STAND),
    poseAt(2100, BURPEE.DOWN),
    poseAt(2300, BURPEE.RETURN),
    poseAt(2500, BURPEE.STAND),
  ];
  let completed = 0;
  for (const f of feed) {
    if (d.process(f).repCompleted) completed += 1;
  }
  assert.equal(completed, 0, "DOWN→RETURN without PLANK must not count");
});

test("plank: valid hold time accumulates only while form is straight", () => {
  const d = new PlankDetector({ minStateDurationMs: 80, repCooldownMs: 0 });
  const snapshot: number[] = [];
  for (let t = 2000; t <= 2900; t += 100) {
    d.process(poseAt(t, PLANK.HOLD));
    if (t >= 2300) snapshot.push(d.getElapsedValidHoldMs());
  }
  assert.ok(snapshot[0] > 0, "hold time accrues while straight");
  assert.ok(snapshot[snapshot.length - 1] > snapshot[0], "hold time keeps growing");

  d.process(poseAt(3000, PLANK.SAG));
  const afterSag = d.getElapsedValidHoldMs();
  d.process(poseAt(3100, PLANK.SAG));
  assert.equal(afterSag, 0, "sagging zeroes the valid hold timer");
  assert.equal(d.getState(), "invalid");
});