import type { Express, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { deviceUrls, devices, iptvServers, monthlyRevenueClosures, monthlyRevenueSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { buildMonthlyRevenueReport, formatMonthlyRevenueMessage, previousMonthPeriod } from "./monthlyRevenue";

async function buildOwnerReport(db: any, ownerId: number) {
  const period = previousMonthPeriod();
  const [deviceRows, serverRows, urlRows] = await Promise.all([
    db.select({ id: devices.id, nomeServer: devices.nomeServer, valor: devices.valor, status: devices.status, dataCadastro: devices.dataCadastro, dataExpiracao: devices.dataExpiracao, urlM3u8: devices.urlM3u8 }).from(devices).where(eq(devices.ownerId, ownerId)),
    db.select({ id: iptvServers.id, nome: iptvServers.name, valor: iptvServers.valor, paymentStatus: iptvServers.paymentStatus, createdAt: iptvServers.createdAt }).from(iptvServers).where(eq(iptvServers.ownerId, ownerId)),
    db.select({ deviceId: deviceUrls.deviceId, ativo: deviceUrls.ativo }).from(deviceUrls),
  ]);
  const counts = new Map<number, number>();
  for (const row of urlRows) if (row.ativo) counts.set(row.deviceId, (counts.get(row.deviceId) ?? 0) + 1);
  return { report: buildMonthlyRevenueReport(period, deviceRows.map((row: any) => ({ ...row, playlistCount: (row.urlM3u8 ? 1 : 0) + (counts.get(row.id) ?? 0) })), serverRows), period };
}

export async function closePreviousMonth(ownerId: number, db: any) {
  const { report, period } = await buildOwnerReport(db, ownerId);
  const periodStart = new Date(`${period.periodStart}T00:00:00Z`);
  const existing = (await db.select().from(monthlyRevenueClosures).where(and(eq(monthlyRevenueClosures.ownerId, ownerId), eq(monthlyRevenueClosures.periodStart, periodStart))).limit(1))[0];
  if (existing) return { report: JSON.parse(existing.summaryJson || "{}"), alreadyClosed: true };
  const whatsappMessage = formatMonthlyRevenueMessage(report);
  await db.insert(monthlyRevenueClosures).values({ ownerId, periodStart, periodEnd: new Date(`${period.periodEnd}T00:00:00Z`), revenue: report.revenue.toFixed(2), deviceRevenue: report.deviceRevenue.toFixed(2), serverRevenue: report.serverRevenue.toFixed(2), clientCount: report.clientCount, newClientCount: report.newClientCount, activeClientCount: report.activeClientCount, expiredClientCount: report.expiredClientCount, playlistCount: report.playlistCount, paidServerCount: report.paidServerCount, summaryJson: JSON.stringify(report), whatsappMessage });
  return { report, alreadyClosed: false };
}

export function registerMonthlyRevenueScheduleRoutes(app: Express) {
  app.post("/api/scheduled/monthly-revenue", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const setting = (await db.select().from(monthlyRevenueSettings).where(eq(monthlyRevenueSettings.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
      if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });
      const result = await closePreviousMonth(setting.ownerId, db);
      await db.update(monthlyRevenueSettings).set({ lastRunAt: new Date(), lastStatus: "success", lastError: null }).where(eq(monthlyRevenueSettings.id, setting.id));
      res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });
}
