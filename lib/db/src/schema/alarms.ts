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

export const repeatTypeEnum = pgEnum("repeat_type", [
  "once",
  "daily",
  "weekdays",
  "weekends",
  "custom",
]);

export const exerciseEnum = pgEnum("exercise", [
  "pushups",
  "squats",
  "burpees",
  "plank",
]);

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const alarmsTable = pgTable("alarms", {
  id: uuid("id").defaultRandom().primaryKey(),
  time: text("time").notNull(),
  repeatType: repeatTypeEnum("repeat_type").notNull().default("once"),
  repeatDays: integer("repeat_days").array().notNull().default([]),
  exercise: exerciseEnum("exercise").notNull().default("pushups"),
  repetitions: integer("repetitions").notNull().default(10),
  duration: integer("duration").notNull().default(30),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  sound: text("sound").notNull().default("Wake Up"),
  volume: integer("volume").notNull().default(70),
  vibration: boolean("vibration").notNull().default(true),
  gradualVolume: boolean("gradual_volume").notNull().default(true),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const insertAlarmSchema = createInsertSchema(alarmsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectAlarmSchema = createSelectSchema(alarmsTable);

export type NewAlarm = z.infer<typeof insertAlarmSchema>;
export type Alarm = typeof alarmsTable.$inferSelect;