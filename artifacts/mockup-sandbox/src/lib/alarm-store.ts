export type RepeatType = "once" | "daily" | "weekdays" | "weekends" | "custom";
export type Exercise = "pushups" | "squats" | "burpees" | "plank";
export type Difficulty = "easy" | "medium" | "hard";
export type WorkoutResult = "completed" | "restarted" | "skipped" | "failed";

export interface AppSettings {
  notificationsEnabled: boolean;
  volumeEscalation: "gradual" | "instant";
  defaultExercise: Exercise;
  defaultDifficulty: Difficulty;
  defaultRepetitions: number;
  defaultDuration: number;
  onDeviceAI: boolean;
}

export interface AlarmDraft {
  time: string;
  repeatDays: number[];
  repeatType: RepeatType;
  exercise: Exercise;
  repetitions: number;
  duration: number;
  difficulty: Difficulty;
  sound: string;
  volume: number;
  vibration: boolean;
  gradualVolume: boolean;
}

export interface SavedAlarm extends AlarmDraft {
  id: string;
  enabled: boolean;
}

export interface LocalWorkout {
  id: string;
  alarmId?: string;
  exercise: Exercise;
  repetitions?: number;
  duration?: number;
  difficulty: Difficulty;
  repsCompleted: number;
  completed: boolean;
  result: WorkoutResult;
  startedAt: string;
  completedAt: string;
  serverId?: string;
}

interface AlarmMap {
  [localId: string]: string | undefined;
}

interface DirtyState {
  alarms: string[];
  deletedServerIds: string[];
  workouts: string[];
}

interface SyncMeta {
  lastSyncAt: number;
  lastFailureAt: number;
}

const ALARMS_KEY = "wakeup-ai-alarms";
const ACTIVE_KEY = "wakeup-ai-active-alarm";
const WORKOUTS_KEY = "wakeup-ai-workouts";
const MAP_KEY = "wakeup-ai-alarm-map";
const DIRTY_KEY = "wakeup-ai-dirty";
const META_KEY = "wakeup-ai-sync-meta";
const SETTINGS_KEY = "wakeup-ai-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  volumeEscalation: "gradual",
  defaultExercise: "pushups",
  defaultDifficulty: "medium",
  defaultRepetitions: 10,
  defaultDuration: 30,
  onDeviceAI: true,
};

export function loadSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}),
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

const DEFAULT_ALARMS: SavedAlarm[] = [
  {
    id: "alarm-1",
    enabled: true,
    time: "07:00",
    repeatDays: [1, 2, 3, 4, 5],
    repeatType: "weekdays",
    exercise: "pushups",
    repetitions: 10,
    duration: 30,
    difficulty: "medium",
    sound: "Wake Up",
    volume: 70,
    vibration: true,
    gradualVolume: true,
  },
  {
    id: "alarm-2",
    enabled: true,
    time: "07:45",
    repeatDays: [1, 2, 3, 4, 5],
    repeatType: "weekdays",
    exercise: "pushups",
    repetitions: 10,
    duration: 30,
    difficulty: "easy",
    sound: "Morning Rise",
    volume: 75,
    vibration: true,
    gradualVolume: true,
  },
  {
    id: "alarm-3",
    enabled: false,
    time: "08:30",
    repeatDays: [0, 6],
    repeatType: "weekends",
    exercise: "pushups",
    repetitions: 10,
    duration: 30,
    difficulty: "medium",
    sound: "Energy",
    volume: 80,
    vibration: true,
    gradualVolume: false,
  },
];

const API_BASE = (
  typeof import.meta.env !== "undefined" && import.meta.env.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE)
    : "http://localhost:5000"
).replace(/\/+$/, "");

const FAILURE_COOLDOWN_MS = 20_000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full — ignore, local-first app keeps working in memory.
  }
}

export function loadSavedAlarms(): SavedAlarm[] {
  const stored = readJson<SavedAlarm[] | null>(ALARMS_KEY, null);
  if (stored) return stored;

  const single = readJson<SavedAlarm | null>(ACTIVE_KEY, null);
  if (single) return [single, ...DEFAULT_ALARMS.slice(1)];

  return DEFAULT_ALARMS;
}

function loadMap(): AlarmMap {
  return readJson<AlarmMap>(MAP_KEY, {});
}

function loadDirty(): DirtyState {
  return readJson<DirtyState>(DIRTY_KEY, { alarms: [], deletedServerIds: [], workouts: [] });
}

function saveDirty(state: DirtyState): void {
  writeJson(DIRTY_KEY, state);
}

function loadMeta(): SyncMeta {
  return readJson<SyncMeta>(META_KEY, { lastSyncAt: 0, lastFailureAt: 0 });
}

function saveMeta(meta: SyncMeta): void {
  writeJson(META_KEY, meta);
}

function mergeDirty(existing: DirtyState, patch: Partial<DirtyState>): DirtyState {
  return {
    alarms: [...new Set([...(patch.alarms ?? existing.alarms), ...existing.alarms])],
    deletedServerIds: [...new Set([...(patch.deletedServerIds ?? existing.deletedServerIds), ...existing.deletedServerIds])],
    workouts: [...new Set([...(patch.workouts ?? existing.workouts), ...existing.workouts])],
  };
}

function sameAlarm(left: SavedAlarm, right: SavedAlarm): boolean {
  return (
    left.enabled === right.enabled &&
    left.time === right.time &&
    left.repeatType === right.repeatType &&
    left.repeatDays.length === right.repeatDays.length &&
    left.repeatDays.every((day, index) => day === right.repeatDays[index]) &&
    left.exercise === right.exercise &&
    left.repetitions === right.repetitions &&
    left.duration === right.duration &&
    left.difficulty === right.difficulty &&
    left.sound === right.sound &&
    left.volume === right.volume &&
    left.vibration === right.vibration &&
    left.gradualVolume === right.gradualVolume
  );
}

export function persistAlarms(next: SavedAlarm[], prev: SavedAlarm[]): void {
  writeJson(ALARMS_KEY, next);
  if (next.length > 0) {
    const active = next.find((a) => a.enabled) ?? next[0];
    writeJson(ACTIVE_KEY, active);
  }

  const map = loadMap();
  const prevById = new Map(prev.map((alarm) => [alarm.id, alarm]));
  const nextIds = new Set(next.map((alarm) => alarm.id));

  const dirtyAlarms: string[] = [];
  for (const alarm of next) {
    const old = prevById.get(alarm.id);
    if (!old || !sameAlarm(old, alarm)) {
      dirtyAlarms.push(alarm.id);
    }
  }

  const deletedServerIds: string[] = [];
  for (const alarm of prev) {
    if (!nextIds.has(alarm.id)) {
      const serverId = map[alarm.id];
      if (serverId) deletedServerIds.push(serverId);
    }
  }

  saveDirty(mergeDirty(loadDirty(), { alarms: dirtyAlarms, deletedServerIds }));
}

const DEFAULT_WORKOUTS: LocalWorkout[] = [
  {
    id: "workout-seed-1",
    exercise: "pushups",
    repetitions: 10,
    difficulty: "medium",
    repsCompleted: 10,
    completed: true,
    result: "completed",
    startedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 24 * 3600 * 1000 + 78000).toISOString(),
  },
  {
    id: "workout-seed-2",
    exercise: "squats",
    repetitions: 15,
    difficulty: "easy",
    repsCompleted: 15,
    completed: true,
    result: "completed",
    startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 48 * 3600 * 1000 + 84000).toISOString(),
  },
  {
    id: "workout-seed-3",
    exercise: "plank",
    duration: 30,
    difficulty: "medium",
    repsCompleted: 30,
    completed: true,
    result: "completed",
    startedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 72 * 3600 * 1000 + 40000).toISOString(),
  },
];

export function loadLocalWorkouts(): LocalWorkout[] {
  return readJson<LocalWorkout[]>(WORKOUTS_KEY, DEFAULT_WORKOUTS);
}

export function clearLocalWorkouts(): void {
  writeJson(WORKOUTS_KEY, []);
}

export function resetDefaultWorkouts(): LocalWorkout[] {
  writeJson(WORKOUTS_KEY, DEFAULT_WORKOUTS);
  return DEFAULT_WORKOUTS;
}

export function recordWorkout(workout: Omit<LocalWorkout, "id">): LocalWorkout {
  const entry: LocalWorkout = { ...workout, id: crypto.randomUUID() };
  const workouts = loadLocalWorkouts();
  writeJson(WORKOUTS_KEY, [entry, ...workouts]);
  saveDirty(mergeDirty(loadDirty(), { workouts: [entry.id] }));
  return entry;
}

export interface WorkoutStats {
  totalWorkouts: number;
  completedCount: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  totalPushups: number;
  totalSquats: number;
  totalBurpees: number;
  totalPlankSeconds: number;
  totalReps: number;
  avgDurationSec: number;
}

export function computeStreak(workouts: LocalWorkout[]): { currentStreak: number; bestStreak: number } {
  const completed = workouts.filter((w) => w.completed);
  if (completed.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const daySet = new Set<string>();
  for (const w of completed) {
    const d = new Date(w.completedAt);
    if (!isNaN(d.getTime())) {
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      daySet.add(dayKey);
    }
  }

  const sortedDays = Array.from(daySet).sort();
  if (sortedDays.length === 0) return { currentStreak: 0, bestStreak: 0 };

  let best = 1;
  let currentRun = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      currentRun++;
      if (currentRun > best) best = currentRun;
    } else {
      currentRun = 1;
    }
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  let streak = 0;
  const checkDate = daySet.has(todayKey) ? now : daySet.has(yesterdayKey) ? yesterday : null;

  if (checkDate) {
    let cursor = new Date(checkDate.getTime());
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (daySet.has(key)) {
        streak++;
        cursor = new Date(cursor.getTime() - 24 * 3600 * 1000);
      } else {
        break;
      }
    }
  }

  return { currentStreak: streak, bestStreak: Math.max(best, streak) };
}

export function computeWorkoutStats(workouts: LocalWorkout[]): WorkoutStats {
  const totalWorkouts = workouts.length;
  const completed = workouts.filter((w) => w.completed);
  const completedCount = completed.length;
  const completionRate = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0;

  const { currentStreak, bestStreak } = computeStreak(workouts);

  let totalPushups = 0;
  let totalSquats = 0;
  let totalBurpees = 0;
  let totalPlankSeconds = 0;
  let totalDurationMs = 0;

  for (const w of workouts) {
    if (w.exercise === "pushups") totalPushups += w.repsCompleted || 0;
    if (w.exercise === "squats") totalSquats += w.repsCompleted || 0;
    if (w.exercise === "burpees") totalBurpees += w.repsCompleted || 0;
    if (w.exercise === "plank") totalPlankSeconds += w.repsCompleted || 0;

    const start = new Date(w.startedAt).getTime();
    const end = new Date(w.completedAt).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      totalDurationMs += (end - start);
    }
  }

  const avgDurationSec = completedCount > 0 ? Math.round((totalDurationMs / completedCount) / 1000) : 75;

  return {
    totalWorkouts,
    completedCount,
    completionRate,
    currentStreak,
    bestStreak,
    totalPushups,
    totalSquats,
    totalBurpees,
    totalPlankSeconds,
    totalReps: totalPushups + totalSquats + totalBurpees,
    avgDurationSec,
  };
}

interface RemoteAlarm {
  id: string;
  time: string;
  repeatType: RepeatType;
  repeatDays: number[];
  exercise: Exercise;
  repetitions: number;
  duration: number;
  difficulty: Difficulty;
  sound: string;
  volume: number;
  vibration: boolean;
  gradualVolume: boolean;
  enabled: boolean;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

function toRemotePayload(alarm: SavedAlarm): Record<string, unknown> {
  return {
    time: alarm.time,
    repeatType: alarm.repeatType,
    repeatDays: alarm.repeatDays,
    exercise: alarm.exercise,
    repetitions: alarm.repetitions,
    duration: alarm.duration,
    difficulty: alarm.difficulty,
    sound: alarm.sound,
    volume: alarm.volume,
    vibration: alarm.vibration,
    gradualVolume: alarm.gradualVolume,
    enabled: alarm.enabled,
  };
}

function remoteToLocal(remote: RemoteAlarm): SavedAlarm {
  return {
    id: crypto.randomUUID(),
    enabled: remote.enabled ?? true,
    time: remote.time,
    repeatType: remote.repeatType,
    repeatDays: remote.repeatDays,
    exercise: remote.exercise,
    repetitions: remote.repetitions,
    duration: remote.duration,
    difficulty: remote.difficulty,
    sound: remote.sound,
    volume: remote.volume,
    vibration: remote.vibration,
    gradualVolume: remote.gradualVolume,
  };
}

/**
 * Best-effort sync of local alarms/workouts against the backend.
 * Always resolves; returns true when a sync actually completed.
 */
export async function syncNow(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  const meta = loadMeta();
  if (Date.now() - meta.lastFailureAt < FAILURE_COOLDOWN_MS) {
    return false;
  }

  try {
    const res = await api("/api/alarms");
    if (!res.ok) throw new Error(`GET /api/alarms -> ${res.status}`);
    const remote = (await res.json()) as RemoteAlarm[];

    const map = loadMap();
    const ownedServerIds = new Set(Object.values(map).filter((value): value is string => Boolean(value)));
    const next = loadSavedAlarms();
    const imported: string[] = [];

    for (const server of remote) {
      if (ownedServerIds.has(server.id)) continue;
      const local = remoteToLocal(server);
      map[local.id] = server.id;
      next.push(local);
      imported.push(local.id);
    }

    const dirty = loadDirty();
    for (const localId of [...new Set([...dirty.alarms, ...imported])]) {
      const alarm = next.find((candidate) => candidate.id === localId);
      if (!alarm) continue;
      const serverId = map[localId];
      if (!serverId) {
        const created = await api("/api/alarms", {
          method: "POST",
          body: JSON.stringify(toRemotePayload(alarm)),
        });
        if (!created.ok) continue;
        const createdBody = (await created.json()) as { id: string };
        map[localId] = createdBody.id;
      } else {
        const updated = await api(`/api/alarms/${encodeURIComponent(serverId)}`, {
          method: "PATCH",
          body: JSON.stringify(toRemotePayload(alarm)),
        });
        if (!updated.ok) continue;
      }
    }

    for (const serverId of dirty.deletedServerIds) {
      await api(`/api/alarms/${encodeURIComponent(serverId)}`, { method: "DELETE" });
    }

    const workoutDirty = dirty.workouts.slice();
    for (const workoutId of workoutDirty) {
      const entry = loadLocalWorkouts().find((candidate) => candidate.id === workoutId);
      if (!entry) continue;
      const created = await api("/api/workouts", {
        method: "POST",
        body: JSON.stringify({
          exercise: entry.exercise,
          repetitions: entry.repetitions,
          duration: entry.duration,
          difficulty: entry.difficulty,
          repsCompleted: entry.repsCompleted,
          completed: entry.completed,
          result: entry.result,
          completedAt: entry.completedAt,
        }),
      });
      if (!created.ok) continue;
      const createdBody = (await created.json()) as { id: string };
      const workouts = loadLocalWorkouts().map((candidate) =>
        candidate.id === workoutId ? { ...candidate, serverId: createdBody.id } : candidate,
      );
      writeJson(WORKOUTS_KEY, workouts);
    }

    writeJson(MAP_KEY, map);
    saveDirty({ alarms: [], deletedServerIds: [], workouts: [] });
    saveMeta({ lastSyncAt: Date.now(), lastFailureAt: 0 });
    writeJson(ALARMS_KEY, next);
    return true;
  } catch {
    saveMeta({ ...meta, lastFailureAt: Date.now() });
    return false;
  }
}