import { describe, expect, it } from "vitest";
import { createStoreInviteToken, filterDownloadsForInvite, hashStoreInviteToken, normalizeStoreInviteApps, serializeStoreInviteApps } from "./storeInvites";

describe("convites privados da loja", () => {
  it("gera token opaco e hash determinístico", () => {
    const token = createStoreInviteToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashStoreInviteToken(token)).toBe(hashStoreInviteToken(token));
  });

  it("mantém somente os aplicativos válidos e sem duplicação", () => {
    expect(normalizeStoreInviteApps(["future", "future", "ouropro", "invalido"])).toEqual(["future", "ouropro"]);
    expect(serializeStoreInviteApps('["maximus","erro"]')).toBe('["maximus"]');
  });

  it("não expõe aplicativos fora da seleção do convite", () => {
    const catalog = [{ slug: "ouropro" }, { slug: "future" }, { slug: "maximus" }];
    expect(filterDownloadsForInvite(catalog, ["future", "ouropro"])).toEqual([{ slug: "ouropro" }, { slug: "future" }]);
  });
});
