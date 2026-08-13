import { describe, expect, it } from "vitest";
import { normalizeHeartbeatContent } from "./heartbeatContent";

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
});
