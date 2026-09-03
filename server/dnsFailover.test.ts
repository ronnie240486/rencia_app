import { describe, expect, it } from "vitest";
import { buildDnsFailoverUrls, selectDnsProfileEntries } from "./dnsFailover";

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

  it("remove duplicidades e ignora DNS inativa", () => {
    expect(buildDnsFailoverUrls("http://dns1.test/live.m3u", [
      { host: "http://dns1.test" },
      { host: "http://dns1.test" },
      { host: "http://dns2.test", ativo: false },
    ])).toEqual(["http://dns1.test/live.m3u"]);
  });
});
