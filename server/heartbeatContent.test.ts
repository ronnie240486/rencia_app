import { describe, expect, it } from "vitest";
import { HEARTBEAT_IDLE_SENTINEL, isHeartbeatIdleSignal, normalizeHeartbeatContent, readHeartbeatContent } from "./heartbeatContent";

describe("heartbeat de conteúdo assistido", () => {
  it("mantém o último conteúdo quando o APK envia apenas um heartbeat vazio", () => {
    expect(normalizeHeartbeatContent("")).toBeUndefined();
    expect(normalizeHeartbeatContent("   ")).toBeUndefined();
    expect(normalizeHeartbeatContent(undefined)).toBeUndefined();
  });

  it("aceita e limita o conteúdo informado pelo APK", () => {
    expect(normalizeHeartbeatContent("  Filme de teste  ")).toBe("Filme de teste");
    expect(normalizeHeartbeatContent("x".repeat(600))).toHaveLength(500);
  });

  it("aceita os campos usados pelos APKs para manter o episódio no painel", () => {
    expect(readHeartbeatContent({ content: " Episódio 3 " })).toBe("Episódio 3");
    expect(readHeartbeatContent({ current_content: "Episódio 4" })).toBe("Episódio 4");
    expect(readHeartbeatContent({ currentContent: "Episódio 5" })).toBe("Episódio 5");
  });

  it("só reconhece a sentinela de 'parei de assistir', não qualquer valor vazio", () => {
    expect(isHeartbeatIdleSignal(HEARTBEAT_IDLE_SENTINEL)).toBe(true);
    expect(isHeartbeatIdleSignal("__IDLE__")).toBe(true);
    expect(isHeartbeatIdleSignal("  __idle__  ")).toBe(true);
    expect(isHeartbeatIdleSignal("")).toBe(false);
    expect(isHeartbeatIdleSignal(undefined)).toBe(false);
    expect(isHeartbeatIdleSignal("Globo TV Verdes")).toBe(false);
  });
});
