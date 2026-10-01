import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { alarmsTable, difficultyEnum, exerciseEnum } from "./alarms";

export const workoutResultEnum = pgEnum("workout_result", [
  "completed",
  "restarted",
  "skipped",
  "failed",
]);

export const workoutsTable = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  alarmId: uuid("alarm_id").references(() => alarmsTable.id, {
    onDelete: "set null",
  }),
  exercise: exerciseEnum("exercise").notNull(),
  repetitions: integer("repetitions"),
  duration: integer("duration"),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  repsCompleted: integer("reps_completed").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  result: workoutResultEnum("result").notNull().default("completed"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
});

export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({
  id: true,
  startedAt: true,
});

export const selectWorkoutSchema = createSelectSchema(workoutsTable);

export type NewWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workoutsTable.$inferSelect;