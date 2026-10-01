# ⏰ WakeUp-AI — Development & Feature Status

**WakeUp-AI** is a mobile-first, AI-powered movement alarm web application designed to eliminate morning snoozing. To dismiss an active alarm, users must complete physical movement challenges (e.g., push-ups, squats, burpees, planks) verified via simulated on-device computer vision.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript 5.9, Tailwind CSS, Lucide React Icons.
- **Monorepo Layout**: Managed via `pnpm` workspaces:
  - `@workspace/mockup-sandbox`: Mobile application UI & interactive preview environment.
  - `@workspace/api-server`: Express 5 backend server (bundled via `esbuild`).
  - `@workspace/db`: PostgreSQL database integration with Drizzle ORM.
  - `@workspace/api-spec` & `@workspace/api-zod`: OpenAPI specifications & Orval client/Zod schema generation.
- **Audio Synthesis**: Native Web Audio API sound generator for alarm previews without external assets.
- **Validation & Persistence**: Zod schema validation (`alarmDraftSchema`) with local storage state management.

---

## ✨ Implemented Features

### 1. 🧙 3-Step Alarm Setup Wizard (`NewAlarmFlow`)
- **Step 1 — WHEN (Time & Schedule)**:
  - 12-hour formatted time picker with dynamic AM/PM display.
  - Live relative countdown calculator (`getNextOccurrence`) showing exact hours and minutes remaining.
  - Recurrence preset selectors: *Every day*, *Weekdays*, *Weekends*, and *Custom* day toggles (`M T W T F S S`).
- **Step 2 — WAKE (Physical Challenge Configuration)**:
  - Movement selection grid: **Push-ups**, **Squats**, **Burpees**, and **Plank**.
  - Repetition counter & duration controls (+ / - buttons with range limits).
  - Difficulty selection (*Easy*, *Medium*, *Hard*) with form compliance guidelines.
- **Step 3 — ALARM (Audio & Alert Settings)**:
  - Alarm tone selector (*Wake Up*, *Morning Rise*, *Energy*) featuring real-time Web Audio API sound previews.
  - Volume control slider (0% to 100%).
  - Toggles for vibration and gradual volume escalation.
  - Full Zod schema validation and instant save to local storage.

### 2. 🔔 Active Alarm Ringing Interface (`AlarmScreen`)
- High-contrast night-mode ringing screen.
- Real-time clock display, morning greeting, and audio status indicator.
- Required challenge display (e.g., *10 push-ups*).
- Direct call-to-action button to initiate the camera challenge.

### 3. 📷 AI Pose & Motion Detection (`CameraScreen`)
- Viewport simulating real-time computer vision body frame detection.
- Remaining rep counter with an animated progress bar.
- On-screen positioning tip overlay (*"Keep your full body inside the frame"*).
- Interactive rep simulator with automatic completion trigger.

### 4. 🎉 Celebration & Completion (`SuccessScreen`)
- Completion checkmark animation.
- Workout summary metrics: **Updated Streak** (13 days), **Time** (1:18), and **Reps** (10).
- Motivational summary and returning navigation home.

### 5. 📊 Dashboard & Tracking (`HomeScreen`, `StatsScreen`, `HistoryScreen`)
- **Home Screen**:
  - Active alarm shortcut card.
  - Streak pill (12 days) and total push-ups counter (860).
  - **Weekly Movement Score**: Radial progress ring (82%) with 7-day activity bar chart.
  - **Recent Challenges**: List of completed workouts with status indicators.
- **Stats Screen**: Overview metrics (94% completion rate, 18-day best streak, 1:22 average time).
- **History Screen**: 28-day consistency grid visualization and history log.
- **Settings Screen**: Configuration for notifications, volume escalation, default workout types, and on-device AI privacy.

---

## 📂 Key Source Files

- `artifacts/mockup-sandbox/src/components/mockups/WakeUpAI.tsx`: Core mobile app component containing all 8 screen flows.
- `artifacts/mockup-sandbox/src/App.tsx`: Sandbox preview entry point.
- `artifacts/api-server/src/app.ts`: Express 5 API server setup.
- `lib/db/src/schema/`: Drizzle ORM database schemas.
