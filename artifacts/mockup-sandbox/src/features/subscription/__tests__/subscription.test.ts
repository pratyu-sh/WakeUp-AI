import { test } from "node:test";
import assert from "node:assert/strict";
import { revenueCat } from "../revenueCat";
import { subscriptionService } from "../subscriptionService";
import { entitlementService } from "../entitlementService";
import { DEFAULT_ANNUAL_PACKAGE, DEFAULT_MONTHLY_PACKAGE, PRIMARY_ENTITLEMENT } from "../subscriptionConstants";

test("subscription: free user has basic access and limits", () => {
  revenueCat.resetToFree();
  assert.equal(subscriptionService.hasEntitlement(PRIMARY_ENTITLEMENT), false);
  assert.equal(subscriptionService.canUse("unlimited_alarms"), false);
  assert.equal(subscriptionService.canUse("advanced_exercises"), false);
  assert.equal(subscriptionService.canUse("adaptive_ai"), false);

  // Exercise gating: pushups is always free, others are locked
  assert.equal(subscriptionService.isExerciseLocked("pushups"), false);
  assert.equal(subscriptionService.isExerciseLocked("squats"), true);
  assert.equal(subscriptionService.isExerciseLocked("burpees"), true);
  assert.equal(subscriptionService.isExerciseLocked("plank"), true);

  // Entitlement resolver directly
  assert.equal(entitlementService.isExerciseUnlocked("pushups"), true);
  assert.equal(entitlementService.isExerciseUnlocked("squats"), false);

  // Active alarm limit (Section 15 & 18: Maximum 2 active alarms for free plan)
  assert.equal(subscriptionService.isAlarmLimitReached(0), false);
  assert.equal(subscriptionService.isAlarmLimitReached(1), false);
  assert.equal(subscriptionService.isAlarmLimitReached(2), true);
  assert.equal(subscriptionService.isAlarmLimitReached(3), true);
});

test("subscription: purchasing package activates AI+ entitlement and unlocks all features", async () => {
  revenueCat.resetToFree();
  const res = await revenueCat.purchasePackage(DEFAULT_MONTHLY_PACKAGE);
  assert.equal(res.productIdentifier, DEFAULT_MONTHLY_PACKAGE.identifier);

  const snapshot = subscriptionService.getSnapshot();
  assert.equal(snapshot.isPlus, true);
  assert.ok(snapshot.status === "ACTIVE" || snapshot.status === "TRIAL");
  assert.equal(subscriptionService.hasEntitlement(PRIMARY_ENTITLEMENT), true);

  // All features unlocked
  assert.equal(subscriptionService.canUse("unlimited_alarms"), true);
  assert.equal(subscriptionService.canUse("advanced_exercises"), true);
  assert.equal(subscriptionService.canUse("adaptive_ai"), true);
  assert.equal(subscriptionService.canUse("advanced_statistics"), true);

  // All exercises unlocked
  assert.equal(subscriptionService.isExerciseLocked("pushups"), false);
  assert.equal(subscriptionService.isExerciseLocked("squats"), false);
  assert.equal(subscriptionService.isExerciseLocked("burpees"), false);
  assert.equal(subscriptionService.isExerciseLocked("plank"), false);

  // Alarms unlimited
  assert.equal(subscriptionService.isAlarmLimitReached(5), false);
});

test("subscription: restore purchases recovers past subscriptions", async () => {
  revenueCat.resetToFree();
  // Purchase first
  await revenueCat.purchasePackage(DEFAULT_ANNUAL_PACKAGE);
  assert.equal(subscriptionService.hasEntitlement(), true);

  // Simulate logging in fresh / restoring
  const restored = await revenueCat.restorePurchases();
  assert.ok(restored.entitlements.active[PRIMARY_ENTITLEMENT]?.isActive);

  // Clean up after test
  revenueCat.resetToFree();
});
