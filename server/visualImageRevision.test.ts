import { describe, expect, it } from "vitest";
import { appendVisualRevision, buildVisualRevision } from "./apiRoutes";

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
});
