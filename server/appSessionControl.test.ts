import { describe, expect, it } from "vitest";
import { evaluateApkSession, normalizeApkSessionKey } from "./appSessionControl";

describe("controle de sessões de APK", () => {
  it("aceita uma nova sessão quando o limite ainda não foi alcançado", () => {
    expect(evaluateApkSession(["sessao-tv-1"], "sessao-celular-2", 2)).toEqual({
      allowed: true,
      activeSessions: 2,
      maximum: 2,
      isExistingSession: false,
    });
  });

  it("recusa uma segunda sessão quando o limite é uma conexão", () => {
    expect(evaluateApkSession(["sessao-tv-1"], "sessao-celular-2", 1)).toEqual({
      allowed: false,
      activeSessions: 1,
      maximum: 1,
      isExistingSession: false,
    });
  });

  it("mantém autorizada a sessão que apenas renovou o heartbeat", () => {
    expect(evaluateApkSession(["sessao-tv-1"], "sessao-tv-1", 1)).toMatchObject({ allowed: true, activeSessions: 1, isExistingSession: true });
  });

  it("aceita somente uma chave de sessão segura", () => {
    expect(normalizeApkSessionKey("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    expect(normalizeApkSessionKey("<script>")).toBeNull();
  });
});
