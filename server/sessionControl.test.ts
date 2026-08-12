import { describe, expect, it } from "vitest";
import { buildSessionOverview } from "./sessionControl";

describe("controle de sessões", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  it("marca MAC repetido e ativo como sessão suspeita", () => {
    const result = buildSessionOverview([
      { id: 1, mac: "AA:BB", nomeServer: "TV", app: "OuroPro", status: "Liberado", lastSeen: new Date("2026-08-12T11:50:00Z"), currentContent: null },
      { id: 2, mac: "aa:bb", nomeServer: "Celular", app: "OuroPro", status: "Liberado", lastSeen: new Date("2026-08-12T11:55:00Z"), currentContent: null },
    ], now);
    expect(result.every((item) => item.risk === "suspicious" && item.repeatedMacCount === 2)).toBe(true);
  });

  it("mantém sessão antiga como inativa", () => {
    const [result] = buildSessionOverview([
      { id: 1, mac: "CC:DD", nomeServer: "TV", app: null, status: "Liberado", lastSeen: new Date("2026-08-12T10:00:00Z"), currentContent: null },
    ], now);
    expect(result.risk).toBe("inactive");
  });
});
