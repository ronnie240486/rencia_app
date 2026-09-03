import { describe, expect, it } from "vitest";
import { buildPublicDownloadApps } from "./publicDownloads";

describe("loja pública de downloads", () => {
  it("mantém o catálogo público e só libera download com URL segura", () => {
    const apps = buildPublicDownloadApps({
      public_ouropro_download_url: "https://downloads.exemplo.com/ouropro.apk",
      public_ouropro_version: "7.1.0",
      public_ultra_download_url: "javascript:alert(1)",
      public_maximus_download_url: "https://downloads.exemplo.com/maximus.apk",
      public_maximus_active: "false",
    });

    expect(apps).toHaveLength(12);
    expect(apps.find((app) => app.slug === "ouropro")).toMatchObject({ version: "7.1.0", isAvailable: true });
    expect(apps.find((app) => app.slug === "ultra")).toMatchObject({ isAvailable: false });
    expect(apps.find((app) => app.slug === "maximus")).toBeUndefined();
  });

  it("usa a configuração já existente do OuroPro como fallback", () => {
    const apps = buildPublicDownloadApps({ apk_download_url: "/ouropro", apk_version: "7.0" });
    expect(apps[0]).toMatchObject({ slug: "ouropro", downloadUrl: "/ouropro", version: "7.0" });
  });

  it("prioriza sempre a fonte principal mais recente do OuroPro", () => {
    const apps = buildPublicDownloadApps({
      apk_download_url: "https://files.exemplo.com/ouropro-12.apk",
      apk_version: "12",
      public_ouropro_download_url: "https://files.exemplo.com/ouropro-antigo.apk",
      public_ouropro_version: "1.0",
    });

    expect(apps[0]).toMatchObject({
      downloadUrl: "https://files.exemplo.com/ouropro-12.apk",
      version: "12",
    });
  });

  it("expõe o código Downloader e o link curto configurados para o Maximus", () => {
    const apps = buildPublicDownloadApps({
      public_maximus_download_url: "https://aftv.news/4851546",
      public_maximus_downloader_code: "4851546",
      public_maximus_aftv_url: "https://aftv.news/4851546",
    });

    expect(apps.find((app) => app.slug === "maximus")).toMatchObject({
      downloadUrl: "https://aftv.news/4851546",
      downloaderCode: "4851546",
      aftvUrl: "https://aftv.news/4851546",
    });
  });

  it("expõe o Império Play com o APK e a versão configurados", () => {
    const apps = buildPublicDownloadApps({
      imperio_apk_download_url: "https://files.exemplo.com/imperio-play.apk",
      imperio_apk_version: "5.5.0",
    });

    expect(apps).toEqual(expect.arrayContaining([expect.objectContaining({
      slug: "imperio",
      name: "Império Play",
      downloadUrl: "https://files.exemplo.com/imperio-play.apk",
      version: "5.5.0",
    })]));
  });

  it("usa o logo configurado do Infinitus", () => {
    const apps = buildPublicDownloadApps({
      infinitus_apk_download_url: "https://files.exemplo.com/infinitus.apk",
      infinitus_logo_url: "/manus-storage/infinitus-logo-20260827_4434c640.jpg",
    });

    expect(apps).toEqual(expect.arrayContaining([expect.objectContaining({
      slug: "infinitus",
      logoUrl: "/manus-storage/infinitus-logo-20260827_4434c640.jpg",
    })]));
  });

  it("expõe os novos aplicativos quando cada link de APK é configurado", () => {
    const apps = buildPublicDownloadApps({
      ominus_apk_download_url: "https://files.exemplo.com/ominus.apk",
      magnus_apk_download_url: "https://files.exemplo.com/magnus.apk",
      excellence_apk_download_url: "https://files.exemplo.com/excellence.apk",
      future_apk_download_url: "https://files.exemplo.com/future.apk",
    });

    expect(apps.filter((app) => app.isAvailable).map((app) => app.slug)).toEqual(["ominus", "magnus", "excellence", "future"]);
    expect(apps.find((app) => app.slug === "future")).toMatchObject({ name: "Future", logoUrl: "/manus-storage/future-logo-20260827_1a714bae.jpg" });
  });
});
