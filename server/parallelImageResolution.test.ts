import { describe, expect, it, vi } from "vitest";
import { resolveOptionalImagesInParallel } from "./parallelImageResolution";

describe("resolveOptionalImagesInParallel", () => {
  it("inicia todas as resoluções preenchidas antes de esperar pela resposta", async () => {
    const resolver = vi.fn(async (source: string) => `public:${source}`);

    const resolution = resolveOptionalImagesInParallel(["logo.png", "", "banner.png"], resolver);

    expect(resolver).toHaveBeenCalledTimes(2);
    expect(resolver).toHaveBeenNthCalledWith(1, "logo.png");
    expect(resolver).toHaveBeenNthCalledWith(2, "banner.png");
    await expect(resolution).resolves.toEqual(["public:logo.png", "", "public:banner.png"]);
  });
});
