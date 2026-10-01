import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, alarmsTable } from "@workspace/db";
import {
  CreateAlarmBody,
  UpdateAlarmBody,
  GetAlarmParams,
  UpdateAlarmParams,
  DeleteAlarmParams,
  ListAlarmsQueryParams,
  type Alarm,
} from "@workspace/api-zod";

const router: IRouter = Router();

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}

router.get("/", async (req, res) => {
  const query = ListAlarmsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, query.error.issues[0]?.message ?? "Invalid query parameters");
    return;
  }

  const rows = query.data.enabled === undefined
    ? await db.select().from(alarmsTable).orderBy(alarmsTable.time)
    : await db
        .select()
        .from(alarmsTable)
        .where(eq(alarmsTable.enabled, query.data.enabled))
        .orderBy(alarmsTable.time);

  res.json(rows as Alarm[]);
});

router.post("/", async (req, res) => {
  const parsed = CreateAlarmBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid alarm payload");
    return;
  }

  const [row] = await db.insert(alarmsTable).values(parsed.data).returning();
  res.status(201).json(row as Alarm);
});

router.get("/:id", async (req, res) => {
  const params = GetAlarmParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.issues[0]?.message ?? "Invalid alarm id");
    return;
  }

  const [row] = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.id, params.data.id));

  if (!row) {
    sendError(res, 404, "Alarm not found");
    return;
  }

  res.json(row as Alarm);
});

router.patch("/:id", async (req, res) => {
  const params = UpdateAlarmParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.issues[0]?.message ?? "Invalid alarm id");
    return;
  }

  const body = UpdateAlarmBody.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, body.error.issues[0]?.message ?? "Invalid alarm payload");
    return;
  }

  const [row] = await db
    .update(alarmsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(alarmsTable.id, params.data.id))
    .returning();

  if (!row) {
    sendError(res, 404, "Alarm not found");
    return;
  }

  res.json(row as Alarm);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteAlarmParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.issues[0]?.message ?? "Invalid alarm id");
    return;
  }

  await db.delete(alarmsTable).where(eq(alarmsTable.id, params.data.id));
  res.status(204).end();
});

export default router;