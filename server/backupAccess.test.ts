import { describe, expect, it } from "vitest";
import { canRestoreCompleteBackup } from "./backupAccess";

describe("acesso à restauração completa", () => {
  it("permite o backup somente para a conta proprietária administradora", () => {
    expect(canRestoreCompleteBackup({ isOwner: true, role: "admin" })).toBe(true);
  });

  it("impede que uma revenda restaure os dados completos do proprietário", () => {
    expect(canRestoreCompleteBackup({ isOwner: false, role: "user" })).toBe(false);
  });
});
