import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, workoutsTable } from "@workspace/db";

const router: IRouter = Router();

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeStreaks(days: Set<string>): { current: number; best: number } {
  const sorted = [...days].sort();

  let best = 0;
  let run = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    if (index === 0) {
      run = 1;
    } else {
      const prev = new Date(`${sorted[index - 1]}T00:00:00Z`).getTime();
      const curr = new Date(`${sorted[index]}T00:00:00Z`).getTime();
      run = curr - prev === 86400000 ? run + 1 : 1;
    }
    best = Math.max(best, run);
  }

  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best };
}

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      exercise: workoutsTable.exercise,
      repetitions: workoutsTable.repetitions,
      duration: workoutsTable.duration,
      repsCompleted: workoutsTable.repsCompleted,
      completed: workoutsTable.completed,
      startedAt: workoutsTable.startedAt,
      completedAt: workoutsTable.completedAt,
    })
    .from(workoutsTable)
    .orderBy(desc(workoutsTable.startedAt));

  const totalWorkouts = rows.length;
  const completedRows = rows.filter((row) => row.completed);
  const completedCount = completedRows.length;

  const totalPushups = completedRows.reduce((sum, row) => {
    return row.exercise === "pushups" ? sum + (row.repsCompleted ?? 0) : sum;
  }, 0);

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const thisWeek = completedRows.filter(
    (row) => row.startedAt.getTime() >= sevenDaysAgo,
  ).length;

  const completionRate =
    totalWorkouts === 0
      ? 100
      : Math.round((completedCount / totalWorkouts) * 100);

  const timeSpans = completedRows.flatMap((row) => {
    if (!row.completedAt) return [];
    const millis = row.completedAt.getTime() - row.startedAt.getTime();
    return millis > 0 ? [millis / 1000] : [];
  });
  const avgTimeSec =
    timeSpans.length === 0
      ? 0
      : Math.round(timeSpans.reduce((sum, value) => sum + value, 0) / timeSpans.length);

  const activeDays = new Set(completedRows.map((row) => dayKey(row.startedAt)));
  const { current, best } = computeStreaks(activeDays);

  const movementScore = Math.min(100, Math.round((thisWeek / 7) * 100));

  res.json({
    currentStreak: current,
    bestStreak: best,
    totalWorkouts,
    totalPushups,
    thisWeek,
    completionRate,
    avgTimeSec,
    movementScore,
  });
});

export default router;