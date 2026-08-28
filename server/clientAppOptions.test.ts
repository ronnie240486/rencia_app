import { describe, expect, it } from "vitest";
import { findClientAppOption } from "../client/src/lib/clientAppOptions";

describe("logo do aplicativo no cartão de cliente", () => {
  it("encontra o logo pelo nome salvo no cadastro", () => {
    expect(findClientAppOption("OuroPro")?.label).toBe("Ouro Pro");
    expect(findClientAppOption("Maximus Player")?.label).toBe("Maximus Player");
  });

  it("reconhece aliases das rotas de aplicativos", () => {
    expect(findClientAppOption("Future Player")?.label).toBe("Future");
    expect(findClientAppOption("Supreme")?.label).toBe("Supreme");
  });
});
