import { describe, expect, it } from "vitest";
import { appendVisualRevision, buildBackgroundResponseHeaders, buildVisualRevision } from "./apiRoutes";

describe("revisão visual do OuroPro", () => {
  it("mantém uma revisão estável para a mesma configuração visual", () => {
    expect(buildVisualRevision("/manus-storage/logo-a.webp", "/manus-storage/banner-a.webp"))
      .toBe(buildVisualRevision("/manus-storage/logo-a.webp", "/manus-storage/banner-a.webp"));
  });

  it("altera a revisão quando uma imagem do painel é substituída", () => {
    expect(buildVisualRevision("/manus-storage/logo-a.webp"))
      .not.toBe(buildVisualRevision("/manus-storage/logo-b.webp"));
  });

  it("adiciona a revisão sem alterar a URL usada pelo servidor de mídia", () => {
    expect(appendVisualRevision("https://cdn.example/logo.webp", "nova")).toBe("https://cdn.example/logo.webp#rencia-visual=nova");
  });

  it("instrui o APK e os proxies a não reutilizarem a imagem antiga", () => {
    const headers = buildBackgroundResponseHeaders("/manus-storage/background-new.webp");
    expect(headers["Cache-Control"]).toContain("no-store");
    expect(headers.Pragma).toBe("no-cache");
    expect(headers.ETag).toMatch(/^\".+\"$/);
  });
});
