import { describe, expect, it } from "vitest";
import { sanitizeAuditData } from "./audit";

describe("histórico auditável", () => {
  it("oculta campos de senha antes de gravar alterações", () => {
    const value = sanitizeAuditData({ nomeServer: "Cliente", senha: "segredo", passwordHash: "hash" });
    expect(value).toContain("Cliente");
    expect(value).toContain("[oculto]");
    expect(value).not.toContain("segredo");
    expect(value).not.toContain("hash");
  });
});
