import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePoseQuality } from "../engine/PoseQualityValidator";
import { AntiCheatValidator } from "../engine/AntiCheatValidator";
import { computeFrameMetrics } from "../exercises/poseMetrics";
import { poseAt, emptyPose, PUSHUP } from "./poseFixtures";

test("quality: no person is rejected", () => {
  const r = evaluatePoseQuality(emptyPose(1000), computeFrameMetrics(emptyPose(1000)));
  assert.equal(r.okay, false);
  assert.equal(r.issue, "no_person");
});

test("quality: multiple people are rejected", () => {
  const f = poseAt(1000, PUSHUP.TOP, 2);
  const r = evaluatePoseQuality(f, computeFrameMetrics(f));
  assert.equal(r.okay, false);
  assert.equal(r.issue, "multiple_people");
});

test("quality: subject too far (tiny span) is rejected", () => {
  const tiny = {
    shoulderL: [0.49, 0.49] as [number, number],
    shoulderR: [0.51, 0.49] as [number, number],
    elbowL: [0.49, 0.49] as [number, number],
    elbowR: [0.51, 0.49] as [number, number],
    wristL: [0.49, 0.49] as [number, number],
    wristR: [0.51, 0.49] as [number, number],
    hipL: [0.495, 0.5] as [number, number],
    hipR: [0.505, 0.5] as [number, number],
    kneeL: [0.495, 0.5] as [number, number],
    kneeR: [0.505, 0.5] as [number, number],
    ankleL: [0.5, 0.51] as [number, number],
    ankleR: [0.5, 0.51] as [number, number],
  };
  const f = poseAt(1000, tiny);
  const r = evaluatePoseQuality(f, computeFrameMetrics(f));
  assert.equal(r.okay, false);
  assert.equal(r.issue, "too_far");
});

test("quality: cropped subject (foot at edge) is rejected", () => {
  const f = poseAt(1000, { ...PUSHUP.TOP, ankleR: [0.02, 0.98] });
  const r = evaluatePoseQuality(f, computeFrameMetrics(f));
  assert.equal(r.issue, "body_cropped");
});

test("quality: healthy full pose passes", () => {
  const f = poseAt(1000, PUSHUP.TOP);
  const r = evaluatePoseQuality(f, computeFrameMetrics(f));
  assert.equal(r.okay, true);
  assert.equal(r.issue, null);
});

function shifted(set: typeof PUSHUP.TOP, dx: number): typeof PUSHUP.TOP {
  const mv = (v: readonly [number, number]): [number, number] => [v[0] + dx, v[1]];
  return {
    shoulderL: mv(set.shoulderL),
    shoulderR: mv(set.shoulderR),
    elbowL: mv(set.elbowL),
    elbowR: mv(set.elbowR),
    wristL: mv(set.wristL),
    wristR: mv(set.wristR),
    hipL: mv(set.hipL),
    hipR: mv(set.hipR),
    kneeL: mv(set.kneeL),
    kneeR: mv(set.kneeR),
    ankleL: mv(set.ankleL),
    ankleR: mv(set.ankleR),
  };
}

test("anti-cheat: sustained jitter is flagged as camera shake", () => {
  const v = new AntiCheatValidator({ minShakeFrames: 6 });
  let shake = false;
  for (let i = 0; i < 10; i++) {
    const f = poseAt(1000 + i * 32, shifted(PUSHUP.TOP, i * 0.05));
    if (v.push(f).reason === "camera_shake") shake = true;
  }
  assert.equal(shake, true);
});

test("anti-cheat: a slow, normal movement is allowed", () => {
  const v = new AntiCheatValidator({ minShakeFrames: 6 });
  let shake = false;
  for (let i = 0; i < 12; i++) {
    const f = poseAt(1000 + i * 250, shifted(PUSHUP.TOP, i * 0.004));
    if (v.push(f).reason === "camera_shake") shake = true;
  }
  assert.equal(shake, false);
});

test("anti-cheat: a sudden big jump is a person swap", () => {
  const v = new AntiCheatValidator();
  v.push(poseAt(1000, PUSHUP.TOP));
  const verdict = v.push(poseAt(1032, shifted(PUSHUP.TOP, 0.85)));
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "person_swapped");
});

test("anti-cheat: rejecting superhuman rep rate under 450ms", () => {
  const v = new AntiCheatValidator({ minRepIntervalMs: 450 });
  const t0 = 1000;
  const firstRep = v.validateRepRate(t0);
  assert.equal(firstRep.ok, true);

  const rapidRep = v.validateRepRate(t0 + 200);
  assert.equal(rapidRep.ok, false);
  assert.equal(rapidRep.reason, "rapid_movement");

  const validRep = v.validateRepRate(t0 + 550);
  assert.equal(validRep.ok, true);
});