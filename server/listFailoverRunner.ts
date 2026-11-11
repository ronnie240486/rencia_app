import { eq, lt, sql } from "drizzle-orm";
import { listFailoverEvents, listFailoverSettings, listHealthChecks } from "../drizzle/schema";
import { getDb } from "./db";
import { recordFailoverRun, runListFailoverSweep } from "./listFailover";

const TICK_MS = 60_000;
let started = false;
let running = false;

/** Roda uma rodada para cada dono com o monitoramento ligado e já na hora de rodar. */
export async function runDueListFailoverSweeps(now = Date.now()) {
  if (running) return { owners: 0, skipped: true };
  running = true;
  let owners = 0;
  try {
    const db = await getDb();
    if (!db) return { owners: 0, skipped: true };
    const settings = await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.enabled, true));
    for (const setting of settings) {
      const intervalMs = Math.max(1, setting.intervalMinutes ?? 1) * 60_000;
      const lastRun = setting.lastRunAt ? new Date(setting.lastRunAt).getTime() : 0;
      // Folga de 5s pra não pular uma rodada por causa de milissegundos.
      if (lastRun && now - lastRun < intervalMs - 5_000) continue;
      try {
        const result = await runListFailoverSweep(db, setting.ownerId);
        await recordFailoverRun(db, setting.id, result ?? { checked: 0, switched: 0 });
        owners += 1;
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 480);
        console.error("[list-failover] erro na varredura automática:", message);
        await db.update(listFailoverSettings).set({ lastRunAt: new Date(), lastStatus: "error", lastError: message }).where(eq(listFailoverSettings.id, setting.id));
      }
    }
    return { owners, skipped: false };
  } finally {
    running = false;
  }
}

let lastPruneAt = 0;

/**
 * Limpeza automática (1x por hora): o histórico de testes de lista crescia sem parar porque a rotina de
 * retenção dependia de um agendador externo. Mantém 3 dias de testes e 30 dias do histórico de trocas.
 * Apaga em lotes pequenos para não travar o banco.
 */
export async function pruneOperationalHistory(now = Date.now()) {
  if (now - lastPruneAt < 60 * 60_000) return;
  lastPruneAt = now;
  const db = await getDb();
  if (!db) return;
  try {
    const checksCutoff = new Date(now - 3 * 24 * 60 * 60_000);
    for (let i = 0; i < 20; i += 1) {
      const result: any = await db.delete(listHealthChecks).where(lt(listHealthChecks.checkedAt, checksCutoff)).limit(5000);
      const affected = Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0);
      if (affected < 5000) break;
    }
    await db.delete(listFailoverEvents).where(lt(listFailoverEvents.createdAt, new Date(now - 30 * 24 * 60 * 60_000)));
  } catch (error) {
    console.error("[list-failover] limpeza do histórico falhou:", error);
  }
}

/**
 * Monitoramento automático de listas/DNS dentro do próprio servidor. Antes ele dependia de um agendador
 * externo (Manus) que não existe no Railway; sem isso a troca de DNS/lista só acontecia quando o app
 * avisava uma falha de reprodução. Desligue com DISABLE_LIST_FAILOVER_RUNNER=1.
 */
export function startListFailoverRunner() {
  if (started || process.env.DISABLE_LIST_FAILOVER_RUNNER === "1" || process.env.NODE_ENV === "test") return;
  started = true;
  const timer = setInterval(() => {
    runDueListFailoverSweeps().catch((error) => console.error("[list-failover] tick falhou:", error));
    pruneOperationalHistory().catch(() => undefined);
  }, TICK_MS);
  timer.unref?.();
  console.log("[list-failover] monitoramento automático ativo (checa a cada minuto os donos com o monitoramento ligado).");
}
