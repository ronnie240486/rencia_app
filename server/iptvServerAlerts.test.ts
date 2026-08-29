import { describe, expect, it } from "vitest";
import { buildIptvServerAlertMessage, buildIptvServerWhatsAppUrl, daysUntilServerExpiration, normalizeIptvServerWhatsAppPhone, shouldAlertIptvServer } from "./iptvServerAlerts";
import { runIptvServerAlertSweep } from "./iptvServerAlertService";
import { iptvServerAlertLogs, iptvServers } from "../drizzle/schema";

const now = new Date("2026-08-29T12:00:00.000Z");

describe("alertas de vencimento de servidores IPTV", () => {
  it("identifica vencimentos próximos sem usar dados de clientes", () => {
    expect(daysUntilServerExpiration("2026-09-01", now)).toBe(3);
    expect(shouldAlertIptvServer({ id: 1, name: "Servidor Principal", server: "https://servidor.exemplo", expiresAt: "2026-09-01", reminderDays: 3, isActive: true }, now)).toBe(true);
    expect(shouldAlertIptvServer({ id: 1, name: "Servidor Principal", server: "https://servidor.exemplo", expiresAt: "2026-09-03", reminderDays: 3, isActive: true }, now)).toBe(false);
  });

  it("gera uma mensagem pronta e um link de WhatsApp seguro", () => {
    const message = buildIptvServerAlertMessage({ personName: "Ana", name: "Servidor Principal", server: "https://servidor.exemplo", expiresAt: "2026-08-30" }, now);
    expect(message).toContain("Olá, Ana!");
    expect(message).toContain("30/08/2026");
    expect(message).toContain("fale conosco para renovar");
    expect(message).not.toContain("Servidor Principal");
    expect(message).not.toContain("servidor.exemplo");
    expect(normalizeIptvServerWhatsAppPhone("(11) 99999-1234")).toBe("5511999991234");
    expect(buildIptvServerWhatsAppUrl("(11) 99999-1234", message)).toContain("https://wa.me/5511999991234?text=");
    expect(buildIptvServerWhatsAppUrl("123", message)).toBeNull();
  });

  it("cria alerta no painel e histórico apenas uma vez no mesmo dia", async () => {
    const server = { id: 9, ownerId: 7, name: "Servidor Principal", server: "https://servidor.exemplo", expiresAt: new Date("2026-08-30T00:00:00.000Z"), reminderDays: 3, isActive: true };
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    let hasPanelLog = false;
    const db = {
      select: () => ({ from: (table: unknown) => ({ where: () => {
        const value = table === iptvServers ? [server] : (hasPanelLog ? [{ id: 1 }] : []);
        return { limit: async () => value, then: (resolve: (data: unknown) => unknown) => Promise.resolve(value).then(resolve) };
      } }) }),
      insert: (table: unknown) => ({ values: async (value: unknown) => { inserted.push({ table, value }); if (table === iptvServerAlertLogs) hasPanelLog = true; } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };

    await expect(runIptvServerAlertSweep(db, 7, now)).resolves.toEqual({ checked: 1, created: 1 });
    await expect(runIptvServerAlertSweep(db, 7, now)).resolves.toEqual({ checked: 1, created: 0 });
    expect(inserted).toHaveLength(2);
  });
});
