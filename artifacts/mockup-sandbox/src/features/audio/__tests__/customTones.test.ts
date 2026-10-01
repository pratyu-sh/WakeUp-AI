import test from "node:test";
import assert from "node:assert/strict";
import {
  saveCustomTone,
  getStoredCustomTones,
  deleteCustomTone,
  findCustomToneByName,
} from "../customTones";

test("customTones: saves and retrieves a custom tone", () => {
  // Ensure clear mock window localStorage
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

  const tone = saveCustomTone("Favorite_Alarm.mp3", "data:audio/mp3;base64,AAA", 1024);
  assert.equal(tone.name, "Favorite_Alarm");

  const stored = getStoredCustomTones();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, "Favorite_Alarm");

  const found = findCustomToneByName("favorite_alarm");
  assert.ok(found);
  assert.equal(found?.id, tone.id);

  const remaining = deleteCustomTone(tone.id);
  assert.equal(remaining.length, 0);
  assert.equal(getStoredCustomTones().length, 0);
});
