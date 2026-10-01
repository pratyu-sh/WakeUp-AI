import { test } from "node:test";
import assert from "node:assert/strict";
import { angleDeg, distance, deviationFromStraight, normalizedVerticalDelta } from "../pose/angleUtils";

test("angleDeg: straight line at the vertex measures 180°", () => {
  const angle = angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 });
  assert.ok(Math.abs(angle - 180) < 1e-6);
});

test("angleDeg: right angle measures 90°", () => {
  const angle = angleDeg({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 });
  assert.ok(Math.abs(angle - 90) < 1e-6);
});

test("angleDeg: folded joint measures near 0°", () => {
  const angle = angleDeg({ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 });
  assert.ok(Math.abs(angle - 180) < 1e-6 && angle <= 180);
});

test("distance: euclidean distance", () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("deviationFromStraight", () => {
  assert.equal(deviationFromStraight(180), 0);
  assert.equal(deviationFromStraight(150), 30);
});

test("normalizedVerticalDelta signs and scaling", () => {
  assert.equal(normalizedVerticalDelta({ x: 0, y: 1 }, { x: 0, y: 0.5 }, 0.5), 1);
  assert.equal(normalizedVerticalDelta({ x: 0, y: 0 }, { x: 0, y: 0.5 }, 0.5), -1);
  assert.equal(normalizedVerticalDelta({ x: 0, y: 0 }, { x: 0, y: 0 }, 0), 0);
});