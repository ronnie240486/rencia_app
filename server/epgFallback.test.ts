import { describe, expect, it } from "vitest";
import { resolveEpgUrl } from "./epgFallback";

describe("fallback universal de EPG", () => {
  it("prioriza o EPG próprio do cadastro", () => {
    expect(resolveEpgUrl(" https://custom.example/epg.xml ", "https://iptv-epg.org/files/epg-br.xml")).toEqual({
      url: "https://custom.example/epg.xml",
      source: "device",
    });
  });

  it("usa o EPG padrão quando o cadastro não possui EPG", () => {
    expect(resolveEpgUrl(null, " https://iptv-epg.org/files/epg-br.xml ")).toEqual({
      url: "https://iptv-epg.org/files/epg-br.xml",
      source: "default",
    });
  });

  it("informa indisponibilidade quando nenhum EPG existe", () => {
    expect(resolveEpgUrl("", undefined)).toEqual({ url: "", source: "none" });
  });
});
