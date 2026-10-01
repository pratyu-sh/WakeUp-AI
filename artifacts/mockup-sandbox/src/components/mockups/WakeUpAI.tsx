import {
  Activity,
  AlarmClock,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Home,
  Info,
  Minus,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Timer,
  Trash2,
  Trophy,
  Volume2,
  Zap,
  Lock,
  Music,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CustomTone,
  getStoredCustomTones,
  saveCustomTone,
  deleteCustomTone,
  findCustomToneByName,
} from "../../features/audio/customTones";
import { z } from "zod";
import { ChallengeCamera } from "../../features/challenge/components/ChallengeCamera";
import type { ChallengeResult } from "../../features/challenge/engine/ChallengeEngine";
import { OnboardingFlow, SplashScreen } from "../../features/onboarding/components";
import {
  PaywallModal,
  PremiumBadge,
  PremiumExerciseSheet,
  PremiumGate,
} from "../../features/subscription/components";
import {
  useSubscription,
  useEntitlement,
} from "../../features/subscription/hooks";
import { revenueCat } from "../../features/subscription/revenueCat";
import {
  type AlarmDraft,
  type AppSettings,
  type Difficulty,
  type Exercise,
  type LocalWorkout,
  type RepeatType,
  type SavedAlarm,
  clearLocalWorkouts,
  computeWorkoutStats,
  loadLocalWorkouts,
  loadSavedAlarms,
  loadSettings,
  persistAlarms,
  recordWorkout,
  resetDefaultWorkouts,
  saveSettings,
  syncNow,
} from "../../lib/alarm-store";

type Screen =
  | "home"
  | "newAlarm"
  | "alarm"
  | "camera"
  | "success"
  | "failure"
  | "stats"
  | "history"
  | "settings";

const alarmDraftSchema = z
  .object({
    time: z.string().regex(/^\d{2}:\d{2}$/),
    repeatDays: z.array(z.number().min(0).max(6)),
    repeatType: z.enum(["once", "daily", "weekdays", "weekends", "custom"]),
    exercise: z.enum(["pushups", "squats", "burpees", "plank"]),
    repetitions: z.number().int().min(1).max(100),
    duration: z.number().int().min(10).max(300),
    difficulty: z.enum(["easy", "medium", "hard"]),
    sound: z.string().min(1),
    volume: z.number().int().min(0).max(100),
    vibration: z.boolean(),
    gradualVolume: z.boolean(),
  })
  .superRefine((draft, ctx) => {
    if (draft.repeatType !== "once" && draft.repeatDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeatDays"],
        message: "Choose at least one repeat day.",
      });
    }
    if (draft.exercise === "plank" && draft.duration < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["duration"],
        message: "Plank duration must be at least 10 seconds.",
      });
    }
  });

function defaultDraftFrom(settings: AppSettings): AlarmDraft {
  return {
    time: "07:00",
    repeatDays: [1, 2, 3, 4, 5],
    repeatType: "weekdays",
    exercise: settings.defaultExercise,
    repetitions: settings.defaultRepetitions,
    duration: settings.defaultDuration,
    difficulty: settings.defaultDifficulty,
    sound: "Wake Up",
    volume: 70,
    vibration: settings.notificationsEnabled,
    gradualVolume: settings.volumeEscalation === "gradual",
  };
}

const repeatPresets: Array<{ id: RepeatType; label: string; days: number[] }> = [
  { id: "daily", label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "weekdays", label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { id: "weekends", label: "Weekends", days: [0, 6] },
  { id: "custom", label: "Custom", days: [1, 2, 3, 4, 5] },
];

const exercises: Array<{
  id: Exercise;
  label: string;
  detail: string;
  icon: React.ReactNode;
}> = [
  { id: "pushups", label: "Push-ups", detail: "10 reps", icon: <Activity size={22} /> },
  { id: "squats", label: "Squats", detail: "15 reps", icon: <Target size={22} /> },
  { id: "burpees", label: "Burpees", detail: "8 reps", icon: <Flame size={22} /> },
  { id: "plank", label: "Plank", detail: "30 sec", icon: <Timer size={22} /> },
];

const sounds = ["Wake Up", "Morning Rise", "Energy"];

const week = [
  { day: "M", value: 72, done: true },
  { day: "T", value: 58, done: true },
  { day: "W", value: 84, done: true },
  { day: "T", value: 44, done: false },
  { day: "F", value: 66, done: true },
  { day: "S", value: 32, done: false },
  { day: "S", value: 76, done: true },
];

const history = [
  { date: "Today", reps: 10, time: "01:18", result: "Complete" },
  { date: "Yesterday", reps: 10, time: "01:24", result: "Complete" },
  { date: "Wed", reps: 8, time: "01:30", result: "Restarted" },
];

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function getNextOccurrence(time: string, repeatDays: number[]) {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);

    const repeatsToday = repeatDays.length === 0 || repeatDays.includes(candidate.getDay());
    if (candidate > now && repeatsToday) {
      const diffMs = candidate.getTime() - now.getTime();
      const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
      const hoursAway = Math.floor(diffMinutes / 60);
      const minutesAway = diffMinutes % 60;
      const dayLabel =
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tomorrow"
            : candidate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

      return `${dayLabel} · ${hoursAway}h ${minutesAway}m from now`;
    }
  }

  return "Choose a valid wake-up time";
}

function repeatLabel(days: number[]) {
  if (days.length === 0) return "Once";
  if (days.length === 7) return "Every day";
  if (days.join(",") === "1,2,3,4,5") return "Mon - Fri";
  if (days.join(",") === "0,6") return "Weekends";
  return days
    .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
    .join(", ");
}

function exerciseLabel(draft: AlarmDraft) {
  const name =
    exercises.find((exercise) => exercise.id === draft.exercise)?.label ?? "Push-ups";
  return draft.exercise === "plank"
    ? `${name} · ${draft.duration} sec`
    : `${name} · ${draft.repetitions} reps`;
}

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-[#8B5CF6]/[0.06] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-[20px]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/15 text-[#B0AFFA] border border-[#8B5CF6]/25 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
        {icon}
      </div>
      <p className="text-[13px] font-medium text-[#A796D9]">{label}</p>
      <p className="mt-1 font-number font-mono text-[28px] font-semibold leading-none tracking-normal text-white">
        {value}
      </p>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);
  return (
    <div
      className="grid h-24 w-24 place-items-center rounded-full shadow-[0_0_20px_rgba(168,85,247,0.25)]"
      style={{
        background: `conic-gradient(#A855F7 ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg)`,
      }}
    >
      <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#1A1628] border border-white/[0.08]">
        <span className="font-number font-mono text-2xl font-semibold tracking-normal text-white">
          {value}%
        </span>
      </div>
    </div>
  );
}

function HomeScreen({
  openAlarm,
  alarms,
  onToggleAlarm,
  onDeleteAlarm,
  onEditAlarm,
  onOpenSettings,
  onViewHistory,
  workouts,
  isPlus = false,
  onOpenPaywall,
  wakeUpGoal = "",
  onAddAlarm,
  onReplayOnboarding,
}: {
  openAlarm: (id: string) => void;
  alarms: SavedAlarm[];
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onEditAlarm: (alarm: SavedAlarm) => void;
  onOpenSettings?: () => void;
  onViewHistory?: () => void;
  workouts: LocalWorkout[];
  isPlus?: boolean;
  onOpenPaywall?: () => void;
  wakeUpGoal?: string;
  onAddAlarm?: () => void;
  onReplayOnboarding?: () => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nextAlarm =
    alarms.find((a) => a.id === selectedId) ?? alarms.find((a) => a.enabled) ?? alarms[0];

  const stats = useMemo(() => computeWorkoutStats(workouts), [workouts]);

  const weeklyActivity = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    return labels.map((label, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const dayKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

      const completedCount = workouts.filter((w) => {
        if (!w.completed) return false;
        const wd = new Date(w.completedAt);
        const k = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`;
        return k === dayKey;
      }).length;

      const isToday = idx === dayOfWeek;
      const isPast = idx <= dayOfWeek;

      return {
        day: label,
        done: completedCount > 0,
        isToday,
        value: completedCount > 0 ? 88 : isToday ? 35 : isPast ? 20 : 10,
      };
    });
  }, [workouts]);

  const formatRelativeTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <main className="pb-28">
      <section className="px-6 pt-7">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold tracking-widest text-[#B0AFFA] uppercase">
                WAKEUP AI
              </span>
              {onReplayOnboarding && (
                <button
                  type="button"
                  onClick={onReplayOnboarding}
                  className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[9px] font-medium text-[#C4B5FB] hover:bg-white/15 transition cursor-pointer"
                  title="Replay Onboarding Tour"
                >
                  Tour
                </button>
              )}
              {isPlus ? (
                <div className="flex items-center gap-1.5">
                  <PremiumBadge size="sm" />
                  <button
                    type="button"
                    onClick={() => revenueCat.simulateStatus("FREE")}
                    className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[9px] font-medium text-[#A796D9] hover:bg-white/15 transition"
                    title="Reset to Free plan to test paywalls"
                  >
                    Test Free Plan
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenPaywall}
                    className="rounded-full bg-[#1C1832] border border-white/15 text-white font-semibold px-3 py-1 text-[11px] shadow-sm hover:bg-[#252042] transition active:scale-95 cursor-pointer"
                  >
                    Get AI+
                  </button>
                  <span className="text-[10px] text-[#8775B5] font-medium">
                    (2 alarms limit)
                  </span>
                </div>
              )}
            </div>
            <h1 className="mt-2 text-[32px] font-semibold leading-[1.08] tracking-tight text-white">
              Good morning,
              <br />
              Pratyush 👋
            </h1>
          </div>
          <button
            onClick={onOpenSettings}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-[#C4B5FB] shadow-lg transition active:scale-[0.95] hover:bg-white/10"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </section>

      {/* Next Ringing Alarm Card */}
      {nextAlarm && (
        <section className="mt-6 px-6">
          <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#121020]/95 p-6 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-[20px]">
            <button
              onClick={() => openAlarm(nextAlarm.id)}
              className="w-full text-left transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#1C1832] border border-white/15 px-3 py-1 text-[12px] font-semibold text-[#B0AFFA]">
                  Next alarm
                </span>
                <AlarmClock size={22} className="text-[#B0AFFA]" />
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="font-number font-mono text-[52px] font-semibold leading-none tracking-normal text-white">
                    {formatTime(nextAlarm.time).replace(" AM", "").replace(" PM", "")}
                  </p>
                  <p className="mt-2 text-[15px] text-[#A796D9]">
                    {repeatLabel(nextAlarm.repeatDays)}, {exerciseLabel(nextAlarm).toLowerCase()}
                  </p>
                  {wakeUpGoal && (
                    <p className="mt-1 text-xs text-[#B0AFFA] font-medium truncate max-w-[220px]">
                      Goal: &ldquo;{wakeUpGoal}&rdquo;
                    </p>
                  )}
                </div>
                <ChevronRight size={24} className="text-[#C4B5FB]" />
              </div>
            </button>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => openAlarm(nextAlarm.id)}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#1C1832] border border-white/15 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition active:scale-[0.98] hover:bg-[#252042]"
              >
                <AlarmClock size={17} className="text-white" />
                <span>Ring Now</span>
              </button>
              <button
                onClick={() => onEditAlarm(nextAlarm)}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] text-sm font-medium text-white transition active:scale-[0.98] hover:bg-white/10"
              >
                <Pencil size={15} />
                <span>Edit Alarm</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Your Alarms Dropdown Section */}
      <section className="mt-6 px-6">
        <button
          onClick={() => setListOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#1A1628]/80 backdrop-blur-[20px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition active:scale-[0.99]"
          aria-expanded={listOpen}
          aria-label="Toggle your alarms list"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-white">
              Your Alarms
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#C4B5FB]">
              {alarms.length}
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`text-[#C4B5FB] transition-transform ${listOpen ? "rotate-180" : ""}`}
          />
        </button>

        {listOpen && (
          <div className="mt-3 space-y-3">
            {!isPlus && alarms.filter((a) => a.enabled).length >= 2 && (
              <div
                onClick={onOpenPaywall}
                className="flex items-center justify-between rounded-[18px] bg-[#121020]/95 border border-white/10 p-4 text-xs text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer hover:border-white/20 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1C1832] border border-white/15 text-white font-bold shadow-md">
                    <Lock size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-[#B0AFFA] text-[13px] block">
                      2/2 Free Alarms Active
                    </span>
                    <span className="text-[11px] text-[#A796D9] leading-relaxed block mt-0.5">
                      You've reached your 2-alarm limit. WakeUp AI+ gives you unlimited alarms.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPaywall?.();
                  }}
                  className="rounded-full bg-[#1C1832] border border-white/15 text-white font-semibold px-3.5 py-1.5 text-xs shadow-md hover:bg-[#252042] transition shrink-0 ml-2"
                >
                  Upgrade
                </button>
              </div>
            )}
            {onAddAlarm && (
              <button
                type="button"
                onClick={onAddAlarm}
                className="w-full flex items-center justify-center gap-2 rounded-[18px] border border-dashed border-white/20 bg-white/[0.035] p-3.5 text-xs font-semibold text-white hover:bg-white/[0.06] hover:border-white/30 transition active:scale-[0.99]"
              >
                <Plus size={16} className="text-[#B0AFFA]" />
                <span>Add Alarm {!isPlus && alarms.filter((a) => a.enabled).length >= 2 ? "(🔒 AI+)" : ""}</span>
              </button>
            )}
            {alarms.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-[20px] border bg-[#121020]/90 backdrop-blur-[20px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition ${
                  !item.enabled ? "opacity-50 border-white/[0.05]" : "border-white/[0.08]"
                } ${nextAlarm?.id === item.id ? "border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.6)]" : ""}`}
              >
                <button
                  onClick={() => setSelectedId(item.id)}
                  className="flex-1 text-left"
                  aria-label={`Show ${formatTime(item.time)} alarm`}
                >
                  <div className="flex items-baseline gap-2">
                    <p className="font-number font-mono text-[26px] font-semibold leading-none tracking-normal text-white">
                      {formatTime(item.time)}
                    </p>
                    {nextAlarm?.id === item.id && (
                      <span className="rounded-full bg-[#1C1832] border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-[#B0AFFA]">
                        Next
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium text-[#A796D9]">
                    {repeatLabel(item.repeatDays)} · {exerciseLabel(item)}
                  </p>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditAlarm(item)}
                    className="grid h-9 w-9 place-items-center rounded-full text-[#C4B5FB] transition hover:bg-white/10 hover:text-white"
                    title="Edit alarm"
                    aria-label={`Edit alarm for ${item.time}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => openAlarm(item.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-[#B0AFFA] transition hover:bg-white/10"
                    title="Test Ring"
                    aria-label={`Ring alarm for ${item.time}`}
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => onToggleAlarm(item.id)}
                    className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${
                      item.enabled ? "bg-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-white/15"
                    }`}
                    aria-label={`Toggle alarm for ${item.time}`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full transition-transform ${
                        item.enabled ? "translate-x-6 bg-white shadow-sm" : "translate-x-0 bg-white/60"
                      }`}
                    />
                  </button>
                  {alarms.length > 1 && (
                    <button
                      onClick={() => onDeleteAlarm(item.id)}
                      className="grid h-9 w-9 place-items-center rounded-full text-[#8775B5] transition hover:bg-rose-500/15 hover:text-rose-400"
                      aria-label="Delete alarm"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dynamic Streak & Stats Pills */}
      <section className="mt-4 grid grid-cols-2 gap-4 px-6">
        <StatPill
          label="Current streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
          icon={<Flame size={20} />}
        />
        <StatPill
          label="Total movements"
          value={`${stats.totalReps > 0 ? stats.totalReps : stats.totalPushups}`}
          icon={<Activity size={20} />}
        />
      </section>

      {/* Weekly Activity Progress */}
      <section className="mt-4 px-6">
        <div className="rounded-[20px] border border-white/[0.08] bg-[#1A1628]/80 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#A796D9]">Weekly activity</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-white">
                Movement score
              </h2>
            </div>
            <ProgressRing value={stats.completionRate || 85} />
          </div>
          <div className="mt-6 grid grid-cols-7 items-end gap-2">
            {weeklyActivity.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end rounded-full bg-white/[0.04] p-1 border border-white/[0.05]">
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${
                      item.done
                        ? "bg-gradient-to-t from-[#8B5CF6] to-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.45)]"
                        : "bg-white/10"
                    }`}
                    style={{ height: `${item.value}%` }}
                  />
                </div>
                <span
                  className={`text-[12px] font-medium ${
                    item.isToday ? "font-bold text-[#B0AFFA]" : "text-[#8775B5]"
                  }`}
                >
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Challenges - Dynamic From Local Workouts */}
      <section className="mt-4 px-6">
        <div className="rounded-[20px] border border-white/[0.08] bg-[#1A1628]/80 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight text-white">
              Recent challenges
            </h2>
            <button
              onClick={onViewHistory}
              className="text-[13px] font-semibold text-[#B0AFFA] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {workouts.length === 0 ? (
              <p className="text-xs text-[#8775B5] py-2">
                No challenges logged yet. Ring an alarm to record your first workout!
              </p>
            ) : (
              workouts.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full ${
                        item.completed
                          ? "bg-[#8B5CF6]/15 text-[#B0AFFA] border border-[#8B5CF6]/35 shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      <Check size={18} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold capitalize text-white">
                        {item.exercise} challenge
                      </p>
                      <p className="text-[12px] font-medium text-[#A796D9]">
                        {item.repsCompleted} {item.exercise === "plank" ? "sec hold" : "reps"} ·{" "}
                        {formatRelativeTime(item.completedAt)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#C4B5FB]" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function AlarmScreen({
  alarm,
  startChallenge,
  onDismiss,
}: {
  alarm: SavedAlarm;
  startChallenge: () => void;
  onDismiss: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Haptic vibration pattern when alarm has vibration enabled
    if (!alarm.vibration || typeof navigator === "undefined" || !("vibrate" in navigator)) {
      return;
    }
    let vibrationInterval: number | undefined;
    try {
      navigator.vibrate([600, 200, 600, 200, 600]);
      vibrationInterval = window.setInterval(() => {
        try {
          navigator.vibrate([400, 200, 400]);
        } catch {
          // Vibration may not be available
        }
      }, 3000);
    } catch {
      // Vibration not supported — silently ignore
    }
    return () => {
      if (vibrationInterval !== undefined) window.clearInterval(vibrationInterval);
    };
  }, [alarm.vibration]);

  useEffect(() => {
    if (muted) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current = null;
      }
      return;
    }

    // Check if alarm uses a custom uploaded tone
    const customTone = findCustomToneByName(alarm.sound);
    if (customTone && typeof window !== "undefined") {
      try {
        const audio = new Audio(customTone.dataUrl);
        audio.loop = true;
        audio.volume = Math.max(0.08, (alarm.volume ?? 70) / 100);
        audio.play().catch(() => {});
        customAudioRef.current = audio;
        return () => {
          audio.pause();
          customAudioRef.current = null;
        };
      } catch {
        // Fall back to synthesis below if audio file fails
      }
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const soundFreq =
      alarm.sound === "Energy"
        ? 620
        : alarm.sound === "Morning Rise"
          ? 480
          : alarm.sound === "Zen Harmony"
            ? 432
            : alarm.sound === "Hyper Pulse"
              ? 740
              : 540;
    const baseGain = Math.max(0.04, (alarm.volume ?? 70) / 350);

    const playBeep = () => {
      try {
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = soundFreq;
        gain.gain.setValueAtTime(baseGain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch {
        /* ignore audio glitches */
      }
    };

    playBeep();
    timerRef.current = window.setInterval(playBeep, 900);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current = null;
      }
    };
  }, [alarm.sound, alarm.volume, muted]);

  const handleStartChallenge = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current = null;
    }
    startChallenge();
  };

  return (
    <main className="flex min-h-screen flex-col justify-between px-6 pb-10 pt-9 text-white relative overflow-hidden bg-[#07060E]">
      {/* Ambient background bloom */}
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-80 rounded-full bg-purple-900/10 blur-3xl" />

      <section className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3.5 py-1 text-[13px] font-semibold text-rose-400 border border-rose-500/30">
            <span className="h-2 w-2 animate-ping rounded-full bg-rose-400" />
            Alarm Ringing
          </span>
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-[#C4B5FB] transition active:scale-95 hover:bg-white/15"
          >
            <Volume2 size={16} />
            <span>{muted ? "Unmute" : "Mute Sound"}</span>
          </button>
        </div>
        <div className="mt-16">
          <p className="text-[15px] font-medium text-[#A796D9]">Time to wake up</p>
          <h1 className="mt-3 font-number font-mono text-[76px] font-semibold leading-none tracking-normal text-white">
            {formatTime(alarm.time).replace(" AM", "").replace(" PM", "")}
          </h1>
          <p className="mt-4 max-w-[280px] text-[16px] leading-6 text-[#A796D9]">
            Complete your physical challenge in front of the camera to dismiss this alarm.
          </p>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mb-5 rounded-[20px] bg-[#121020]/90 backdrop-blur-[20px] p-5 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1C1832] border border-white/15 text-white shadow-md">
              <Target size={26} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#A796D9]">Required physical challenge</p>
              <p className="text-[22px] font-semibold tracking-tight text-white">
                {exerciseLabel(alarm)}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleStartChallenge}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-[#1C1832] border border-white/15 text-[17px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition active:scale-[0.98] hover:bg-[#252042]"
        >
          <Camera size={22} className="text-white" />
          <span>Start camera challenge</span>
        </button>

        <button
          onClick={onDismiss}
          className="mt-3 w-full py-3 text-center text-sm font-medium text-[#8775B5] transition active:text-white"
        >
          Dismiss alarm for today
        </button>
      </section>
    </main>
  );
}

function SuccessScreen({
  goHome,
  exercise,
  reps,
  durationMs,
  streak = 0,
  goal = "",
  isPlus = false,
  onOpenPaywall,
}: {
  goHome: () => void;
  exercise: Exercise;
  reps: number;
  durationMs?: number;
  streak?: number;
  goal?: string;
  isPlus?: boolean;
  onOpenPaywall?: () => void;
}) {
  const label = exercise === "plank" ? `${reps}s PLANK` : `${reps} ${exercise.toUpperCase()}`;
  const timeFormatted = durationMs
    ? `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}`
    : "1:18";

  const calories = Math.max(
    12,
    Math.round(
      exercise === "burpees"
        ? reps * 8
        : exercise === "squats"
        ? reps * 4.5
        : exercise === "plank"
        ? reps * 0.25
        : reps * 4.2,
    ),
  );

  return (
    <main className="flex min-h-screen flex-col justify-between px-6 pb-10 pt-12 text-white relative overflow-hidden bg-[#07060E]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-80 rounded-full bg-purple-900/10 blur-3xl" />

      <section className="pt-8 text-center relative z-10">
        {/* Glowing Checkmark */}
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#1C1832] border border-white/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.12)] animate-in zoom-in-50 duration-300">
          <Check size={48} strokeWidth={2.5} />
        </div>

        {/* Big YOU'RE UP */}
        <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight uppercase text-white">
          You&apos;re Up.
        </h1>

        <p className="mt-2 text-xl font-semibold tracking-wide text-[#B0AFFA]">
          {label}
        </p>

        {/* Streak Badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1832] px-4 py-1.5 text-xs font-semibold text-[#B0AFFA] border border-white/15 shadow-md">
          <Flame size={15} className="text-[#A855F7]" />
          <span>{streak > 0 ? `${streak} DAY STREAK` : "CHALLENGE COMPLETE"}</span>
        </div>

        {/* Wake-Up Goal Motivation Card */}
        <div className="mx-auto mt-8 max-w-sm rounded-[20px] border border-white/[0.08] bg-[#121020]/90 p-5 text-left backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {goal ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A796D9]">
                You wanted to:
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white italic">
                &ldquo;{goal}&rdquo;
              </p>
              <p className="mt-2 text-xs font-semibold text-[#B0AFFA]">
                Now go do it.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A796D9]">
                Morning well started.
              </p>
              <p className="mt-1.5 text-base font-semibold text-white">
                You chose movement over comfort. That's the hardest part.
              </p>
              <p className="mt-2 text-xs font-semibold text-[#B0AFFA]">
                Set a morning goal in Settings to see it here.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="w-full max-w-sm mx-auto relative z-10">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatPill label="Time" value={timeFormatted} icon={<Timer size={16} />} />
          <StatPill label="Reps" value={`${reps}`} icon={<Target size={16} />} />
          <StatPill label="Energy" value={`${calories} cal`} icon={<Zap size={16} />} />
        </div>

        {/* Non-intrusive Post-Challenge Monetization Card */}
        {!isPlus && (
          <div className="mb-4 rounded-[18px] border border-white/10 bg-[#121020]/90 p-4 backdrop-blur-md text-left shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B0AFFA]">
              <Sparkles size={13} className="text-[#A855F7]" />
              <span>WANT MORE FROM YOUR MORNINGS?</span>
            </div>
            <p className="mt-1 text-xs text-[#A796D9]">
              WakeUp AI+ gives you unlimited alarms, all exercises, adaptive challenges & deep insights.
            </p>
            <button
              onClick={onOpenPaywall}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#1C1832] border border-white/15 text-xs font-semibold text-white hover:bg-[#252042] transition active:scale-95"
            >
              <span>EXPLORE AI+</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <button
          onClick={goHome}
          className="h-14 w-full rounded-full bg-[#1C1832] border border-white/15 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition active:scale-[0.98] hover:bg-[#252042]"
        >
          Continue
        </button>
      </section>
    </main>
  );
}

function FailureScreen({
  onRetry,
  onExit,
  exercise,
  repsCompleted,
  targetReps,
  reason,
}: {
  onRetry: () => void;
  onExit: () => void;
  exercise: Exercise;
  repsCompleted: number;
  targetReps?: number;
  reason?: string;
  durationMs?: number;
}) {
  const reasonText =
    reason === "timeout"
      ? "Time limit reached before completing required reps"
      : reason === "person_left"
        ? "No movement detected / left camera frame"
        : reason === "aborted"
          ? "Challenge stopped before finishing"
          : reason === "setup_error"
            ? "Camera initialization issue encountered"
            : "Challenge not completed";

  return (
    <main className="flex min-h-screen flex-col justify-between px-6 pb-10 pt-9 text-white relative overflow-hidden bg-[#07060E]">
      <section className="pt-16 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_12px_40px_rgba(244,63,94,0.25)]">
          <RotateCcw size={40} strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-tight text-white">
          Challenge Incomplete
        </h1>
        <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-6 text-[#A796D9]">
          {reasonText}. Complete your exercise to turn off the alarm.
        </p>

        <div className="mx-auto mt-6 max-w-[320px] rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-4 text-left shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A796D9]">Workout Progress</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-number font-mono text-2xl font-semibold text-white">
              {repsCompleted} {exercise === "plank" ? "sec" : "reps"}
            </span>
            {targetReps && (
              <span className="font-number font-mono text-sm text-[#A796D9]">
                Target: {targetReps} {exercise === "plank" ? "sec" : "reps"}
              </span>
            )}
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-all"
              style={{
                width: targetReps ? `${Math.min(100, (repsCompleted / targetReps) * 100)}%` : "0%",
              }}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <button
          onClick={onRetry}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#1C1832] border border-white/15 text-[16px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition active:scale-[0.98] hover:bg-[#252042]"
        >
          <RotateCcw size={18} />
          <span>Try Again</span>
        </button>

        <button
          onClick={onExit}
          className="flex h-14 w-full items-center justify-center rounded-full bg-white/[0.05] border border-white/10 text-sm font-semibold text-[#C4B5FB] backdrop-blur transition active:scale-[0.98] hover:bg-white/10"
        >
          Return to Alarm
        </button>
      </section>
    </main>
  );
}

function StatsScreen({
  workouts,
  onOpenPaywall,
}: {
  workouts: LocalWorkout[];
  onOpenPaywall?: () => void;
}) {
  const stats = useMemo(() => computeWorkoutStats(workouts), [workouts]);

  const maxExerciseCount = Math.max(
    stats.totalPushups,
    stats.totalSquats,
    stats.totalBurpees,
    stats.totalPlankSeconds,
    1,
  );

  const achievements = [
    {
      id: "first_challenge",
      title: "First Step",
      desc: "Complete your first wake-up challenge",
      unlocked: stats.completedCount >= 1,
      icon: <Check size={18} />,
    },
    {
      id: "streak_3",
      title: "3-Day Discipline",
      desc: "Maintain a 3-day alarm wake-up streak",
      unlocked: stats.bestStreak >= 3,
      icon: <Flame size={18} />,
    },
    {
      id: "century_reps",
      title: "Century Club",
      desc: "Accumulate 100+ total movement repetitions",
      unlocked: stats.totalReps >= 100,
      icon: <Trophy size={18} />,
    },
    {
      id: "iron_plank",
      title: "Iron Core",
      desc: "Hold a plank challenge for 30+ seconds",
      unlocked: stats.totalPlankSeconds >= 30,
      icon: <Timer size={18} />,
    },
  ];

  return (
    <main className="px-6 pb-28 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#A796D9]">Performance</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">Statistics</h1>
        </div>
        <div className="rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 px-3.5 py-1.5 text-xs font-semibold text-[#B0AFFA] shadow-[0_0_15px_rgba(168,85,247,0.25)]">
          {stats.completedCount} Completed
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4">
        <StatPill
          label="Completion"
          value={`${stats.completionRate}%`}
          icon={<BarChart3 size={20} />}
        />
        <StatPill
          label="Current streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
          icon={<Flame size={20} />}
        />
        <StatPill label="Best streak" value={`${stats.bestStreak} days`} icon={<Trophy size={20} />} />
        <StatPill
          label="Avg duration"
          value={`${Math.floor(stats.avgDurationSec / 60)}:${String(stats.avgDurationSec % 60).padStart(2, "0")}`}
          icon={<Timer size={20} />}
        />
      </section>

      <section className="mt-6 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <h2 className="text-[18px] font-semibold text-white">Movement Breakdown</h2>
        <p className="mt-1 text-xs text-[#A796D9]">
          Total completed reps and hold times across alarm dismissals
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Activity size={16} className="text-[#A855F7]" /> Push-ups
              </span>
              <span>{stats.totalPushups} reps</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.totalPushups / maxExerciseCount) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Target size={16} className="text-emerald-400" /> Squats
              </span>
              <span>{stats.totalSquats} reps</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.totalSquats / maxExerciseCount) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Flame size={16} className="text-amber-400" /> Burpees
              </span>
              <span>{stats.totalBurpees} reps</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.totalBurpees / maxExerciseCount) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Timer size={16} className="text-sky-400" /> Plank Hold
              </span>
              <span>{stats.totalPlankSeconds}s</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, (stats.totalPlankSeconds / maxExerciseCount) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <h2 className="text-[18px] font-semibold text-white">Discipline Badges</h2>
        <div className="mt-4 space-y-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-[16px] border p-3.5 transition ${
                item.unlocked
                  ? "border-white/[0.08] bg-white/[0.04]"
                  : "border-dashed border-white/10 bg-white/[0.02] opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full ${
                    item.unlocked
                      ? "bg-[#1C1832] border border-white/15 text-white shadow-sm"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">{item.title}</p>
                  <p className="text-[12px] text-[#A796D9]">{item.desc}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  item.unlocked
                    ? "bg-[#1C1832] text-[#B0AFFA] border border-white/15"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {item.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Performance Insights — Gated by AI+ */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-white">Advanced Insights</h2>
            <PremiumBadge size="sm" />
          </div>
        </div>

        <PremiumGate
          feature="advanced_statistics"
          fallbackTitle="Unlock Deep Morning Analytics"
          fallbackDescription="See best wake-up days, sleep-to-rep conversion, consistency trends, and personalized morning velocity."
          onUnlock={onOpenPaywall}
        >
          <div className="rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-3.5">
            <div className="flex items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-4">
              <div>
                <p className="text-xs font-semibold text-[#A796D9]">Best Wake-Up Consistency</p>
                <p className="text-base font-semibold text-white mt-0.5">Tuesday & Thursday</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                100% on-time
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-4">
              <div>
                <p className="text-xs font-semibold text-[#A796D9]">Morning Velocity Index</p>
                <p className="text-base font-semibold text-white mt-0.5">Top 5% of early risers</p>
              </div>
              <span className="font-mono text-xs font-semibold text-[#B0AFFA]">
                48s avg response
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-4">
              <div>
                <p className="text-xs font-semibold text-[#A796D9]">Goal Execution Correlation</p>
                <p className="text-base font-semibold text-white mt-0.5">91% goal follow-through</p>
              </div>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
                High focus
              </span>
            </div>
          </div>
        </PremiumGate>
      </section>
    </main>
  );
}

function HistoryScreen({
  workouts,
  onResetData,
}: {
  workouts: LocalWorkout[];
  onResetData?: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "completed">("all");

  const filtered = useMemo(() => {
    if (filter === "completed") return workouts.filter((w) => w.completed);
    return workouts;
  }, [workouts, filter]);

  // Generate 28-day grid ending today
  const last28Days = useMemo(() => {
    const days: Array<{ date: string; dateObj: Date; active: boolean; count: number }> = [];
    const completedWorkouts = workouts.filter((w) => w.completed);

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const count = completedWorkouts.filter((w) => {
        const wd = new Date(w.completedAt);
        const k = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`;
        return k === dayKey;
      }).length;

      days.push({
        date: dayKey,
        dateObj: d,
        active: count > 0,
        count,
      });
    }
    return days;
  }, [workouts]);

  const formatWorkoutDate = (isoStr: string) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "Recent";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  const getExerciseIcon = (exercise: Exercise) => {
    switch (exercise) {
      case "pushups":
        return <Activity size={18} className="text-[#B0AFFA]" />;
      case "squats":
        return <Target size={18} className="text-emerald-400" />;
      case "burpees":
        return <Flame size={18} className="text-amber-400" />;
      case "plank":
        return <Timer size={18} className="text-sky-400" />;
    }
  };

  return (
    <main className="px-6 pb-28 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#A796D9]">Activity Log</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">History</h1>
        </div>
        <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-semibold text-[#C4B5FB]">
          {workouts.length} recorded
        </span>
      </div>

      {/* 28-day Heatmap */}
      <section className="mt-6 rounded-[20px] border border-white/[0.08] bg-[#1A1628]/80 backdrop-blur-[20px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">28-Day Consistency</h2>
          <span className="text-xs text-[#A796D9]">
            {last28Days.filter((d) => d.active).length} / 28 active days
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {last28Days.map((item, index) => (
            <div
              key={index}
              title={`${item.dateObj.toLocaleDateString()}: ${item.count} completed`}
              className={`aspect-square rounded-xl transition flex items-center justify-center text-[11px] font-semibold ${
                item.active
                  ? "bg-[#1C1832] border border-white/20 text-white shadow-sm"
                  : "bg-white/[0.035] text-white/30 border border-white/[0.05]"
              }`}
            >
              {item.dateObj.getDate()}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-3 text-[11px] text-[#A796D9]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10 border border-white/20" /> Rest
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white" /> Completed
          </span>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex rounded-full bg-[#121020]/90 p-1 border border-white/10 backdrop-blur-[20px]">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filter === "all" ? "bg-[#1C1832] border border-white/20 text-white shadow-sm" : "text-[#A796D9] hover:text-white"
            }`}
          >
            All ({workouts.length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filter === "completed" ? "bg-[#1C1832] border border-white/20 text-white shadow-sm" : "text-[#A796D9] hover:text-white"
            }`}
          >
            Completed ({workouts.filter((w) => w.completed).length})
          </button>
        </div>
      </div>

      {/* Workouts List */}
      <section className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-white/15 bg-[#121020]/50 p-8 text-center backdrop-blur-md">
            <Clock size={32} className="mx-auto text-white/40" />
            <p className="mt-3 text-sm font-semibold text-white">No workout logs found</p>
            <p className="mt-1 text-xs text-[#A796D9]">
              Dismiss an active alarm challenge to record your first workout.
            </p>
            {onResetData && (
              <button
                onClick={onResetData}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1832] border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#252042]"
              >
                <RotateCcw size={14} />
                <span>Load Sample Data</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => {
            const isPlank = item.exercise === "plank";
            const detailText = isPlank
              ? `${item.repsCompleted}s hold (${item.difficulty})`
              : `${item.repsCompleted} reps (${item.difficulty})`;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    {getExerciseIcon(item.exercise)}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold capitalize text-white">
                      {item.exercise}
                    </p>
                    <p className="text-[12px] font-medium text-[#A796D9]">{detailText}</p>
                    <p className="text-[11px] text-[#8775B5]">{formatWorkoutDate(item.completedAt)}</p>
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.completed
                        ? "bg-[#1C1832] text-[#B0AFFA] border border-white/15 shadow-sm"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {item.completed ? <Check size={12} /> : null}
                    {item.completed ? "Completed" : "Restarted"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

function SettingsScreen({
  settings,
  onChange,
  onTestCamera,
  onResetData,
  onClearHistory,
  wakeUpGoal = "",
  onGoalChange,
  isPlus = false,
  status = "FREE",
  expirationDate = null,
  onOpenPaywall,
  onReplayOnboarding,
}: {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onTestCamera?: () => void;
  onResetData?: () => void;
  onClearHistory?: () => void;
  wakeUpGoal?: string;
  onGoalChange?: (goal: string) => void;
  isPlus?: boolean;
  status?: string;
  expirationDate?: string | null;
  onOpenPaywall?: () => void;
  onReplayOnboarding?: () => void;
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPreviewRef = useRef<AudioContext | null>(null);

  const handleTestAudio = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setIsPlayingAudio(false);
        return;
      }
      const ctx = new AudioCtx();
      audioPreviewRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.0);

      window.setTimeout(() => {
        setIsPlayingAudio(false);
        void ctx.close();
      }, 1100);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const update = (patch: Partial<AppSettings>) =>
    onChange({ ...settings, ...patch });

  const isPlank = settings.defaultExercise === "plank";
  const value = isPlank ? settings.defaultDuration : settings.defaultRepetitions;
  const label = isPlank ? "Duration" : "Repetitions";
  const unit = isPlank ? "sec" : "reps";

  function adjust(amount: number) {
    if (isPlank) {
      update({ defaultDuration: Math.min(300, Math.max(10, settings.defaultDuration + amount * 5)) });
    } else {
      update({ defaultRepetitions: Math.min(100, Math.max(1, settings.defaultRepetitions + amount)) });
    }
  }

  return (
    <main className="px-6 pb-28 pt-8">
      <h1 className="text-[32px] font-semibold tracking-tight text-white">Settings</h1>

      {/* Subscription Status Card */}
      <section className="mt-6 rounded-[20px] border border-white/[0.08] bg-[#1A1628]/80 backdrop-blur-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#A796D9]">Subscription</p>
          {isPlus ? <PremiumBadge size="sm" /> : null}
        </div>

        <div className="mt-3 rounded-[18px] bg-[#121020]/95 border border-white/15 p-4 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1C1832] border border-white/20 text-white shadow-[0_0_12px_rgba(0,0,0,0.4)]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">
                  {isPlus ? "WakeUp AI+" : "WakeUp AI Free Plan"}
                </p>
                <p className="text-xs text-[#A796D9] mt-0.5">
                  {isPlus
                    ? expirationDate
                      ? `Active · Renews on ${new Date(expirationDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
                      : "Active · Lifetime access"
                    : status === "EXPIRED"
                    ? "Subscription expired"
                    : "Free plan includes 2 active alarms & push-ups"}
                </p>
              </div>
            </div>

            {isPlus ? (
              <button
                onClick={onOpenPaywall}
                className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/90 hover:bg-white/20 transition active:scale-95"
              >
                Manage
              </button>
            ) : (
              <button
                onClick={onOpenPaywall}
                className="rounded-full bg-[#1C1832] border border-white/20 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-[#252042] transition active:scale-95 shrink-0 ml-2"
              >
                Unlock AI+ →
              </button>
            )}
          </div>
        </div>

        {/* Restore Purchases Shortcut */}
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[12px] text-[#A796D9]">Already have a subscription?</span>
          <button
            type="button"
            onClick={async () => {
              await revenueCat.restorePurchases();
            }}
            className="text-[12px] font-semibold text-[#B0AFFA] hover:underline cursor-pointer"
          >
            Restore Purchases
          </button>
        </div>

        {/* Plan Mode Quick Switcher */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
          <div>
            <span className="text-[12px] font-semibold text-white block">
              {isPlus ? "⚡ AI+ Mode Active" : "🌱 Free Mode Active"}
            </span>
            <span className="text-[11px] text-[#A796D9] block mt-0.5">
              {isPlus
                ? "All exercises, unlimited alarms & custom tones unlocked"
                : "Push-ups & 2 free alarms. AI+ features locked."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => revenueCat.simulateStatus(isPlus ? "FREE" : "ACTIVE")}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 bg-white/[0.08] border border-white/10 text-white hover:bg-white/15 shrink-0 ml-2"
          >
            {isPlus ? "Switch to Free" : "Switch to AI+"}
          </button>
        </div>
      </section>

      {/* Diagnostics & Testing Shortcuts */}
      <section className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <p className="text-[13px] font-semibold text-[#A796D9]">Quick Testing & Diagnostics</p>
        <div className="mt-3 space-y-2.5">
          {onReplayOnboarding && (
            <button
              onClick={onReplayOnboarding}
              className="flex w-full items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-3.5 text-left transition active:scale-[0.98] hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1C1832] text-[#B0AFFA] border border-white/15 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">Replay Onboarding Tour</p>
                  <p className="text-[12px] text-[#A796D9]">
                    View the 4-screen intro and permissions explanation
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#C4B5FB]" />
            </button>
          )}

          <button
            onClick={onTestCamera}
            className="flex w-full items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-3.5 text-left transition active:scale-[0.98] hover:bg-white/[0.08]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1C1832] text-[#B0AFFA] border border-white/15 shadow-sm">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">Test Pose Camera</p>
                <p className="text-[12px] text-[#A796D9]">
                  Test MediaPipe body tracking without setting an alarm
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#C4B5FB]" />
          </button>

          <button
            onClick={handleTestAudio}
            disabled={isPlayingAudio}
            className="flex w-full items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-3.5 text-left transition active:scale-[0.98] hover:bg-white/[0.08] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                <Volume2 size={20} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">
                  {isPlayingAudio ? "Playing Chime..." : "Preview Alarm Synthesizer"}
                </p>
                <p className="text-[12px] text-[#A796D9]">Play audio tone using Web Audio API</p>
              </div>
            </div>
            <Play size={18} className="text-white/40" />
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <p className="pt-2 text-[13px] font-semibold text-[#A796D9]">Notifications & alerts</p>
        <div className="mt-1">
          <ToggleRow
            label="Notifications"
            checked={settings.notificationsEnabled}
            onChange={() => update({ notificationsEnabled: !settings.notificationsEnabled })}
          />
          <div className="h-px bg-white/10" />
          <div className="flex min-h-16 items-center justify-between">
            <span className="text-[15px] font-semibold text-white">Alarm volume</span>
            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] p-1">
              {(["gradual", "instant"] as const).map((mode) => {
                const selected = settings.volumeEscalation === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => update({ volumeEscalation: mode })}
                    className={`h-9 rounded-full px-3 text-[13px] font-semibold capitalize transition ${
                      selected ? "bg-white text-black shadow-sm" : "text-[#A796D9] hover:text-white"
                    }`}
                    aria-pressed={selected}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <p className="text-[13px] font-semibold text-[#A796D9]">Default challenge</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {exercises.map((exercise) => {
            const selected = settings.defaultExercise === exercise.id;
            return (
              <button
                key={exercise.id}
                onClick={() => update({ defaultExercise: exercise.id })}
                className={`rounded-[18px] border p-4 text-left transition active:scale-[0.98] ${
                  selected
                    ? "border-white/20 bg-[#1C1832] shadow-md"
                    : "border-white/[0.08] bg-white/[0.035] hover:border-white/20"
                }`}
                aria-pressed={selected}
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
                    {exercise.icon}
                  </div>
                  {selected && (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-[#1C1832] border border-white/20 text-white shadow-sm">
                      <Check size={14} strokeWidth={2.4} />
                    </div>
                  )}
                </div>
                <p className="mt-4 text-[15px] font-semibold text-white">{exercise.label}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[18px] bg-white/[0.04] border border-white/[0.08] p-4">
          <span className="text-[15px] font-semibold text-white">{label}</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => adjust(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
              aria-label={`Decrease ${label.toLowerCase()}`}
            >
              <Minus size={18} />
            </button>
            <p className="min-w-[86px] text-center font-number font-mono text-[22px] font-semibold tracking-normal text-white">
              {value} <span className="text-[14px] font-semibold text-[#A796D9]">{unit}</span>
            </p>
            <button
              onClick={() => adjust(1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#1C1832] border border-white/15 text-white font-semibold hover:bg-[#252042] transition active:scale-95 shadow-md"
              aria-label={`Increase ${label.toLowerCase()}`}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <p className="mt-4 text-[13px] font-semibold text-[#A796D9]">Difficulty</p>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] p-1.5">
          {(["easy", "medium", "hard"] as Difficulty[]).map((level) => {
            const selected = settings.defaultDifficulty === level;
            return (
              <button
                key={level}
                onClick={() => update({ defaultDifficulty: level })}
                className={`h-11 rounded-full text-[13px] font-semibold capitalize transition ${
                  selected ? "bg-[#1C1832] border border-white/20 text-white shadow-sm" : "text-[#A796D9] hover:text-white"
                }`}
                aria-pressed={selected}
              >
                {level}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-[15px] font-semibold text-white">On-device AI</p>
            <p className="mt-0.5 text-[13px] font-medium text-[#A796D9]">
              Body tracking runs locally, never uploaded
            </p>
          </div>
          <button
            onClick={() => update({ onDeviceAI: !settings.onDeviceAI })}
            className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${
              settings.onDeviceAI ? "bg-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-white/15"
            }`}
            aria-label="Toggle on-device AI"
            aria-pressed={settings.onDeviceAI}
          >
            <span
              className={`h-6 w-6 rounded-full transition-transform ${
                settings.onDeviceAI ? "translate-x-6 bg-white shadow-sm" : "translate-x-0 bg-white/60"
              }`}
            />
          </button>
        </div>
        <div className="my-3 h-px bg-white/10" />
        <div className="flex items-center gap-3 pb-3">
          <ShieldCheck size={20} className="text-[#A855F7] shrink-0" />
          <p className="text-[13px] font-medium leading-5 text-[#A796D9]">
            Movement detection runs client-side with MediaPipe. Nothing leaves your phone until
            you sync your workout summary.
          </p>
        </div>
      </section>

      {/* Morning Goal Section */}
      {onGoalChange && (
        <section className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#121020]/90 backdrop-blur-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <p className="text-[13px] font-semibold text-[#A796D9]">Morning intention</p>
          <p className="mt-1 text-[12px] text-[#8775B5]">
            This appears on your success screen after completing the challenge.
          </p>
          <div className="mt-3 flex items-center rounded-full border border-white/15 bg-white/[0.035] backdrop-blur-[20px] px-4 py-3 focus-within:border-white/30 transition">
            <input
              type="text"
              value={wakeUpGoal}
              onChange={(e) => onGoalChange(e.target.value)}
              placeholder="e.g. Finish my side project"
              maxLength={80}
              className="flex-1 bg-transparent text-[15px] font-medium text-white placeholder-[#8775B5] outline-none"
              aria-label="Morning intention goal"
            />
            {wakeUpGoal && (
              <button
                onClick={() => onGoalChange("")}
                className="ml-2 text-white/40 transition hover:text-rose-400"
                aria-label="Clear morning goal"
              >
                ×
              </button>
            )}
          </div>
        </section>
      )}

      {/* Data Management Section */}
      <section className="mt-4 rounded-[28px] border border-white/10 bg-[#12121A]/85 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <p className="text-[13px] font-semibold text-white/60">Data & Storage</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {onResetData && (
            <button
              onClick={onResetData}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white transition hover:bg-white/10"
            >
              <RotateCcw size={14} />
              <span>Reset Demo Data</span>
            </button>
          )}
          {onClearHistory && (
            <button
              onClick={onClearHistory}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 transition hover:bg-rose-500/20"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function StepHeader({
  stepNumber,
  stepTag,
  title,
  subtitle,
  canBack,
  onBack,
  onCancel,
}: {
  stepNumber: number;
  stepTag: string;
  title: string;
  subtitle?: string;
  canBack: boolean;
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <header className="px-6 pt-7 pb-2">
      <div className="flex items-center justify-between">
        <button
          onClick={canBack ? onBack : onCancel}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 shadow-2xs"
          aria-label={canBack ? "Go to previous step" : "Close alarm creation"}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/15 px-3.5 py-1 text-[11px] font-bold tracking-[0.16em] text-[#B0AFFA] shadow-2xs">
          <span>{stepTag}</span>
        </div>
        <button
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Cancel alarm creation"
        >
          Cancel
        </button>
      </div>

      {/* 3-Step Segmented Progress Bar */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              num <= stepNumber
                ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <h1 className="mt-6 text-[32px] sm:text-[36px] font-bold leading-[1.08] tracking-tight text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-[14px] font-medium leading-5 text-[#A796D9]">
          {subtitle}
        </p>
      )}
    </header>
  );
}

function RepeatSelector({
  draft,
  setDraft,
}: {
  draft: AlarmDraft;
  setDraft: React.Dispatch<React.SetStateAction<AlarmDraft>>;
}) {
  const days = [
    { label: "M", day: 1, full: "Monday" },
    { label: "T", day: 2, full: "Tuesday" },
    { label: "W", day: 3, full: "Wednesday" },
    { label: "T", day: 4, full: "Thursday" },
    { label: "F", day: 5, full: "Friday" },
    { label: "S", day: 6, full: "Saturday" },
    { label: "S", day: 0, full: "Sunday" },
  ];

  return (
    <section className="mt-5 rounded-[28px] border border-white/10 bg-[#1A1628]/85 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">Repeat Schedule</p>
          <p className="text-[12px] font-medium text-white/90 mt-0.5">
            {repeatLabel(draft.repeatDays)}
          </p>
        </div>
        <span className="text-[11px] font-bold text-[#B0AFFA] bg-[#1C1832] px-2.5 py-0.5 rounded-full border border-white/15">
          {draft.repeatType.toUpperCase()}
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {repeatPresets.map((preset) => {
          const selected = draft.repeatType === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  repeatType: preset.id,
                  repeatDays: preset.id === "once" ? [] : preset.days,
                }))
              }
              className={`h-11 rounded-full border text-[13px] font-bold transition active:scale-95 ${
                selected
                  ? "border-white/20 bg-[#1C1832] text-white shadow-md"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
              aria-label={`Select repeat ${preset.label}`}
              aria-pressed={selected}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Circular Day Pills */}
      <div className="mt-4 pt-3.5 border-t border-white/10">
        <p className="text-[11px] font-semibold text-white/50 mb-2.5">
          Tap days to customize schedule:
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((item) => {
            const selected = draft.repeatDays.includes(item.day);
            return (
              <button
                key={`${item.full}-${item.day}`}
                type="button"
                onClick={() =>
                  setDraft((current) => {
                    const nextDays = current.repeatDays.includes(item.day)
                      ? current.repeatDays.filter((val) => val !== item.day)
                      : [...current.repeatDays, item.day].sort();
                    return { ...current, repeatDays: nextDays, repeatType: "custom" };
                  })
                }
                className={`flex h-13 flex-col items-center justify-center gap-1 rounded-2xl border text-[13px] font-bold transition active:scale-95 ${
                  selected
                    ? "border-white/20 bg-[#1C1832] text-white shadow-md"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}
                aria-label={`Toggle repeat on ${item.full}`}
                aria-pressed={selected}
              >
                <span>{item.label}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    selected ? "bg-white" : "bg-white/20"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhenStep({
  draft,
  setDraft,
}: {
  draft: AlarmDraft;
  setDraft: React.Dispatch<React.SetStateAction<AlarmDraft>>;
}) {
  const [hStr, mStr] = draft.time.split(":");
  const hourNum = parseInt(hStr, 10);
  const minNum = parseInt(mStr, 10);
  const isPM = hourNum >= 12;
  const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
  const displayHour = String(hour12).padStart(2, "0");
  const displayMin = String(minNum).padStart(2, "0");

  function adjustMinutes(delta: number) {
    let totalMinutes = hourNum * 60 + minNum + delta;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    const timeStr = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    setDraft((curr) => ({ ...curr, time: timeStr }));
  }

  function setPeriod(targetPM: boolean) {
    if (targetPM === isPM) return;
    const newH = targetPM ? (hourNum % 12) + 12 : hourNum % 12;
    const timeStr = `${String(newH).padStart(2, "0")}:${displayMin}`;
    setDraft((curr) => ({ ...curr, time: timeStr }));
  }

  return (
    <section className="px-6 pb-32">
      {/* Hero Time Card */}
      <div className="mt-5 rounded-[32px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        <label
          className="block text-[12px] font-bold uppercase tracking-wider text-[#A796D9]"
          htmlFor="alarm-time-native"
        >
          Wake-Up Time
        </label>

        {/* Large Time Hero */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="relative inline-flex items-baseline">
            <span className="font-number font-mono text-[64px] sm:text-[72px] font-bold leading-none tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
              {displayHour}:{displayMin}
            </span>
            {/* Transparent native time input overlay */}
            <input
              id="alarm-time-native"
              type="time"
              value={draft.time}
              onChange={(e) => setDraft((curr) => ({ ...curr, time: e.target.value }))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Set alarm time"
            />
          </div>

          {/* AM / PM Segmented Control */}
          <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setPeriod(false)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition active:scale-95 ${
                !isPM
                  ? "bg-[#1C1832] border border-white/20 text-white shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
              aria-label="Set AM"
              aria-pressed={!isPM}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod(true)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition active:scale-95 ${
                isPM
                  ? "bg-[#1C1832] border border-white/20 text-white shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
              aria-label="Set PM"
              aria-pressed={isPM}
            >
              PM
            </button>
          </div>
        </div>

        {/* Quick Adjustment Chips */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {[-15, -5, +5, +15].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => adjustMinutes(delta)}
              className="h-8 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-bold text-[#C4B5FB] transition hover:bg-white/[0.08] hover:text-white active:scale-95"
              aria-label={`Adjust time by ${delta > 0 ? `+${delta}` : delta} minutes`}
            >
              {delta > 0 ? `+${delta}m` : `${delta}m`}
            </button>
          ))}
        </div>

        {/* Dynamic Contextual Occurrence Pill */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1C1832] border border-white/15 px-4 py-1.5 text-[13px] font-bold text-[#B0AFFA]">
          <Clock size={15} className="text-[#B0AFFA]" />
          <span>{getNextOccurrence(draft.time, draft.repeatDays)}</span>
        </div>
      </div>

      {/* Repeat Schedule */}
      <RepeatSelector draft={draft} setDraft={setDraft} />
    </section>
  );
}

function WakeStep({
  draft,
  setDraft,
  isExerciseLocked = () => false,
  canUseAdaptive = false,
  onOpenPremiumExercise = () => {},
  wakeUpGoal = "",
  onGoalChange,
}: {
  draft: AlarmDraft;
  setDraft: React.Dispatch<React.SetStateAction<AlarmDraft>>;
  isExerciseLocked?: (ex: Exercise) => boolean;
  canUseAdaptive?: boolean;
  onOpenPremiumExercise?: (ex: Exercise | "adaptive_ai") => void;
  wakeUpGoal?: string;
  onGoalChange?: (goal: string) => void;
}) {
  const isPlank = draft.exercise === "plank";
  const value = isPlank ? draft.duration : draft.repetitions;
  const unit = isPlank ? "sec" : "reps";

  const difficultyDetails: Record<Difficulty, { title: string; desc: string }> = {
    easy: {
      title: "Easy",
      desc: "More forgiving range of motion. Great for light mornings.",
    },
    medium: {
      title: "Medium",
      desc: "Standard challenge. Balanced form verification for most mornings.",
    },
    hard: {
      title: "Hard",
      desc: "Strict form and full range of motion. Zero excuses.",
    },
  };

  const quickReps = [5, 10, 15, 20, 25];
  const quickPlank = [15, 30, 45, 60, 90];

  const goalTemplates = [
    "Finish my React project",
    "Morning workout & run",
    "Prepare for my exam",
    "Start my morning routine",
  ];

  function adjust(amount: number) {
    setDraft((current) => {
      if (current.exercise === "plank") {
        return { ...current, duration: Math.min(300, Math.max(10, current.duration + amount * 5)) };
      }
      return { ...current, repetitions: Math.min(100, Math.max(1, current.repetitions + amount)) };
    });
  }

  function setQuickTarget(val: number) {
    setDraft((current) => {
      if (current.exercise === "plank") {
        return { ...current, duration: val };
      }
      return { ...current, repetitions: val };
    });
  }

  return (
    <section className="px-6 pb-32">
      {/* Exercise Selection Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {exercises.map((exercise) => {
          const selected = draft.exercise === exercise.id;
          const locked = isExerciseLocked(exercise.id);

          const handleClick = () => {
            if (locked) {
              onOpenPremiumExercise(exercise.id);
              return;
            }
            setDraft((current) => ({
              ...current,
              exercise: exercise.id,
              repetitions:
                exercise.id === "squats" ? 15 : exercise.id === "burpees" ? 8 : current.repetitions,
            }));
          };

          return (
            <button
              key={exercise.id}
              type="button"
              onClick={handleClick}
              className={`relative rounded-[28px] border p-4 text-left transition active:scale-[0.98] ${
                selected
                  ? "border-white/20 bg-[#1C1832] shadow-[0_8px_24px_rgba(0,0,0,0.6)] scale-[1.01]"
                  : "border-white/10 bg-[#121020]/90 backdrop-blur-md hover:border-white/20"
              }`}
              aria-label={`Select ${exercise.label}`}
              aria-pressed={selected}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-2xl transition ${
                    selected ? "bg-[#252042] border border-white/20 text-white shadow-md" : "bg-white/10 text-white"
                  }`}
                >
                  {exercise.icon}
                </div>
                {selected ? (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[#1C1832] border border-white/20 text-white shadow-sm">
                    <Check size={14} strokeWidth={2.4} />
                  </div>
                ) : locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1832] border border-white/15 px-2 py-0.5 text-[10px] font-bold text-[#B0AFFA]">
                    <Lock size={10} /> AI+
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    FREE
                  </span>
                )}
              </div>
              <p className="mt-4 text-[16px] font-bold text-white">{exercise.label}</p>
              <p className="mt-0.5 text-[12px] font-medium text-[#A796D9]">AI verified form</p>
            </button>
          );
        })}
      </div>

      {/* Adaptive AI Challenge Banner */}
      <div
        onClick={() => {
          if (!canUseAdaptive) {
            onOpenPremiumExercise("adaptive_ai");
          }
        }}
        className="mt-4 flex items-center justify-between rounded-[24px] border border-white/10 bg-[#121020]/90 p-4 cursor-pointer hover:border-white/20 transition active:scale-[0.99] shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1C1832] border border-white/15 text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-white">Adaptive Challenge</span>
              <PremiumBadge size="sm" />
            </div>
            <p className="text-[12px] text-[#A796D9]">
              Difficulty adapts dynamically based on prior performance
            </p>
          </div>
        </div>
        {!canUseAdaptive && <Lock size={16} className="text-[#B0AFFA]" />}
      </div>

      {/* Target Stepper */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">
            Challenge Target
          </p>
          <span className="text-[12px] font-semibold text-[#A796D9]">
            {isPlank ? "Hold duration" : "Repetition goal"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition active:scale-95 hover:bg-white/20"
            aria-label={isPlank ? "Decrease duration" : "Decrease repetitions"}
          >
            <Minus size={22} />
          </button>
          <div className="text-center">
            <span className="font-number font-mono text-[44px] font-bold leading-none tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              {value}
            </span>
            <span className="ml-1.5 text-[18px] font-bold text-[#B0AFFA]">
              {unit}
            </span>
          </div>
          <button
            type="button"
            onClick={() => adjust(1)}
            className="grid h-14 w-14 place-items-center rounded-full bg-[#1C1832] border border-white/20 text-white font-bold transition active:scale-95 hover:bg-[#252042] shadow-md"
            aria-label={isPlank ? "Increase duration" : "Increase repetitions"}
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Quick jump target chips */}
        <div className="mt-4 flex items-center justify-center gap-1.5 pt-3 border-t border-white/10">
          {(isPlank ? quickPlank : quickReps).map((targetVal) => {
            const isCurrent = value === targetVal;
            return (
              <button
                key={targetVal}
                type="button"
                onClick={() => setQuickTarget(targetVal)}
                className={`h-8 px-3 rounded-full text-[12px] font-bold transition active:scale-95 ${
                  isCurrent
                    ? "bg-[#1C1832] border border-white/20 text-white shadow-xs"
                    : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                }`}
                aria-label={`Set target to ${targetVal} ${unit}`}
              >
                {targetVal} {isPlank ? "s" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty Segmented Control */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">
          Form Strictness
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 p-1.5 border border-white/10">
          {(["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => {
            const selected = draft.difficulty === difficulty;
            const isHardLocked = difficulty === "hard" && !canUseAdaptive;
            return (
              <button
                key={difficulty}
                type="button"
                onClick={() => {
                  if (isHardLocked) {
                    onOpenPremiumExercise("adaptive_ai");
                    return;
                  }
                  setDraft((current) => ({ ...current, difficulty }));
                }}
                className={`h-11 rounded-xl text-[13px] font-bold uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1 ${
                  selected
                    ? "bg-[#1C1832] border border-white/20 text-white shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
                aria-label={`Select ${difficulty} difficulty`}
                aria-pressed={selected}
              >
                <span>{difficulty}</span>
                {isHardLocked && <Lock size={11} className="text-[#B0AFFA]" />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-[#A796D9]">
          {difficultyDetails[draft.difficulty].desc}
        </p>
      </div>

      {/* Optional Wake-up Goal */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">
            Why are you getting up? (Optional)
          </p>
          <span className="text-[11px] font-semibold text-[#8775B5]">Morning Intention</span>
        </div>
        <p className="mt-1 text-[12px] text-[#8775B5]">
          Set a personal intention that appears on your challenge success screen.
        </p>

        {/* Quick Goal Template Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {goalTemplates.map((template) => {
            const isSelected = wakeUpGoal === template;
            return (
              <button
                key={template}
                type="button"
                onClick={() => onGoalChange?.(template)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                  isSelected
                    ? "bg-[#1C1832] border border-white/20 text-white shadow-xs"
                    : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {template}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        <div className="mt-3 flex items-center rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 focus-within:border-white/30 transition">
          <input
            type="text"
            value={wakeUpGoal}
            onChange={(e) => onGoalChange?.(e.target.value)}
            placeholder="Write your custom intention..."
            maxLength={80}
            className="flex-1 bg-transparent text-[14px] font-medium text-white placeholder-white/30 outline-none"
            aria-label="Morning intention goal"
          />
          {wakeUpGoal && (
            <button
              type="button"
              onClick={() => onGoalChange?.("")}
              className="ml-2 grid h-6 w-6 place-items-center rounded-full bg-white/20 text-xs font-bold text-white hover:bg-rose-500 hover:text-white transition"
              aria-label="Clear morning goal"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-16 w-full items-center justify-between text-left py-2"
      aria-label={label}
      aria-pressed={checked}
    >
      <div className="pr-4">
        <span className="block text-[15px] font-bold text-white">{label}</span>
        {sublabel && (
          <span className="block text-[12px] font-medium text-[#A796D9] mt-0.5">{sublabel}</span>
        )}
      </div>
      <span
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
          checked ? "bg-[#1C1832] border border-white/20" : "bg-white/15"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full transition-transform duration-200 shadow-sm ${
            checked ? "translate-x-6 bg-white" : "translate-x-0 bg-white/60"
          }`}
        />
      </span>
    </button>
  );
}

function AlarmSummary({
  draft,
  wakeUpGoal,
}: {
  draft: AlarmDraft;
  wakeUpGoal?: string;
}) {
  const isPlank = draft.exercise === "plank";
  const targetLabel = isPlank
    ? `${draft.duration} sec plank`
    : `${draft.repetitions} ${exerciseLabel(draft).toLowerCase()}`;
  const nextOccurrenceText = getNextOccurrence(draft.time, draft.repeatDays);

  return (
    <div className="rounded-[28px] bg-[#121020]/95 p-6 text-white shadow-xl border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.2em] text-[#B0AFFA] uppercase">
          YOUR MORNING
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/70">
          Live Preview
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-number font-mono text-[46px] font-bold leading-none tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
          {formatTime(draft.time)}
        </span>
        <span className="text-[13px] font-bold text-white bg-[#1C1832] px-3 py-1 rounded-full border border-white/15">
          {repeatLabel(draft.repeatDays)}
        </span>
      </div>

      <p className="mt-2 text-[13px] font-medium text-[#A796D9]">
        {nextOccurrenceText}
      </p>

      <div className="my-4 h-px bg-white/10" />

      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-2xl bg-[#0A0714]/60 p-3 border border-white/5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-[#8775B5]">
            Physical Challenge
          </span>
          <span className="mt-1 block font-semibold text-white">
            {targetLabel}
          </span>
          <span className="text-[11px] font-bold capitalize text-[#B0AFFA]">
            {draft.difficulty} difficulty
          </span>
        </div>

        <div className="rounded-2xl bg-[#0A0714]/60 p-3 border border-white/5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-[#8775B5]">
            Sound & Audio
          </span>
          <span className="mt-1 block font-semibold text-white truncate">
            {draft.sound} ({draft.volume}%)
          </span>
          <span className="text-[11px] text-[#A796D9]">
            {draft.vibration ? "Vibration On" : "Silent Haptics"}
            {draft.gradualVolume ? " · Gradual" : ""}
          </span>
        </div>
      </div>

      {wakeUpGoal && (
        <div className="mt-3 rounded-2xl bg-[#1C1832]/60 border border-white/10 p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#B0AFFA]">
            Morning Intention
          </span>
          <p className="mt-0.5 text-[13px] font-medium italic text-white/90 truncate">
            &ldquo;{wakeUpGoal}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

function AlarmStep({
  draft,
  setDraft,
  wakeUpGoal,
  canUsePremiumSounds = false,
  onOpenPaywall,
}: {
  draft: AlarmDraft;
  setDraft: React.Dispatch<React.SetStateAction<AlarmDraft>>;
  wakeUpGoal?: string;
  canUsePremiumSounds?: boolean;
  onOpenPaywall?: (context?: { title?: string; subtitle?: string }) => void;
}) {
  const audioRef = useRef<AudioContext | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [customTones, setCustomTones] = useState<CustomTone[]>(() => getStoredCustomTones());
  const [uploadError, setUploadError] = useState<string>("");

  useEffect(() => {
    return () => {
      void audioRef.current?.close();
      audioRef.current = null;
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current = null;
      }
    };
  }, []);

  async function previewBuiltIn(sound: string, freq: number) {
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current = null;
    }

    if (playingSound === sound && audioRef.current) {
      await audioRef.current.close();
      audioRef.current = null;
      setPlayingSound(null);
      return;
    }

    if (audioRef.current) {
      await audioRef.current.close();
      audioRef.current = null;
    }

    setPlayingSound(sound);
    const AudioContextClass =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    const context = new AudioContextClass();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = freq;
    gain.gain.value = Math.max(0.04, draft.volume / 350);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.onended = () => {
      void context.close();
      if (audioRef.current === context) {
        audioRef.current = null;
        setPlayingSound(null);
      }
    };
  }

  function previewCustomTone(tone: CustomTone) {
    if (audioRef.current) {
      void audioRef.current.close();
      audioRef.current = null;
    }

    if (playingSound === tone.id && customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current = null;
      setPlayingSound(null);
      return;
    }

    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current = null;
    }

    try {
      const audio = new Audio(tone.dataUrl);
      audio.volume = Math.max(0.08, draft.volume / 100);
      audio.onended = () => {
        setPlayingSound(null);
        customAudioRef.current = null;
      };
      customAudioRef.current = audio;
      setPlayingSound(tone.id);
      audio.play().catch(() => {
        setPlayingSound(null);
      });
    } catch {
      setPlayingSound(null);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Audio file exceeds 10MB limit. Please choose a smaller track.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newTone = saveCustomTone(file.name, dataUrl, file.size);
        const updated = getStoredCustomTones();
        setCustomTones(updated);
        setDraft((curr) => ({ ...curr, sound: newTone.name }));
        previewCustomTone(newTone);
      }
    };
    reader.onerror = () => {
      setUploadError("Could not read audio file. Please try another format.");
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-selected if desired
    e.target.value = "";
  }

  function handleDeleteTone(id: string, name: string) {
    if (playingSound === id && customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current = null;
      setPlayingSound(null);
    }
    const updated = deleteCustomTone(id);
    setCustomTones(updated);
    if (draft.sound === name) {
      setDraft((curr) => ({ ...curr, sound: "Wake Up" }));
    }
  }

  const soundOptions: Array<{
    id: string;
    label: string;
    category: "GENTLE" | "ENERGETIC" | "INTENSE";
    subtitle: string;
    frequency: number;
    isPremium?: boolean;
  }> = [
    {
      id: "Morning Rise",
      label: "Morning Rise",
      category: "GENTLE",
      subtitle: "Warm, mellow tone to wake with ease (Free)",
      frequency: 480,
    },
    {
      id: "Wake Up",
      label: "Wake Up",
      category: "ENERGETIC",
      subtitle: "Crisp melodic chime to activate alertness (Free)",
      frequency: 540,
    },
    {
      id: "Energy",
      label: "Energy",
      category: "INTENSE",
      subtitle: "High-contrast dynamic pulse for heavy sleepers (Free)",
      frequency: 620,
    },
    {
      id: "Zen Harmony",
      label: "Zen Harmony",
      category: "GENTLE",
      subtitle: "432Hz deep meditative ambient wave",
      frequency: 432,
      isPremium: true,
    },
    {
      id: "Hyper Pulse",
      label: "Hyper Pulse",
      category: "INTENSE",
      subtitle: "740Hz fast staccato wake-up cadence",
      frequency: 740,
      isPremium: true,
    },
  ];

  return (
    <section className="px-6 pb-36">
      {/* Sound Selection */}
      <div className="mt-5 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">
            Alarm Sound
          </p>
          <span className="text-[12px] font-bold text-white truncate max-w-[170px]">
            {draft.sound}
          </span>
        </div>

        <div className="mt-3 divide-y divide-white/10">
          {soundOptions.map((item) => {
            const selected = draft.sound === item.id;
            const isPlaying = playingSound === item.id;
            const isLocked = item.isPremium && !canUsePremiumSounds;

            const handleSoundClick = () => {
              if (isLocked) {
                onOpenPaywall?.({
                  title: "Unlock Premium Sounds",
                  subtitle: "Wake up to curated acoustic & high-tempo tones with WakeUp AI+",
                });
                return;
              }
              setDraft((current) => ({ ...current, sound: item.id }));
            };

            return (
              <div key={item.id} className="flex min-h-16 items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      onOpenPaywall?.({
                        title: "Unlock Premium Sounds",
                        subtitle: "Wake up to curated acoustic & high-tempo tones with WakeUp AI+",
                      });
                      return;
                    }
                    void previewBuiltIn(item.id, item.frequency);
                  }}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${
                    isPlaying
                      ? "bg-[#1C1832] text-white border border-white/30 shadow-md"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  aria-label={`Preview ${item.label} alarm sound`}
                >
                  {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleSoundClick}
                  className="flex flex-1 items-center justify-between py-2 text-left"
                  aria-label={`Select ${item.label} alarm sound`}
                  aria-pressed={selected}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-white">{item.label}</span>
                      <span className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white/80">
                        {item.category}
                      </span>
                      {item.isPremium && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1832] border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Lock size={10} /> AI+
                        </span>
                      )}
                      {!item.isPremium && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                          FREE
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-medium text-[#A796D9]">{item.subtitle}</span>
                  </div>
                  {selected && (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-[#1C1832] border border-white/30 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0">
                      <Check size={14} strokeWidth={2.4} />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Tones Section */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-white/80" />
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]">
              Custom Wake Tones
            </p>
          </div>
          <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70">
            {customTones.length} Added
          </span>
        </div>

        <p className="mt-1 text-[12px] text-[#A796D9]">
          Add any MP3, WAV, or audio track from your device to wake up to.
        </p>

        {uploadError && (
          <div className="mt-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-[11px] font-bold text-rose-400">
            {uploadError}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* List of Custom Tones */}
        {customTones.length > 0 && (
          <div className="mt-3 divide-y divide-white/10 border-t border-white/10">
            {customTones.map((tone) => {
              const isSelected = draft.sound === tone.name;
              const isPlaying = playingSound === tone.id;
              return (
                <div key={tone.id} className="flex min-h-14 items-center justify-between gap-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => previewCustomTone(tone)}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-95 ${
                      isPlaying
                        ? "bg-[#1C1832] text-white border border-white/30 shadow-md"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-label={`Preview ${tone.name}`}
                  >
                    {isPlaying ? <Square size={13} fill="currentColor" /> : <Play size={14} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft((curr) => ({ ...curr, sound: tone.name }))}
                    className="flex flex-1 items-center justify-between text-left py-1"
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-white truncate">{tone.name}</span>
                        <span className="rounded-full bg-[#1C1832] border border-white/20 px-1.5 py-0.2 text-[9px] font-bold text-white/80">
                          CUSTOM
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A796D9]">
                        {tone.sizeBytes ? `${Math.round(tone.sizeBytes / 1024)} KB · ` : ""}Local Tone
                      </span>
                    </div>
                    {isSelected && (
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-[#1C1832] border border-white/30 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0">
                        <Check size={14} strokeWidth={2.4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTone(tone.id, tone.name)}
                    className="grid h-8 w-8 place-items-center rounded-full text-white/40 hover:text-rose-400 hover:bg-rose-500/15 transition"
                    aria-label={`Delete custom tone ${tone.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Custom Tone CTA */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-[#1C1832]/60 py-3 text-[13px] font-bold text-white hover:border-white/40 hover:bg-[#1C1832] transition active:scale-[0.99]"
        >
          <Upload size={16} className="text-white/80" />
          <span>+ Add Custom Tone from Device</span>
        </button>
      </div>

      {/* Volume Slider */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#A796D9]" htmlFor="alarm-volume">
            Alarm Volume
          </label>
          <span className="font-number font-mono text-[16px] font-bold text-white">
            {draft.volume}%
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Volume2 size={20} className="text-[#A796D9] shrink-0" />
          <input
            id="alarm-volume"
            type="range"
            min={0}
            max={100}
            value={draft.volume}
            onChange={(event) =>
              setDraft((current) => ({ ...current, volume: Number(event.target.value) }))
            }
            className="w-full accent-white cursor-pointer"
            aria-label="Set alarm volume"
          />
        </div>
        <p className="mt-2 text-[12px] text-[#8775B5]">
          Rings at this audio volume when your alarm triggers
        </p>
      </div>

      {/* Vibration & Gradual Escalation */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-[#121020]/90 backdrop-blur-md px-5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <ToggleRow
          label="Vibration"
          sublabel="Haptic pulses when your alarm starts"
          checked={draft.vibration}
          onChange={() => setDraft((current) => ({ ...current, vibration: !current.vibration }))}
        />
        <div className="h-px bg-white/10" />
        <ToggleRow
          label="Gradually increase volume"
          sublabel="Smoothly escalates volume over 30 seconds"
          checked={draft.gradualVolume}
          onChange={() =>
            setDraft((current) => ({ ...current, gradualVolume: !current.gradualVolume }))
          }
        />
      </div>

      {/* Live Morning Summary */}
      <div className="mt-5">
        <AlarmSummary draft={draft} wakeUpGoal={wakeUpGoal} />
      </div>
    </section>
  );
}

function NewAlarmFlow({
  initialDraft,
  isEditing,
  alarmId,
  onCancel,
  onSave,
  isExerciseLocked,
  canUseAdaptive,
  onOpenPremiumExercise,
  wakeUpGoal,
  onGoalChange,
  canUsePremiumSounds,
  onOpenPaywall,
}: {
  initialDraft: AlarmDraft;
  isEditing?: boolean;
  alarmId?: string;
  onCancel: () => void;
  onSave: (alarm: SavedAlarm) => void;
  isExerciseLocked?: (ex: Exercise) => boolean;
  canUseAdaptive?: boolean;
  onOpenPremiumExercise?: (ex: Exercise | "adaptive_ai") => void;
  wakeUpGoal?: string;
  onGoalChange?: (goal: string) => void;
  canUsePremiumSounds?: boolean;
  onOpenPaywall?: (context?: { title?: string; subtitle?: string }) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AlarmDraft>(initialDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const headers = [
    {
      stepTag: isEditing ? "EDIT · 01 / 03" : "01 / 03 · WHEN",
      title: isEditing ? "Change wake-up time" : "When do you want to wake up?",
      subtitle: "Choose your alarm time and repeating schedule.",
    },
    {
      stepTag: isEditing ? "EDIT · 02 / 03" : "02 / 03 · WAKE",
      title: isEditing ? "Choose physical challenge" : "How do you want to wake up?",
      subtitle: "Select the movement required to prove you're awake.",
    },
    {
      stepTag: isEditing ? "EDIT · 03 / 03" : "03 / 03 · ALARM",
      title: isEditing ? "Adjust sound & escalation" : "How should your alarm feel?",
      subtitle: "Make it impossible to sleep through.",
    },
  ];

  function next() {
    setError("");
    // Inline validation for step 0 (repeat days check)
    if (step === 0 && draft.repeatType !== "once" && draft.repeatDays.length === 0) {
      setError("Choose at least one repeat day, or select 'Once'.");
      return;
    }
    setStep((current) => Math.min(2, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAlarm() {
    setError("");
    const result = alarmDraftSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your alarm settings.");
      return;
    }

    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const alarm: SavedAlarm = {
      ...result.data,
      id: isEditing && alarmId ? alarmId : crypto.randomUUID(),
      enabled: true,
    };
    window.localStorage.setItem("wakeup-ai-active-alarm", JSON.stringify(alarm));
    window.localStorage.setItem("wakeup-ai-last-draft", JSON.stringify(result.data));
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => onSave(alarm), 750);
  }

  if (saved) {
    return (
      <main className="flex min-h-screen flex-col justify-between bg-[#07060E] px-6 pb-10 pt-24 text-center text-white relative overflow-hidden">
        {/* Subtle Ambient glow */}
        <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-80 rounded-full bg-gradient-to-t from-purple-900/10 via-transparent to-transparent blur-3xl" />

        <section className="relative z-10">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#1C1832] text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/20 animate-in zoom-in-50 duration-300">
            <Check size={44} strokeWidth={3} />
          </div>
          <h1 className="mt-8 text-[38px] font-bold tracking-tight text-white">
            {isEditing ? "Alarm updated" : "Alarm set"}
          </h1>
          <p className="mt-3 font-number font-mono text-[36px] font-bold tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
            {formatTime(draft.time)}
          </p>
          <p className="mx-auto mt-4 max-w-[280px] text-[16px] leading-6 text-[#A796D9]">
            {exerciseLabel(draft)} · {repeatLabel(draft.repeatDays)}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C1832] border border-white/20 px-4 py-1.5 text-[13px] font-bold text-white">
            <Clock size={15} className="text-white/80" />
            <span>{getNextOccurrence(draft.time, draft.repeatDays)}</span>
          </div>
        </section>
        <p className="text-[16px] font-bold leading-6 text-white relative z-10">
          Wake up.
          <br />
          Move.
          <br />
          Start your day.
        </p>
      </main>
    );
  }

  const ctaSubtitle =
    step === 0
      ? "Next: Choose physical wake challenge"
      : step === 1
        ? "Next: Configure sound & escalation"
        : `Your alarm will sound ${getNextOccurrence(draft.time, draft.repeatDays)}`;

  return (
    <main className="min-h-screen bg-[#07060E] text-white relative">
      <StepHeader
        stepNumber={step + 1}
        stepTag={headers[step].stepTag}
        title={headers[step].title}
        subtitle={headers[step].subtitle}
        canBack={step > 0}
        onBack={() => setStep((current) => Math.max(0, current - 1))}
        onCancel={onCancel}
      />

      {step === 0 && <WhenStep draft={draft} setDraft={setDraft} />}
      {step === 1 && (
        <WakeStep
          draft={draft}
          setDraft={setDraft}
          isExerciseLocked={isExerciseLocked}
          canUseAdaptive={canUseAdaptive}
          onOpenPremiumExercise={onOpenPremiumExercise}
          wakeUpGoal={wakeUpGoal}
          onGoalChange={onGoalChange}
        />
      )}
      {step === 2 && (
        <AlarmStep
          draft={draft}
          setDraft={setDraft}
          wakeUpGoal={wakeUpGoal}
          canUsePremiumSounds={canUsePremiumSounds}
          onOpenPaywall={onOpenPaywall}
        />
      )}

      {/* Sticky Bottom Action Bar with Safe Area */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 bg-[#07060E]/95 px-6 pb-6 pt-3 backdrop-blur-xl border-t border-white/10">
        {error && (
          <div className="mb-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2 text-center text-[12px] font-bold text-rose-400">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={step === 2 ? () => void saveAlarm() : next}
          disabled={saving}
          className="h-14 w-full rounded-full bg-[#1C1832] border border-white/15 text-[15px] font-bold tracking-[0.08em] text-white transition active:scale-[0.98] disabled:opacity-60 shadow-[0_8px_30px_rgba(0,0,0,0.7)] hover:bg-[#252042]"
          aria-label={step === 2 ? (isEditing ? "Save changes" : "Set alarm") : "Continue to next step"}
        >
          {saving
            ? "SAVING..."
            : step === 2
              ? isEditing
                ? "SAVE CHANGES"
                : "SET ALARM"
              : "CONTINUE"}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-[#A796D9]">
          {ctaSubtitle}
        </p>
      </div>
    </main>
  );
}

function BottomNav({
  screen,
  setScreen,
  onAddAlarm,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onAddAlarm: () => void;
}) {
  const items = useMemo(
    () => [
      { id: "home" as const, label: "Home", icon: Home },
      { id: "stats" as const, label: "Stats", icon: BarChart3 },
      { id: "history" as const, label: "History", icon: CalendarDays },
      { id: "settings" as const, label: "Settings", icon: Settings },
    ],
    [],
  );

  if (
    screen === "newAlarm" ||
    screen === "alarm" ||
    screen === "camera" ||
    screen === "success" ||
    screen === "failure"
  )
    return null;

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 z-30 grid h-16 w-[min(360px,calc(100%-32px))] -translate-x-1/2 grid-cols-4 rounded-full border border-white/[0.1] bg-[#121020]/90 px-2 shadow-[0_18px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-full text-[11px] font-semibold transition ${
                active ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-white/40 hover:text-white/80"
              }`}
              aria-label={item.label}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button
        onClick={onAddAlarm}
        className="fixed bottom-[92px] left-1/2 z-30 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-[#1C1832] border border-white/20 text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)] transition active:scale-[0.96] hover:bg-[#252042]"
        aria-label="Create alarm"
      >
        <Plus size={28} strokeWidth={2.4} />
      </button>
    </>
  );
}

export default function WakeUpAI() {
  const [screen, setScreen] = useState<Screen>("home");
  const [alarms, setAlarms] = useState<SavedAlarm[]>(() => loadSavedAlarms());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [ringingId, setRingingId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ChallengeResult | null>(null);
  const [workouts, setWorkouts] = useState<LocalWorkout[]>(() => loadLocalWorkouts());
  const [editingAlarm, setEditingAlarm] = useState<SavedAlarm | null>(null);
  const [isCameraTestMode, setIsCameraTestMode] = useState(false);
  const [wakeUpGoal, setWakeUpGoal] = useState<string>(() => {
    try {
      return window.localStorage.getItem("wakeup-ai-goal") ?? "";
    } catch {
      return "";
    }
  });

  const sub = useSubscription();
  const ent = useEntitlement();

  const [showSplash, setShowSplash] = useState(true);

  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("wakeup-ai-onboarding-completed") !== "true";
    } catch {
      return false;
    }
  });

  const [paywall, setPaywall] = useState<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
  }>({
    isOpen: false,
  });

  const [exerciseSheet, setExerciseSheet] = useState<{
    isOpen: boolean;
    exercise: Exercise | "adaptive_ai";
  }>({
    isOpen: false,
    exercise: "squats",
  });

  const syncTimer = useRef<number | null>(null);

  const ringingAlarm =
    alarms.find((a) => a.id === ringingId) ??
    alarms.find((a) => a.enabled) ??
    alarms[0];

  useEffect(() => {
    const attemptSync = () => void syncNow();
    attemptSync();
    window.addEventListener("online", attemptSync);
    window.addEventListener("offline", attemptSync);
    return () => {
      window.removeEventListener("online", attemptSync);
      window.removeEventListener("offline", attemptSync);
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    };
  }, []);

  // Real-time alarm scheduler watcher
  useEffect(() => {
    const checkAlarms = () => {
      if (screen === "alarm" || screen === "camera" || screen === "success" || screen === "failure") return;
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;
      const day = now.getDay();

      const matching = alarms.find((a) => {
        if (!a.enabled) return false;
        if (a.time !== timeStr) return false;
        if (a.repeatDays && a.repeatDays.length > 0 && !a.repeatDays.includes(day)) return false;
        return true;
      });

      if (matching) {
        setRingingId(matching.id);
        setScreen("alarm");
      }
    };

    const interval = window.setInterval(checkAlarms, 3000);
    return () => window.clearInterval(interval);
  }, [alarms, screen]);

  function scheduleSync() {
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null;
      void syncNow();
    }, 1500);
  }

  function commitAlarms(updated: SavedAlarm[], prev: SavedAlarm[]) {
    setAlarms(updated);
    persistAlarms(updated, prev);
    scheduleSync();
  }

  function handleToggleAlarm(id: string) {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    const enabling = !alarm.enabled;
    const currentActiveCount = alarms.filter((a) => a.enabled).length;

    // Trigger 01: Free tier allows maximum 2 active alarms (Section 15 & 18)
    if (enabling && !sub.isPlus && currentActiveCount >= 2) {
      setPaywall({
        isOpen: true,
        title: "You've reached your 2-alarm limit.",
        subtitle:
          "WakeUp AI+ gives you unlimited alarms. Upgrade to activate more alarms.",
      });
      return;
    }

    const updated = alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    commitAlarms(updated, alarms);
  }

  function handleDeleteAlarm(id: string) {
    const updated = alarms.filter((a) => a.id !== id);
    commitAlarms(updated, alarms);
  }

  function handleOpenAlarm(id: string) {
    const alarm = alarms.find((a) => a.id === id);
    if (alarm && !sub.isPlus && ent.isExerciseLocked(alarm.exercise)) {
      setPaywall({
        isOpen: true,
        title: `Unlock ${exerciseLabel(alarm)} Challenge`,
        subtitle: `WakeUp AI+ is required to ring and verify ${exerciseLabel(alarm)} with computer-vision AI.`,
      });
      return;
    }
    setRingingId(id);
    setScreen("alarm");
  }

  function handleEditAlarm(alarm: SavedAlarm) {
    setEditingAlarm(alarm);
    setScreen("newAlarm");
  }

  function handleAddAlarm() {
    const activeCount = alarms.filter((a) => a.enabled).length;
    // Trigger 01: Free tier allows maximum 2 active alarms (Section 15 & 18)
    if (!sub.isPlus && activeCount >= 2) {
      setPaywall({
        isOpen: true,
        title: "You've reached your 2-alarm limit.",
        subtitle:
          "WakeUp AI+ gives you unlimited alarms. Upgrade to create more alarms.",
      });
      return;
    }
    setEditingAlarm(null);
    setScreen("newAlarm");
  }

  function handleChallengeResult(result: ChallengeResult) {
    setLastResult(result);
    const alarm = ringingAlarm;
    if (alarm) {
      const now = new Date().toISOString();
      const isPlank = alarm.exercise === "plank";
      recordWorkout({
        alarmId: alarm.id,
        exercise: alarm.exercise,
        repetitions: isPlank ? undefined : alarm.repetitions,
        duration: isPlank ? alarm.duration : undefined,
        difficulty: alarm.difficulty,
        repsCompleted: result.repsCompleted,
        completed: result.workoutResult === "completed",
        result: result.workoutResult,
        startedAt: now,
        completedAt: now,
      });
      setWorkouts(loadLocalWorkouts());
      scheduleSync();
    }
    // Camera test mode: always return to Settings regardless of result
    if (isCameraTestMode) {
      setIsCameraTestMode(false);
      setScreen("settings");
      return;
    }
    if (result.workoutResult === "completed") {
      setScreen("success");
    } else {
      setScreen("failure");
    }
  }

  function handleGoalChange(goal: string) {
    setWakeUpGoal(goal);
    try {
      window.localStorage.setItem("wakeup-ai-goal", goal);
    } catch {
      // Storage unavailable
    }
  }

  function handleDismissAlarm() {
    // Record as skipped workout, stop ringing, go home
    const alarm = ringingAlarm;
    if (alarm) {
      const now = new Date().toISOString();
      const isPlank = alarm.exercise === "plank";
      recordWorkout({
        alarmId: alarm.id,
        exercise: alarm.exercise,
        repetitions: isPlank ? undefined : alarm.repetitions,
        duration: isPlank ? alarm.duration : undefined,
        difficulty: alarm.difficulty,
        repsCompleted: 0,
        completed: false,
        result: "skipped",
        startedAt: now,
        completedAt: now,
      });
      setWorkouts(loadLocalWorkouts());
      scheduleSync();
    }
    setRingingId(null);
    setScreen("home");
  }

  // Cinematic Splash Screen on launch — auto-advances towards Onboarding or Dashboard after 1.8s (or on tap)
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        durationMs={1800}
      />
    );
  }

  // 4-Screen Onboarding Flow on first launch
  if (isOnboardingActive) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setIsOnboardingActive(false);
          setScreen("newAlarm");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07060E] font-sans text-white relative selection:bg-[#1C1832] selection:text-white overflow-x-hidden">
      {/* Subtle Atmospheric Aura Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_75%_15%,rgba(139,92,246,0.08)_0%,transparent_60%)]" />
      <div className="fixed -bottom-24 left-1/2 h-72 w-80 -translate-x-1/2 rounded-full bg-gradient-to-t from-purple-900/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[430px]">
        {screen === "home" && (
          <HomeScreen
            openAlarm={handleOpenAlarm}
            alarms={alarms}
            onToggleAlarm={handleToggleAlarm}
            onDeleteAlarm={handleDeleteAlarm}
            onEditAlarm={handleEditAlarm}
            onOpenSettings={() => setScreen("settings")}
            onViewHistory={() => setScreen("history")}
            workouts={workouts}
            isPlus={sub.isPlus}
            onOpenPaywall={() =>
              setPaywall({
                isOpen: true,
                title: "WakeUp AI+",
                subtitle: "Unlock unlimited alarms, all exercises, and adaptive AI challenges.",
              })
            }
            wakeUpGoal={wakeUpGoal}
            onAddAlarm={handleAddAlarm}
            onReplayOnboarding={() => setIsOnboardingActive(true)}
          />
        )}
        {screen === "newAlarm" && (
          <NewAlarmFlow
            initialDraft={editingAlarm ?? alarms[0] ?? defaultDraftFrom(settings)}
            isEditing={Boolean(editingAlarm)}
            alarmId={editingAlarm?.id}
            onCancel={() => {
              setEditingAlarm(null);
              setScreen("home");
            }}
            onSave={(savedAlarm) => {
              if (editingAlarm) {
                const updated = alarms.map((a) => (a.id === editingAlarm.id ? savedAlarm : a));
                commitAlarms(updated, alarms);
              } else {
                if (!sub.isPlus && alarms.filter((a) => a.enabled).length >= 2) {
                  setPaywall({
                    isOpen: true,
                    title: "You've reached your 2-alarm limit.",
                    subtitle:
                      "WakeUp AI+ gives you unlimited alarms. Upgrade to create more alarms.",
                  });
                  return;
                }
                const updated = [savedAlarm, ...alarms];
                commitAlarms(updated, alarms);
              }
              setEditingAlarm(null);
              setScreen("home");
            }}
            isExerciseLocked={ent.isExerciseLocked}
            canUseAdaptive={ent.canUse("adaptive_ai")}
            onOpenPremiumExercise={(ex) => {
              const titles: Record<string, string> = {
                squats: "Unlock Squats AI+",
                burpees: "Unlock Burpees AI+",
                plank: "Unlock Plank Hold AI+",
                adaptive_ai: "Unlock Adaptive AI Challenge",
              };
              const subtitles: Record<string, string> = {
                squats: "Track full squat depth & knee angle lockout verified by on-device computer vision.",
                burpees: "Full-body wake-up with real-time push-up to vertical jump validation.",
                plank: "Spine alignment & hip level verification with active timer tracking.",
                adaptive_ai: "AI dynamically scales morning difficulty based on your wake-up consistency.",
              };
              setPaywall({
                isOpen: true,
                title: titles[ex] || "WakeUp AI+",
                subtitle: subtitles[ex] || "Add more ways to wake up with advanced AI challenges.",
              });
            }}
            wakeUpGoal={wakeUpGoal}
            onGoalChange={handleGoalChange}
            canUsePremiumSounds={ent.canUse("premium_sounds")}
            onOpenPaywall={(ctx) =>
              setPaywall({
                isOpen: true,
                title: ctx?.title || "Unlock Premium Sounds",
                subtitle:
                  ctx?.subtitle || "Wake up to curated acoustic & dynamic tones with WakeUp AI+",
              })
            }
          />
        )}
        {screen === "alarm" && ringingAlarm && (
          <AlarmScreen
            alarm={ringingAlarm}
            startChallenge={() => setScreen("camera")}
            onDismiss={handleDismissAlarm}
          />
        )}
        {screen === "camera" && ringingAlarm && (
          <ChallengeCamera
            exercise={ringingAlarm.exercise}
            difficulty={ringingAlarm.difficulty}
            targetReps={ringingAlarm.exercise === "plank" ? undefined : ringingAlarm.repetitions}
            targetDurationMs={
              ringingAlarm.exercise === "plank" ? ringingAlarm.duration * 1000 : undefined
            }
            debug={settings.onDeviceAI}
            onComplete={handleChallengeResult}
            onExit={() => {
              if (isCameraTestMode) {
                setIsCameraTestMode(false);
                setScreen("settings");
              } else {
                setScreen("alarm");
              }
            }}
          />
        )}
        {screen === "success" && ringingAlarm && (
          <SuccessScreen
            goHome={() => {
              setRingingId(null);
              setScreen("home");
            }}
            exercise={ringingAlarm.exercise}
            reps={
              lastResult?.repsCompleted ??
              (ringingAlarm.exercise === "plank"
                ? ringingAlarm.duration
                : ringingAlarm.repetitions)
            }
            durationMs={lastResult?.durationMs}
            streak={computeWorkoutStats(workouts).currentStreak}
            goal={wakeUpGoal}
            isPlus={sub.isPlus}
            onOpenPaywall={() =>
              setPaywall({
                isOpen: true,
                title: "WakeUp AI+",
                subtitle: "Add more ways to wake up with advanced AI challenges.",
              })
            }
          />
        )}
        {screen === "failure" && ringingAlarm && (
          <FailureScreen
            onRetry={() => setScreen("camera")}
            onExit={() => setScreen("alarm")}
            exercise={ringingAlarm.exercise}
            repsCompleted={lastResult?.repsCompleted ?? 0}
            targetReps={
              ringingAlarm.exercise === "plank"
                ? ringingAlarm.duration
                : ringingAlarm.repetitions
            }
            reason={lastResult?.reason}
            durationMs={lastResult?.durationMs}
          />
        )}
        {screen === "stats" && (
          <StatsScreen
            workouts={workouts}
            onOpenPaywall={() =>
              setPaywall({
                isOpen: true,
                title: "Unlock Advanced Insights",
                subtitle: "Deep morning trends, completion consistency, and goal correlation.",
              })
            }
          />
        )}
        {screen === "history" && (
          <HistoryScreen
            workouts={workouts}
            onResetData={() => setWorkouts(resetDefaultWorkouts())}
          />
        )}
        {screen === "settings" && (
          <SettingsScreen
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              saveSettings(next);
            }}
            onTestCamera={() => {
              setIsCameraTestMode(true);
              setScreen("camera");
            }}
            onResetData={() => setWorkouts(resetDefaultWorkouts())}
            onClearHistory={() => {
              clearLocalWorkouts();
              setWorkouts([]);
            }}
            wakeUpGoal={wakeUpGoal}
            onGoalChange={handleGoalChange}
            isPlus={sub.isPlus}
            status={sub.status}
            expirationDate={sub.expirationDate}
            onOpenPaywall={() =>
              setPaywall({
                isOpen: true,
                title: "WakeUp AI+",
                subtitle: "Wake up. Move. Become consistent.",
              })
            }
            onReplayOnboarding={() => setIsOnboardingActive(true)}
          />
        )}
      </div>

      <BottomNav screen={screen} setScreen={setScreen} onAddAlarm={handleAddAlarm} />

      {/* Main RevenueCat Paywall Modal */}
      <PaywallModal
        isOpen={paywall.isOpen}
        contextTitle={paywall.title}
        contextSubtitle={paywall.subtitle}
        onClose={() => setPaywall({ isOpen: false })}
        onSuccess={() => setPaywall({ isOpen: false })}
      />

      {/* Contextual Exercise Unlock Bottom Sheet */}
      <PremiumExerciseSheet
        isOpen={exerciseSheet.isOpen}
        exercise={exerciseSheet.exercise}
        onClose={() => setExerciseSheet({ isOpen: false, exercise: "squats" })}
        onUpgrade={() => {
          setExerciseSheet({ isOpen: false, exercise: "squats" });
          setPaywall({
            isOpen: true,
            title: "WakeUp AI+",
            subtitle: "Add more ways to wake up with advanced AI challenges.",
          });
        }}
      />
    </div>
  );
}
