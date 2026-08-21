import { describe, expect, it } from "vitest";
import { canAccessResellerPortal, chooseResellerPortalAccount } from "./resellerPortal";

describe("portal isolado de revendas", () => {
  it("permite somente uma conta ativa subordinada ao proprietário", () => {
    expect(canAccessResellerPortal({ id: 2, resellerId: 1, isActive: true, isOwner: false })).toBe(true);
    expect(canAccessResellerPortal({ id: 1, resellerId: null, isActive: true, isOwner: true })).toBe(false);
    expect(canAccessResellerPortal({ id: 3, resellerId: 1, isActive: false, isOwner: false })).toBe(false);
  });

  it("ignora conta legada bloqueada com o mesmo e-mail", () => {
    const selected = chooseResellerPortalAccount([
      { id: 10, resellerId: null, isActive: false, isOwner: false },
      { id: 11, resellerId: 1, isActive: true, isOwner: false },
    ]);
    expect(selected?.id).toBe(11);
  });
});
