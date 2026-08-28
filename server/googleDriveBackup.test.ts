import { describe, expect, it } from "vitest";
import { createGoogleDriveAuthorizationUrl, decryptGoogleDriveRefreshToken, encryptGoogleDriveRefreshToken, getGoogleDriveBackupConfig, getGoogleDriveOAuthConfig } from "./googleDriveBackup";

describe("backup no Google Drive", () => {
  it("rejeita configuração incompleta sem expor credenciais", () => {
    expect(getGoogleDriveBackupConfig({ GOOGLE_DRIVE_BACKUP_FOLDER_ID: "pasta" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("prepara OAuth com o cliente Web e acesso apenas aos arquivos criados pelo painel", () => {
    const env = { GOOGLE_DRIVE_OAUTH_CLIENT_SECRET: "segredo-de-teste", JWT_SECRET: "chave-de-teste" } as NodeJS.ProcessEnv;
    expect(getGoogleDriveOAuthConfig(env)).toEqual(expect.objectContaining({ clientId: expect.stringContaining("apps.googleusercontent.com") }));
    const url = new URL(createGoogleDriveAuthorizationUrl(25, "https://renciaapp.manus.space", env));
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file");
    expect(url.searchParams.get("redirect_uri")).toBe("https://renciaapp.manus.space/api/google-drive/oauth/callback");
  });

  it("protege o token de renovação antes de persistir a conexão", () => {
    const token = "token-de-renovacao-do-google";
    const encrypted = encryptGoogleDriveRefreshToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptGoogleDriveRefreshToken(encrypted)).toBe(token);
  });

  it.skipIf(!process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET)("aceita a credencial ativa no endpoint OAuth do Google", async () => {
    const config = getGoogleDriveOAuthConfig(process.env);
    expect(config).not.toBeNull();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config!.clientId,
        client_secret: config!.clientSecret,
        code: "rencia-credential-probe",
        grant_type: "authorization_code",
        redirect_uri: config!.redirectUri,
      }),
    });
    const payload = await response.json() as { error?: string };
    // O código fictício é rejeitado como invalid_request, mas a ausência de invalid_client confirma a credencial ativa.
    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_request");
  });
});
