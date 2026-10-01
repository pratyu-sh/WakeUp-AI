# WakeUp-AI — Incomplete / Not-Yet-Done

Status snapshot (current) and everything that is still open. This file is the
source of truth for the backlog; tick items off as they land.

**Current green state:** workspace typecheck passes (`pnpm run typecheck`),
34/34 challenge unit tests pass (`pnpm --filter @workspace/mockup-sandbox run test`),
API codegen regenerated (`pnpm --filter @workspace/api-spec run codegen`).
Dev server runs on http://localhost:5173 (PORT=5173, BASE_PATH=/ required).

---

## 1. AI Exercise Detection — shipped but uncalibrated

- [ ] **Real-camera end-to-end verification.** MediaPipe (wasm + pose model) is
  wired in, but no pose frames have ever been captured on this machine: open the
  alarm → "Allow camera" → check the debug overlay (`Settings → On-device AI`
  toggles the debug panel and shows `camera / pose / fps / issue / cheat`).
- [ ] **Calibrate thresholds on real video.** All joint-angle / depth / hip-drop
  thresholds in `src/features/challenge/constants/exerciseDetection.ts` are
  synthetic-first guesses. Needs short recording sessions per exercise.
- [ ] **Burpee accuracy.** The plank phase assumes a side-on body line; front-view
  burpees may undercount. Verify and, if needed, relax `maxBodyDeviationDeg` or
  accept a "no visible plank" fallback.
- [ ] **Plank strictness.** Valid hold time resets to 0 when form breaks
  (`PlankDetector.process`). Confirm that's acceptable product behaviour vs.
  keeping partial credit.
- [ ] **Occlusion / obstruction anti-cheat** (hands over joints, towel in frame)
  — currently only proxied by low landmark confidence; no dedicated detector.
- [ ] **Rep-rate ceiling** — min-dwell + cooldown exist, but there's no explicit
  "reps counted faster than physically possible = cheat" check.
- [ ] **Device positioning help** — statically drawn `BodyGuide`; no live
  "stand so that the circle marks your shoulders" overlay during calibration.
- [ ] **iOS haptics** — `navigator.vibrate` is Android-only; no fallback.
- [ ] **Voice synthesis tuning** — Web Speech queue/priorities exist
  (`ChallengeAudioService`); milestone announcements ("3 more", "halfway") are
  cooldown-based, not milestone-exact.
- [ ] **Session persistence across refresh** — an in-progress challenge is lost
  if the tab reloads; no resume/countdown continuation.

## 2. Alarm engine gaps (core app)

- [ ] **Actual alarm ringing** — no real sound/vibration loop. `sound`,
  `volume`, `vibration`, `gradualVolume` are stored/settings-only; the alarm
  screen is still entered manually from Home.
- [ ] **Scheduled in-app firing** — alarms list is persisted + synced, but there
  is no scheduler (setTimeout/`setAlarm` on mobile) that triggers the ring.
- [ ] **Dismiss-on-challenge semantics** — completing a challenge records the
  workout and dismisses; failures return to the alarm screen (no "try again"
  flow, no snooze).
- [ ] **"only 1st upcoming alarm + dropdown"** on Home is done; the empty-alarm
  and disabled-alarm edge states on the dashboard are not.
- [ ] **Alarm edit** — from Home you can toggle/delete/open; editing an existing
  alarm (re-open NewAlarmFlow prefilled) is not wired.
- [ ] **Stats/History screens are still static mock data** — they don't read the
  `wakeup-ai-workouts` store or the `/stats` API yet.

## 3. Backend / DB / production gaps

- [ ] **API server cannot run locally** — `lib/db` throws at import without
  `DATABASE_URL`. Local Postgres on :5432 rejects the default creds. Chosen fix
  (user-approved): point `DATABASE_URL` at **Supabase**; no code changes needed.
- [ ] **Schema migration** — `FailedResult`/new `failed` workout_result enum
  added to DB schema + OpenAPI + codegen, but **no migration run yet**
  (`pnpm --filter @workspace/db run push` against Supabase).
- [ ] **Auth** — Supabase per-user auth was proposed (auth.user() scoping) and
  offer is unclaimed.
- [ ] **CORS** — the api-server defaults to permissive CORS; needs restricting to
  the app origin before deploy.
- [ ] **Deployment** — no Cloud Run/CI config for the api-server, no `.env`
  handling for DATABASE_URL.
- [ ] **Sync correctness audit** — `syncNow()` best-effort push/pull assumes
  monotonic `updatedAt`; no conflict handling, no retry queue visibility.
- [ ] **Vendored MediaPipe bypasses pnpm** — `pnpm install/add` fails with
  `ERR_PNPM_UNEXPECTED_STORE` (store v10 vs linked v11). The mediapipe package
  is a manual copy in `mockup-sandbox/vendor/mediapipe/` + assets in
  `public/mediapipe/`. A fresh clone **cannot** `pnpm install` cleanly until the
  store mismatch or an alternative (full reinstall, vendored tarball in a
  `pnpm.overrides`, license note) is resolved.

## 4. UI / polish gaps

- [ ] `SuccessScreen` shows static "streak 13 / time 1:18" — should take real
  values (streak from store, measured duration).
- [ ] Challenge exit button labels "Abort" and immediately returns; no confirm,
  no partial-workout record.
- [ ] Debug overlay is desktop-oriented; ensure it stays behind a prod-safe
  toggle (it's currently tied to `settings.onDeviceAI`).
- [ ] Countdown "Get ready" phrase and the 3-2-1 animation are a single overlay;
  no haptic pulse on "GO".
- [ ] `.d.mts` shim + `.mjs` re-export for the vendored bundle is tightly
  relative (`../../../../vendor/...`) and would break if the folder moves.

## 5. Test / verification debt

- [ ] **Hooks/component tests** — no tests for `useChallenge`, `usePoseDetection`,
  `useCameraPermission`, or `ChallengeCamera` (camera APIs need mocking).
- [ ] **E2E / screenshot tests** — none (mockupPreviewPlugin exists for that).
- [ ] **API route tests** — none for `/alarms`, `/workouts`, `/stats` handlers.
- [ ] **Fixture realism** — synthetic poses are hand-built; consider recording
  real landmark frames to a fixtures file for regression tests.

## 6. How to run / verify the new feature

```
# dev (both required env vars)
$env:PORT="5173"; $env:BASE_PATH="/"; pnpm --filter @workspace/mockup-sandbox run dev

# typecheck (whole workspace)
pnpm run typecheck

# challenge unit tests
pnpm --filter @workspace/mockup-sandbox run test
```