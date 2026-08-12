import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { historyRetentionSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { cleanupOldOperationalHistory } from "./historyRetention";
import { sdk } from "./_core/sdk";

export function registerHistoryRetentionScheduleRoutes(app: Express) {
  app.post("/api/scheduled/history-retention", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const setting = (await db.select().from(historyRetentionSettings).where(eq(historyRetentionSettings.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
      if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });
      const result = await cleanupOldOperationalHistory(setting.ownerId);
      res.json({ ok: true, cutoff: result.cutoff, counts: result.counts });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });
}
