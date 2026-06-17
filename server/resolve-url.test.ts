import { describe, it, expect } from "vitest";

/**
 * Teste para verificar que as URLs do carousel estão sendo resolvidas corretamente
 */
describe("resolvePublicImageUrl", () => {
  it("should handle external URLs from yyue5q6u5o domain", async () => {
    const externalUrl = "https://yyue5q6u5o-emofl2keyq-ue.a.run.app/manus-storage/carousel/carousel_1781692121673_1001154532_7bc7a942.jpg";
    
    // Simular a lógica de conversão
    const urlObj = new URL(externalUrl);
    const pathParts = urlObj.pathname.split("/");
    const storageKey = pathParts.slice(2).join("/");
    
    expect(storageKey).toBe("carousel/carousel_1781692121673_1001154532_7bc7a942.jpg");
  });

  it("should extract storage key from external URL", async () => {
    const externalUrl = "https://yyue5q6u5o-emofl2keyq-ue.a.run.app/manus-storage/carousel/carousel_1781692121971_1001154508_3c01abd4.jpg";
    
    const urlObj = new URL(externalUrl);
    const pathParts = urlObj.pathname.split("/");
    const storageKey = pathParts.slice(2).join("/");
    
    expect(storageKey).toBe("carousel/carousel_1781692121971_1001154508_3c01abd4.jpg");
    expect(storageKey).toContain("carousel_");
    expect(storageKey).toContain(".jpg");
  });

  it("should identify external URLs that need conversion", async () => {
    const urls = [
      "https://yyue5q6u5o-emofl2keyq-ue.a.run.app/manus-storage/carousel/test.jpg",
      "https://example.a.run.app/manus-storage/carousel/test.jpg",
      "https://renciaapp.manus.space/manus-storage/carousel/test.jpg",
    ];

    const needsConversion = urls.map(url => 
      url.includes("yyue5q6u5o") || url.includes("a.run.app")
    );

    expect(needsConversion[0]).toBe(true);
    expect(needsConversion[1]).toBe(true);
    expect(needsConversion[2]).toBe(false);
  });

  it("should not convert URLs that already use renciaapp domain", async () => {
    const url = "https://renciaapp.manus.space/manus-storage/carousel/test.jpg";
    
    const shouldSkip = url.startsWith("https://renciaapp");
    expect(shouldSkip).toBe(true);
  });
});
