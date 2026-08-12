import { describe, expect, it } from "vitest";
import { AUTO_BACKUP_CRON, backupRunKey, snapshotIdsToRemove } from "./backupService";

describe("backup automático", () => {
  it("usa 03:00 de Brasília na rotina diária", () => {
    expect(AUTO_BACKUP_CRON).toBe("0 0 6 * * *");
  });

  it("gera uma chave diária idempotente e mantém os 30 backups recentes", () => {
    expect(backupRunKey(new Date("2026-08-12T06:00:00.000Z"))).toBe("2026-08-12");
    expect(snapshotIdsToRemove(Array.from({ length: 32 }, (_, index) => index + 1))).toEqual([31, 32]);
  });
});
