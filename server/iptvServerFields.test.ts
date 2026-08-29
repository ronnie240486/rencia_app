import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { iptvServers } from "../drizzle/schema";

describe("campos administrativos dos servidores IPTV", () => {
  it("mantém pessoa, lista, observação e pagamento separados do cadastro de clientes", () => {
    const columns = getTableColumns(iptvServers);

    expect(Object.keys(columns)).toEqual(expect.arrayContaining([
      "personName",
      "name",
      "server",
      "playlist",
      "notes",
      "paymentStatus",
      "expiresAt",
    ]));
    expect(Object.keys(columns)).not.toContain("mac");
  });
});
