import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/IptvServers.tsx"), "utf8");

describe("limpeza do histórico de servidores IPTV", () => {
  it("remove somente os alertas pertencentes à conta autenticada", () => {
    expect(routerSource).toContain("clearAlertHistory: protectedProcedure.mutation");
    expect(routerSource).toContain("db.delete(iptvServerAlertLogs).where(eq(iptvServerAlertLogs.ownerId, ctx.user.id))");
  });

  it("exige confirmação antes da limpeza no painel", () => {
    expect(pageSource).toContain("Apagar todas as mensagens do histórico de servidores?");
    expect(pageSource).toContain("Apagar mensagens");
  });
});
