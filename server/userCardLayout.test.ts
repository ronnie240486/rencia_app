import { describe, expect, it } from "vitest";
import { getAvailableAppsGridClass } from "../client/src/lib/userCardLayout";

describe("grade de aplicativos no card móvel do usuário", () => {
  it("mantém um aplicativo em largura inteira e distribui vários em duas colunas", () => {
    expect(getAvailableAppsGridClass(1)).toBe("grid grid-cols-1 gap-1.5");
    expect(getAvailableAppsGridClass(2)).toBe("grid grid-cols-2 gap-1.5");
    expect(getAvailableAppsGridClass(6)).toBe("grid grid-cols-2 gap-1.5");
  });
});
