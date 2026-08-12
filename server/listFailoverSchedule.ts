import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { listFailoverSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { recordFailoverRun, runListFailoverSweep } from "./listFailover";
import { sdk } from "./_core/sdk";

export function registerListFailoverScheduleRoutes(app: Express) {
  app.post("/api/scheduled/list-failover", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const setting = (await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
      if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });
      const result = await runListFailoverSweep(db, setting.ownerId);
      await recordFailoverRun(db, setting.id, result);
      res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });
}
