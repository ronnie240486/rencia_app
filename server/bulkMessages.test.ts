import { describe, expect, it } from "vitest";
import { buildBulkMessageRecipients, normalizeBulkMessageDnsHost } from "./bulkMessages";

const now = new Date("2026-08-27T12:00:00");
const devices = [
  { id: 1, nomeServer: "Cliente Ouro", mac: "AA:BB:CC:DD:EE:FF", app: "OuroPro", telefone: "(11) 99999-1111", urlM3u8: "https://ouro.example/get.php", dataExpiracao: new Date("2026-09-01") },
  { id: 2, nomeServer: "Cliente Fusion", mac: "11:22:33:44:55:66", app: "Fusion", telefone: "(11) 98888-2222", urlM3u8: "https://fusion.example/lista", dataExpiracao: new Date("2026-10-10") },
  { id: 3, nomeServer: "Sem telefone", mac: "22:33:44:55:66:77", app: "OuroPro", telefone: null, urlM3u8: "https://ouro.example/outro", dataExpiracao: new Date("2026-09-01") },
];

describe("mensagens em massa por grupo", () => {
  it("normaliza o servidor para o filtro de DNS", () => {
    expect(normalizeBulkMessageDnsHost("https://OURO.example/get.php?x=1")).toBe("https://ouro.example");
  });

  it("filtra por aplicativo e vencimento sem incluir clientes sem telefone", () => {
    const recipients = buildBulkMessageRecipients(devices, { app: "OuroPro", expirationRange: "7" }, "Olá {nome}, vence em {dias} dia(s).", now);
    expect(recipients).toHaveLength(1);
    expect(recipients[0]).toMatchObject({ id: 1, nome: "Cliente Ouro" });
    expect(recipients[0]?.waUrl).toContain("wa.me/11999991111");
    expect(decodeURIComponent(recipients[0]?.waUrl ?? "")).toContain("vence em 5 dia(s)");
  });

  it("filtra por servidor sem alterar nenhum cadastro", () => {
    const recipients = buildBulkMessageRecipients(devices, { dnsHost: "https://fusion.example" }, "Olá {app}", now);
    expect(recipients.map((recipient) => recipient.id)).toEqual([2]);
  });
});
