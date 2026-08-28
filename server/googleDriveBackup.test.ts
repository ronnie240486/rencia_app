import { describe, expect, it } from "vitest";
import { decryptGoogleDriveRefreshToken, encryptGoogleDriveRefreshToken, getGoogleDriveBackupConfig, getGoogleDriveOAuthConfig, verifyGoogleDriveOAuthClient } from "./googleDriveBackup";

describe("backup no Google Drive", () => {
  it("rejeita configuração incompleta sem expor credenciais", () => {
    expect(getGoogleDriveBackupConfig({ GOOGLE_DRIVE_BACKUP_FOLDER_ID: "pasta" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("reconhece o Client ID e Client Secret OAuth informados", async () => {
    expect(getGoogleDriveOAuthConfig()).not.toBeNull();
    await expect(verifyGoogleDriveOAuthClient()).resolves.toEqual({ recognized: true });
  }, 30_000);

  it("protege o token de renovação antes de persistir a conexão", () => {
    const token = "token-de-renovacao-do-google";
    const encrypted = encryptGoogleDriveRefreshToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptGoogleDriveRefreshToken(encrypted)).toBe(token);
  });
});
