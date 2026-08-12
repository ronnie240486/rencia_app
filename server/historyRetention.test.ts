import { describe, expect, it } from "vitest";
import { HISTORY_RETENTION_DAYS, retentionCutoff } from "./historyRetention";

describe("retenção de históricos", () => {
  it("mantém exatamente os últimos três dias de registros", () => {
    const now = new Date("2026-08-12T06:00:00.000Z");
    expect(HISTORY_RETENTION_DAYS).toBe(3);
    expect(retentionCutoff(now).toISOString()).toBe("2026-08-09T06:00:00.000Z");
  });
});
