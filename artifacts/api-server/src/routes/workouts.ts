import { Router, type IRouter, type Response } from "express";
import { desc } from "drizzle-orm";
import { db, workoutsTable } from "@workspace/db";
import { CreateWorkoutBody, type Workout } from "@workspace/api-zod";

const router: IRouter = Router();

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(workoutsTable)
    .orderBy(desc(workoutsTable.startedAt));
  res.json(rows as Workout[]);
});

router.post("/", async (req, res) => {
  const parsed = CreateWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid workout payload");
    return;
  }

  const values = {
    ...parsed.data,
    completedAt: parsed.data.completedAt ?? new Date(),
  };
  const [row] = await db.insert(workoutsTable).values(values).returning();
  res.status(201).json(row as Workout);
});

export default router;