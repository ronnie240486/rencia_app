export type WhatsAppBusinessPreparation = {
  status: "ready";
  enabled: false;
  reusesExistingServers: true;
  message: string;
};

/** A conexão futura só altera seu próprio estado; os servidores existentes nunca precisam ser recriados. */
export function prepareIptvServerWhatsAppBusiness(serverCount: number): WhatsAppBusinessPreparation {
  return {
    status: "ready",
    enabled: false,
    reusesExistingServers: true,
    message: serverCount === 1
      ? "1 servidor será aproveitado quando o WhatsApp Business for conectado."
      : `${serverCount} servidores serão aproveitados quando o WhatsApp Business for conectado.`,
  };
}
