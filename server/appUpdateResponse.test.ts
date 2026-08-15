import { describe, expect, it } from "vitest";
import { buildAppUpdateResponse } from "./appUpdateResponse";

describe("buildAppUpdateResponse", () => {
  it("mantém a URL isolada do aplicativo solicitado", () => {
    const response = buildAppUpdateResponse("Ultra Player", "https://downloads.exemplo.com/ultra.apk", "2.1.0");

    expect(response).toMatchObject({
      app: "Ultra Player",
      version: "2.1.0",
      url: "https://downloads.exemplo.com/ultra.apk",
      apk_link: "https://downloads.exemplo.com/ultra.apk",
      update_available: true,
    });
  });

  it("não anuncia atualização quando a URL própria está vazia", () => {
    expect(buildAppUpdateResponse("Maximus", "", "1.0.0").update_available).toBe(false);
  });
});
