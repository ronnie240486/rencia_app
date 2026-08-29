import { and, eq } from "drizzle-orm";
import { internalAlerts, iptvServerAlertLogs, iptvServerAlertSettings, iptvServers } from "../drizzle/schema";
import { buildIptvServerAlertMessage, shouldAlertIptvServer } from "./iptvServerAlerts";

function dateOnly(now: Date) {
  return now.toISOString().slice(0, 10);
}

/** Cria somente um alerta interno por servidor a cada dia, mesmo quando o agendamento tentar novamente. */
export async function runIptvServerAlertSweep(db: any, ownerId: number, now = new Date()) {
  const servers = await db.select().from(iptvServers).where(and(eq(iptvServers.ownerId, ownerId), eq(iptvServers.isActive, true)));
  const alertDate = new Date(`${dateOnly(now)}T00:00:00.000Z`);
  let created = 0;

  for (const server of servers) {
    if (!shouldAlertIptvServer(server, now)) continue;
    const existing = (await db.select({ id: iptvServerAlertLogs.id }).from(iptvServerAlertLogs).where(and(
      eq(iptvServerAlertLogs.serverId, server.id),
      eq(iptvServerAlertLogs.alertDate, alertDate),
      eq(iptvServerAlertLogs.channel, "panel"),
    )).limit(1))[0];
    if (existing) continue;

    const message = buildIptvServerAlertMessage(server, now);
    await db.insert(iptvServerAlertLogs).values({ serverId: server.id, ownerId, alertDate, channel: "panel", message });
    await db.insert(internalAlerts).values({
      ownerId,
      targetUserId: ownerId,
      type: "warning",
      title: `Vencimento de servidor: ${server.name}`,
      content: message,
    });
    created += 1;
  }

  await db.update(iptvServerAlertSettings).set({ lastRunAt: now }).where(eq(iptvServerAlertSettings.ownerId, ownerId));
  return { checked: servers.length, created };
}
