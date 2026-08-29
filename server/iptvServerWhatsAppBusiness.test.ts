import { describe, expect, it } from "vitest";
import { prepareIptvServerWhatsAppBusiness } from "./iptvServerWhatsAppBusiness";

describe("preparo do WhatsApp Business para servidores IPTV", () => {
  it("mantém a conexão desativada e reutiliza os servidores já cadastrados", () => {
    expect(prepareIptvServerWhatsAppBusiness(2)).toEqual({
      status: "ready",
      enabled: false,
      reusesExistingServers: true,
      message: "2 servidores serão aproveitados quando o WhatsApp Business for conectado.",
    });
  });
});
