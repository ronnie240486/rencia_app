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
});
