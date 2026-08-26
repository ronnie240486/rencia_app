import { describe, expect, it } from "vitest";
import { buildPublicDownloadApps } from "./publicDownloads";

describe("loja pública de downloads", () => {
  it("expõe apenas aplicativos ativos com URL segura", () => {
    const apps = buildPublicDownloadApps({
      public_ouropro_download_url: "https://downloads.exemplo.com/ouropro.apk",
      public_ouropro_version: "7.1.0",
      public_ultra_download_url: "javascript:alert(1)",
      public_maximus_download_url: "https://downloads.exemplo.com/maximus.apk",
      public_maximus_active: "false",
    });

    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({ slug: "ouropro", version: "7.1.0" });
  });

  it("usa a configuração já existente do OuroPro como fallback", () => {
    const apps = buildPublicDownloadApps({ apk_download_url: "/ouropro", apk_version: "7.0" });
    expect(apps[0]).toMatchObject({ slug: "ouropro", downloadUrl: "/ouropro", version: "7.0" });
  });

  it("expõe o Império Play com o APK e a versão configurados", () => {
    const apps = buildPublicDownloadApps({
      imperio_apk_download_url: "https://files.exemplo.com/imperio-play.apk",
      imperio_apk_version: "5.5.0",
    });

    expect(apps).toEqual([expect.objectContaining({
      slug: "imperio",
      name: "Império Play",
      downloadUrl: "https://files.exemplo.com/imperio-play.apk",
      version: "5.5.0",
    })]);
  });

  it("expõe os novos aplicativos quando cada link de APK é configurado", () => {
    const apps = buildPublicDownloadApps({
      ominus_apk_download_url: "https://files.exemplo.com/ominus.apk",
      magnus_apk_download_url: "https://files.exemplo.com/magnus.apk",
      excellence_apk_download_url: "https://files.exemplo.com/excellence.apk",
    });

    expect(apps.map((app) => app.slug)).toEqual(["ominus", "magnus", "excellence"]);
  });
});
