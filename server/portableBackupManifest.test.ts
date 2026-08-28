import { describe, expect, it } from "vitest";
import { buildPortableBackupManifest } from "./portableBackupManifest";

describe("inventário do backup portável", () => {
  it("enumera os dados restauráveis sem incluir segredos externos", () => {
    const manifest = buildPortableBackupManifest({ users: [{ id: 1 }], devices: [], deviceUrls: [{ id: 4 }] });
    expect(manifest.format).toBe("rencia-portable-database-v1");
    expect(manifest.tables).toEqual(expect.arrayContaining([{ table: "users", records: 1, restores: true }, { table: "devices", records: 0, restores: true }]));
    expect(manifest.excludedSecrets).toContain("tokens OAuth do Google Drive");
  });
});
