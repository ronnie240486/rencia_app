import { describe, expect, it } from "vitest";
import { buildDnsFailoverUrls, orderDnsFailoverEntries, pickWorkingDns, replaceDnsHost, sanitizeUrlForProbe, selectDnsProfileEntries } from "./dnsFailover";

describe("failover de DNS por perfil", () => {
  it("preserva o caminho e os parâmetros da M3U em cada host alternativo", () => {
    expect(buildDnsFailoverUrls("http://dns1.club.test:8080/get.php?username=u&password=p", [
      { host: "http://dns1.club.test:8080" },
      { host: "http://dns2.club.test:8080" },
    ])).toEqual([
      "http://dns1.club.test:8080/get.php?username=u&password=p",
      "http://dns2.club.test:8080/get.php?username=u&password=p",
    ]);
  });

  it("seleciona somente o perfil correspondente à M3U principal", () => {
    expect(selectDnsProfileEntries("http://dns2.club.test/get.php?u=x", [
      { host: "http://dns1.club.test", grupo: "Club" },
      { host: "http://dns2.club.test", grupo: "Club" },
      { host: "http://dns1.onix.test", grupo: "Onix" },
    ])).toEqual([
      { host: "http://dns1.club.test", grupo: "Club" },
      { host: "http://dns2.club.test", grupo: "Club" },
    ]);
  });

  it("testa o mesmo caminho da M3U sem enviar usuário e senha ao monitor", () => {
    expect(sanitizeUrlForProbe("https://user:pass@dns1.club.test/get.php?username=u&password=p")).toBe("https://dns1.club.test/get.php?username=u&password=p");
  });

  it("prioriza o perfil salvo mesmo quando o domínio da M3U é um alias", () => {
    expect(selectDnsProfileEntries("http://w.s/get.php?username=u&password=p", [
      { host: "http://w.ddn", grupo: "Club", ativo: false },
      { host: "https://gratis.sytes.net", grupo: "Club", ativo: true },
      { host: "https://onixspeed.shop", grupo: "Onix", ativo: true },
    ], "Club").map((entry) => entry.grupo)).toEqual(["Club", "Club"]);
  });

  it("troca somente o host e preserva caminho, query e credenciais da M3U", () => {
    expect(replaceDnsHost("http://user:pass@dns1.club.test:8080/get.php?username=u&password=p&type=m3u_plus", "https://dns2.club.test:8443")).toBe("https://user:pass@dns2.club.test:8443/get.php?username=u&password=p&type=m3u_plus");
  });

  it("escolhe a primeira DNS funcional sem mudar de playlist", () => {
    expect(pickWorkingDns([
      { host: "http://dns1.club.test", status: "error" },
      { host: "http://dns2.club.test", status: "success" },
      { host: "http://dns3.club.test", status: "success" },
    ])).toBe("http://dns2.club.test");
    expect(pickWorkingDns([
      { host: "http://dns1.club.test", status: "error" },
      { host: "http://dns2.club.test", status: "pending" },
    ])).toBeNull();
  });

  it("testa a próxima DNS na ordem do perfil antes de voltar à principal", () => {
    expect(orderDnsFailoverEntries("http://dns1.club.test/get.php", [
      { host: "http://dns1.club.test", ativo: true },
      { host: "http://dns2.club.test", ativo: true },
      { host: "http://dns3.club.test", ativo: true },
    ]).map((entry) => entry.host)).toEqual([
      "http://dns2.club.test",
      "http://dns3.club.test",
    ]);
  });

  it("remove duplicidades e ignora DNS inativa", () => {
    expect(buildDnsFailoverUrls("http://dns1.test/live.m3u", [
      { host: "http://dns1.test" },
      { host: "http://dns1.test" },
      { host: "http://dns2.test", ativo: false },
    ])).toEqual(["http://dns1.test/live.m3u"]);
  });
});
