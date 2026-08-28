import { describe, expect, it } from "vitest";
import { normalizeHeartbeatContent, readHeartbeatContent } from "./heartbeatContent";

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
});
