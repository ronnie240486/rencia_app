import { describe, expect, it } from "vitest";
import { matchesIptvServerSearch } from "./iptvServerSearch";

const server = { personName: "Maria Silva", name: "Servidor Premium", server: "https://servidor.exemplo.com/lista" };

describe("busca da Central de Servidores IPTV", () => {
  it("encontra imediatamente por nome da pessoa, nome ou endereço do servidor", () => {
    expect(matchesIptvServerSearch(server, "maria")).toBe(true);
    expect(matchesIptvServerSearch(server, "premium")).toBe(true);
    expect(matchesIptvServerSearch(server, "exemplo.com")).toBe(true);
  });

  it("encontra por palavras separadas, mesmo em campos diferentes", () => {
    const clubEpic = { personName: "Cliente Club", name: "Epic Elite", server: "https://elite.exemplo.com" };
    expect(matchesIptvServerSearch(clubEpic, "Club Epic Elite")).toBe(true);
    expect(matchesIptvServerSearch(clubEpic, "elite club")).toBe(true);
  });

  it("não bloqueia a lista quando a busca está vazia", () => {
    expect(matchesIptvServerSearch(server, "")).toBe(true);
    expect(matchesIptvServerSearch(server, "outro servidor")).toBe(false);
  });
});
