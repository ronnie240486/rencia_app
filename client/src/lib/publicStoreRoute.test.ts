import { describe, expect, it } from "vitest";
import { resolveRequestedDownloadSlug } from "./publicStoreRoute";

describe("resolveRequestedDownloadSlug", () => {
  const shortSlugs = { "/o": "ouropro", "/f": "future" };

  it("não usa o token do convite como filtro de aplicativo", () => {
    expect(resolveRequestedDownloadSlug("/convite/token-privado", shortSlugs)).toBe("");
  });

  it("preserva rotas curtas e rotas individuais de download", () => {
    expect(resolveRequestedDownloadSlug("/o", shortSlugs)).toBe("ouropro");
    expect(resolveRequestedDownloadSlug("/d/future", shortSlugs)).toBe("future");
  });
});
