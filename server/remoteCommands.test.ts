import { describe, expect, it } from "vitest";
import { commandExpiresAt, parseRemotePayload, REMOTE_COMMAND_LABELS, selectDeviceForRemoteCommand } from "./remoteCommands";

describe("Central de Comandos Remotos", () => {
  it("define uma expiração segura de quinze minutos por padrão", () => {
    const now = new Date("2026-08-13T12:00:00.000Z");
    expect(commandExpiresAt(15, now).toISOString()).toBe("2026-08-13T12:15:00.000Z");
  });

  it("mantém o payload seguro quando o JSON é inválido", () => {
    expect(parseRemotePayload('{"message":"Olá"}')).toEqual({ message: "Olá" });
    expect(parseRemotePayload("inválido")).toEqual({});
  });

  it("expõe os rótulos dos comandos permitidos", () => {
    expect(REMOTE_COMMAND_LABELS.update_dns).toBe("Atualizar DNS");
    expect(REMOTE_COMMAND_LABELS.show_message).toBe("Exibir aviso");
  });

  it("seleciona o cadastro vinculado ao comando quando o mesmo MAC está duplicado", () => {
    const cadastros = [{ id: 300001 }, { id: 1020017 }];
    expect(selectDeviceForRemoteCommand(cadastros, { deviceId: 1020017 })).toEqual({ id: 1020017 });
  });
});
