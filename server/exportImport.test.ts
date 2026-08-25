import { describe, expect, it } from "vitest";
import { analyzeImportDevices, normalizeBackupDeviceUrls, normalizeImportMac } from "./exportImport";

describe("prévia de importação", () => {
  it("normaliza MACs e separa novos, existentes, repetidos e inválidos", () => {
    expect(normalizeImportMac("aa:bb:cc:dd:ee:ff")).toBe("AABBCCDDEEFF");
    const result = analyzeImportDevices([
      { nomeServer: "Existente", mac: "AA:BB:CC:DD:EE:FF" },
      { nomeServer: "Novo", mac: "11:22:33:44:55:66" },
      { nomeServer: "Repetido", mac: "112233445566" },
      { nomeServer: "Inválido", mac: "11:22" },
    ], [{ id: 10, nomeServer: "Cliente anterior", mac: "AABBCCDDEEFF" }]);
    expect(result.existingMatches).toHaveLength(1);
    expect(result.newDevices).toHaveLength(1);
    expect(result.duplicateInFile).toHaveLength(1);
    expect(result.invalidDevices).toHaveLength(1);
  });

  it("vincula listas ao MAC ao ler backups no formato antigo por ID", () => {
    const urls = normalizeBackupDeviceUrls({
      42: [{ id: 7, deviceId: 42, nome: "Lista principal", ordem: 0 }],
    }, [{ id: 42, mac: "AA:BB:CC:DD:EE:FF" }]);

    expect(urls).toEqual([expect.objectContaining({ backupDeviceId: 42, deviceMac: "AA:BB:CC:DD:EE:FF", nome: "Lista principal" })]);
  });

  it("mantém o MAC portável nas listas do formato atual", () => {
    const urls = normalizeBackupDeviceUrls([{ nome: "Lista 2", deviceMac: "11:22:33:44:55:66" }]);
    expect(urls).toEqual([expect.objectContaining({ deviceMac: "11:22:33:44:55:66" })]);
  });
});
