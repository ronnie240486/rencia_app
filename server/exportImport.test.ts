import { describe, expect, it } from "vitest";
import { analyzeImportDevices, buildLegacyV2Backup, importOptionalSection, isSupportedBackupVersion, normalizeBackupDeviceUrls, normalizeImportMac } from "./exportImport";

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

  it("aceita o formato completo 4.0.0 para restauração", () => {
    expect(isSupportedBackupVersion("4.0.0")).toBe(true);
    expect(isSupportedBackupVersion("1.0.0")).toBe(false);
  });

  it("mantém a importação principal quando uma seção opcional não existe no painel de destino", async () => {
    const warnings: string[] = [];
    await importOptionalSection("Catálogo de aplicativos", async () => {
      throw new Error("Tabela opcional ausente");
    }, warnings);
    expect(warnings).toEqual(["Catálogo de aplicativos"]);
  });

  it("gera um backup 2.0 compatível com listas vinculadas aos IDs originais dos clientes", () => {
    const legacy = buildLegacyV2Backup({
      version: "4.0.0",
      exportDate: "2026-08-29T00:00:00.000Z",
      ownerId: 1,
      data: {
        devices: [{ id: 42, mac: "AA:BB:CC:DD:EE:FF", nomeServer: "Cliente", lastActiveAppId: "future" }],
        deviceUrls: [{ id: 7, backupDeviceId: 42, deviceMac: "AA:BB:CC:DD:EE:FF", nome: "Lista 1", ordem: 0 }],
        users: [], dns: [], nuvixConfig: [], playerCredentials: [], appSettings: [], carouselSlides: [], carouselConfig: [], suggestions: [], notices: [],
      },
    });
    expect(legacy.version).toBe("2.0.0");
    expect(legacy.data.deviceUrls[42]).toEqual([expect.objectContaining({ deviceId: 42, nome: "Lista 1" })]);
    expect(legacy.data.devices[0]).not.toHaveProperty("lastActiveAppId");
  });
});
