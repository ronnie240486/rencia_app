import { describe, expect, it } from "vitest";
import { chooseLocalLoginAccount } from "./loginSelection";

describe("chooseLocalLoginAccount", () => {
  it("prioriza a conta de revenda gerenciada diante de uma conta legada com o mesmo e-mail", () => {
    const account = chooseLocalLoginAccount([
      { id: 25770162, resellerId: null },
      { id: 25770168, resellerId: 22560001 },
    ]);

    expect(account?.id).toBe(25770168);
  });

  it("usa a conta mais recente quando as contas têm o mesmo tipo", () => {
    const account = chooseLocalLoginAccount([
      { id: 15, resellerId: null },
      { id: 27, resellerId: null },
    ]);

    expect(account?.id).toBe(27);
  });
});
