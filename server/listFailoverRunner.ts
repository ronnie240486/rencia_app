import { eq } from "drizzle-orm";
import { listFailoverSettings } from "../drizzle/schema";
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
  }, TICK_MS);
  timer.unref?.();
  console.log("[list-failover] monitoramento automático ativo (checa a cada minuto os donos com o monitoramento ligado).");
}
