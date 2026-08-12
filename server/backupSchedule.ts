import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { autoBackupSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { createBackupSnapshot } from "./backupService";
import { sdk } from "./_core/sdk";

export function registerBackupScheduleRoutes(app: Express) {
  app.post("/api/scheduled/automatic-backup", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const setting = (await db.select().from(autoBackupSettings)
        .where(eq(autoBackupSettings.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
      if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });
      const result = await createBackupSnapshot(setting.ownerId, "automatic");
      res.json({ ok: true, snapshotId: result.snapshot?.id ?? null, alreadyExists: result.alreadyExists });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });
}
