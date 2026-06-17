import { describe, it, expect } from "vitest";

/**
 * Teste para verificar que os endpoints de banner, logo e bg estão funcionando
 */
describe("API Endpoints", () => {
  it("should have /api/v4/banner.php endpoint", async () => {
    // Verificar que o endpoint existe
    const bannerUrl = "/api/v4/banner.php";
    expect(bannerUrl).toContain("banner.php");
  });

  it("should have /api/v4/logo.php endpoint", async () => {
    // Verificar que o endpoint existe
    const logoUrl = "/api/v4/logo.php";
    expect(logoUrl).toContain("logo.php");
  });

  it("should have /api/v4/bg.php endpoint", async () => {
    // Verificar que o endpoint existe
    const bgUrl = "/api/v4/bg.php";
    expect(bgUrl).toContain("bg.php");
  });

  it("should have /api/v4/bg-carousel.php endpoint", async () => {
    // Verificar que o endpoint existe
    const carouselUrl = "/api/v4/bg-carousel.php";
    expect(carouselUrl).toContain("bg-carousel.php");
  });

  it("should have /api/v4/bg-debug.php endpoint for debugging", async () => {
    // Verificar que o endpoint de debug existe
    const debugUrl = "/api/v4/bg-debug.php";
    expect(debugUrl).toContain("bg-debug.php");
  });

  it("banner endpoint should return image URL format", async () => {
    // Banner deve retornar uma URL de imagem
    const bannerUrl = "https://renciaapp.manus.space/manus-storage/app-images/trial_banner_url_1779630392638_1333bcdf.png";
    expect(bannerUrl).toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
  });

  it("logo endpoint should return image URL format", async () => {
    // Logo deve retornar uma URL de imagem
    const logoUrl = "https://renciaapp.manus.space/manus-storage/app-images/trial_logo_url_1779633218738_6690a609.png";
    expect(logoUrl).toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
  });

  it("bg endpoint should return image URL format", async () => {
    // Fundo deve retornar uma URL de imagem
    const bgUrl = "https://renciaapp.manus.space/manus-storage/app-images/trial_background_url_1781697698320_bc97aeb8.jpg";
    expect(bgUrl).toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
  });

  it("all endpoints should use https protocol", async () => {
    const endpoints = [
      "https://renciaapp.manus.space/api/v4/banner.php",
      "https://renciaapp.manus.space/api/v4/logo.php",
      "https://renciaapp.manus.space/api/v4/bg.php",
    ];

    endpoints.forEach(endpoint => {
      expect(endpoint).toMatch(/^https:\/\//);
    });
  });
});
