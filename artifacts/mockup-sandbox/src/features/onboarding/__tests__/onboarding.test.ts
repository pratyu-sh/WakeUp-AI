import test from "node:test";
import assert from "node:assert/strict";
import {
  ONBOARDING_STORAGE_KEY,
  isOnboardingCompleted,
  setOnboardingCompleted,
  resetOnboarding,
} from "../onboardingStorage";

test("onboarding: checks, sets and resets completion in localStorage", () => {
  const storage: Record<string, string> = {};
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
  };

  assert.equal(isOnboardingCompleted(), false);

  setOnboardingCompleted();
  assert.equal(isOnboardingCompleted(), true);
  assert.equal(storage[ONBOARDING_STORAGE_KEY], "true");

  resetOnboarding();
  assert.equal(isOnboardingCompleted(), false);
  assert.equal(storage[ONBOARDING_STORAGE_KEY], undefined);
});
