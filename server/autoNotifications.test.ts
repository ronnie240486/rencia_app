import { describe, expect, it } from "vitest";
import { buildPanelExpirationNotice, getStaleExpirationNoticeIds, isExpirationNoticeDue } from "./autoNotifications";

describe("buildPanelExpirationNotice", () => {
  const reference = new Date("2026-08-15T12:00:00Z");

  it("cria aviso para cliente que vence amanhã", () => {
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente A", dataExpiracao: "2026-08-16", status: "Liberado" }, reference)).toMatchObject({
      title: "Aviso de Vencimento",
      reason: "expires-tomorrow",
    });
  });

  it("cria aviso para vencimento hoje e acesso vencido", () => {
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente B", dataExpiracao: "2026-08-15", status: "Liberado" }, reference)?.reason).toBe("expires-today");
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente C", dataExpiracao: "2026-08-14", status: "Expirado" }, reference)?.reason).toBe("expired");
  });

  it("cria o aviso inicial para vencimentos nos próximos sete dias", () => {
    const notice = buildPanelExpirationNotice({ nomeServer: "Cliente D", dataExpiracao: "2026-08-19", status: "Liberado" }, reference);
    expect(notice).toMatchObject({
      title: "Vencimento Próximo",
      content: "Cliente D vence em 4 dias (19/08/2026).",
      reason: "expires-soon",
    });
    expect(isExpirationNoticeDue("2026-08-19", reference)).toBe(true);
    expect(isExpirationNoticeDue("2026-08-23", reference)).toBe(false);
  });

  it("arquiva somente avisos de datas antigas quando a renovação cria um novo vencimento", () => {
    const active = [
      { id: 10, titulo: "Aviso de Vencimento", conteudo: "Cliente A vence amanhã (13/08/2026)." },
      { id: 11, titulo: "Aviso de Vencimento", conteudo: "Cliente A vence amanhã (16/08/2026)." },
    ];
    const current = { title: "Aviso de Vencimento", content: "Cliente A vence amanhã (16/08/2026)." };

    expect(getStaleExpirationNoticeIds(active, current)).toEqual([10]);
    expect(getStaleExpirationNoticeIds(active, null)).toEqual([10, 11]);
  });
});
