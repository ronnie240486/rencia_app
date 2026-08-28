import { createCipheriv, createDecipheriv, createHash, createHmac, createSign, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { googleDriveBackupConnections } from "../drizzle/schema";
import { getDb } from "./db";

// Permite criar e manter somente a pasta e os arquivos que este painel produz,
// sem solicitar acesso à biblioteca inteira do Google Drive do proprietário.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_DRIVE_REDIRECT_URI = "https://renciaapp.manus.space/api/google-drive/oauth/callback";
// Client Web criado para o painel. O ID é público por natureza; o segredo continua somente no ambiente protegido.
const GOOGLE_DRIVE_WEB_CLIENT_ID = "668596030530-adfi35tcp2cnio6ss9fk79cmduscubvt.apps.googleusercontent.com";

type DriveServiceAccount = { client_email?: string; private_key?: string; token_uri?: string };
type OAuthTokenResponse = { access_token?: string; refresh_token?: string; error?: string; error_description?: string };

export type GoogleDriveBackupConfig = { clientEmail: string; privateKey: string; tokenUrl: string; folderId: string };
export type GoogleDriveOAuthConfig = { clientId: string; clientSecret: string };

function base64Url(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }

export function getGoogleDriveBackupConfig(env: NodeJS.ProcessEnv = process.env): GoogleDriveBackupConfig | null {
  const rawCredentials = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim();
  const folderId = env.GOOGLE_DRIVE_BACKUP_FOLDER_ID?.trim();
  if (!rawCredentials || !folderId) return null;
  try {
    const credentials = JSON.parse(rawCredentials) as DriveServiceAccount;
    const clientEmail = credentials.client_email?.trim();
    const privateKey = credentials.private_key?.trim();
    return clientEmail && privateKey ? { clientEmail, privateKey, tokenUrl: credentials.token_uri?.trim() || GOOGLE_TOKEN_URL, folderId } : null;
  } catch { return null; }
}

export function getGoogleDriveOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleDriveOAuthConfig | null {
  const clientId = GOOGLE_DRIVE_WEB_CLIENT_ID;
  const clientSecret = env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("A chave de segurança do painel não está disponível.");
  return createHash("sha256").update(`${secret}:google-drive-backups`).digest();
}

export function encryptGoogleDriveRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGoogleDriveRefreshToken(value: string) {
  const [ivText, tagText, cipherText] = value.split(".");
  if (!ivText || !tagText || !cipherText) throw new Error("A conexão do Google Drive está inválida.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(cipherText, "base64url")), decipher.final()]).toString("utf8");
}

function createOAuthState(ownerId: number, origin: string) {
  const data = base64Url(JSON.stringify({ ownerId, origin, exp: Date.now() + 15 * 60_000, nonce: randomBytes(12).toString("base64url") }));
  return `${data}.${createHmac("sha256", getEncryptionKey()).update(data).digest("base64url")}`;
}

export function readGoogleDriveOAuthState(state: string) {
  const [data, suppliedSignature] = state.split(".");
  if (!data || !suppliedSignature) throw new Error("A autorização do Google Drive expirou. Tente novamente.");
  const expectedSignature = createHmac("sha256", getEncryptionKey()).update(data).digest("base64url");
  const provided = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new Error("A autorização do Google Drive não é válida.");
  const result = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as { ownerId?: unknown; origin?: unknown; exp?: unknown };
  if (!Number.isInteger(result.ownerId) || typeof result.origin !== "string" || typeof result.exp !== "number" || result.exp < Date.now()) throw new Error("A autorização do Google Drive expirou. Tente novamente.");
  return { ownerId: result.ownerId as number, origin: result.origin };
}

export function createGoogleDriveAuthorizationUrl(ownerId: number, origin: string, env: NodeJS.ProcessEnv = process.env) {
  const config = getGoogleDriveOAuthConfig(env);
  if (!config) throw new Error("Informe o Client ID e o Client Secret do Google Drive antes de conectar.");
  const url = new URL(GOOGLE_OAUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", GOOGLE_DRIVE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", createOAuthState(ownerId, origin));
  return url.toString();
}

/** Confere se o Google reconhece o par OAuth, sem criar arquivo ou alterar dados do Drive. */
export async function verifyGoogleDriveOAuthClient(env: NodeJS.ProcessEnv = process.env) {
  const config = getGoogleDriveOAuthConfig(env);
  if (!config) throw new Error("As credenciais OAuth do Google Drive estão incompletas.");
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code: "rencia-backup-credential-check", grant_type: "authorization_code", redirect_uri: GOOGLE_DRIVE_REDIRECT_URI }).toString() });
  const payload = await response.json().catch(() => ({})) as OAuthTokenResponse;
  if (payload.error === "invalid_client") throw new Error("O Client ID ou Client Secret do Google não foi aceito.");
  return { recognized: true };
}

async function exchangeGoogleDriveOAuthCode(code: string, env: NodeJS.ProcessEnv = process.env) {
  const config = getGoogleDriveOAuthConfig(env);
  if (!config) throw new Error("As credenciais OAuth do Google Drive estão incompletas.");
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: GOOGLE_DRIVE_REDIRECT_URI, grant_type: "authorization_code" }).toString() });
  const payload = await response.json().catch(() => ({})) as OAuthTokenResponse;
  if (!response.ok || !payload.access_token || !payload.refresh_token) throw new Error(payload.error_description || "Não foi possível concluir a autorização do Google Drive.");
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
}

async function refreshGoogleDriveAccessToken(refreshToken: string, env: NodeJS.ProcessEnv = process.env) {
  const config = getGoogleDriveOAuthConfig(env);
  if (!config) throw new Error("As credenciais OAuth do Google Drive estão incompletas.");
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token" }).toString() });
  const payload = await response.json().catch(() => ({})) as OAuthTokenResponse;
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "A conexão do Google Drive precisa ser autorizada novamente.");
  return payload.access_token;
}

async function createGoogleDriveBackupFolder(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Backups Rencia App", mimeType: "application/vnd.google-apps.folder" }) });
  const folder = await response.json().catch(() => ({})) as { id?: string; name?: string; error?: { message?: string } };
  if (!response.ok || !folder.id) throw new Error(folder.error?.message || "Não foi possível criar a pasta de backup no Google Drive.");
  return { folderId: folder.id, folderName: folder.name || "Backups Rencia App" };
}

export async function connectGoogleDriveBackup(ownerId: number, authorizationCode: string) {
  const { accessToken, refreshToken } = await exchangeGoogleDriveOAuthCode(authorizationCode);
  const folder = await createGoogleDriveBackupFolder(accessToken);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const stored = { folderId: folder.folderId, folderName: folder.folderName, encryptedRefreshToken: encryptGoogleDriveRefreshToken(refreshToken), status: "connected" as const, lastError: null };
  const existing = (await db.select({ id: googleDriveBackupConnections.id }).from(googleDriveBackupConnections).where(eq(googleDriveBackupConnections.ownerId, ownerId)).limit(1))[0];
  if (existing) await db.update(googleDriveBackupConnections).set(stored).where(eq(googleDriveBackupConnections.id, existing.id));
  else await db.insert(googleDriveBackupConnections).values({ ownerId, ...stored });
  return folder;
}

export async function uploadGoogleDriveBackup(ownerId: number, filename: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const connection = (await db.select().from(googleDriveBackupConnections).where(eq(googleDriveBackupConnections.ownerId, ownerId)).limit(1))[0];
  if (!connection) return { status: "not_configured" as const, fileId: null, url: null, error: null };
  try {
    const accessToken = await refreshGoogleDriveAccessToken(decryptGoogleDriveRefreshToken(connection.encryptedRefreshToken));
    const boundary = `rencia-backup-${randomBytes(12).toString("hex")}`;
    const metadata = JSON.stringify({ name: filename, mimeType: "application/json", parents: [connection.folderId] });
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`, "utf8"), Buffer.from(content, "utf8"), Buffer.from(`\r\n--${boundary}--`, "utf8")]);
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: body as unknown as BodyInit });
    const file = await response.json().catch(() => ({})) as { id?: string; webViewLink?: string; error?: { message?: string } };
    if (!response.ok || !file.id) throw new Error(file.error?.message || "Não foi possível enviar a cópia ao Google Drive.");
    await db.update(googleDriveBackupConnections).set({ status: "connected", lastSuccessAt: new Date(), lastError: null }).where(eq(googleDriveBackupConnections.id, connection.id));
    return { status: "success" as const, fileId: file.id, url: file.webViewLink || `https://drive.google.com/open?id=${file.id}`, error: null };
  } catch (error) {
    const message = String(error).slice(0, 500);
    await db.update(googleDriveBackupConnections).set({ status: "error", lastError: message }).where(eq(googleDriveBackupConnections.id, connection.id));
    return { status: "error" as const, fileId: null, url: null, error: message };
  }
}

export async function getGoogleDriveAccessToken(config: GoogleDriveBackupConfig): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: config.clientEmail, scope: DRIVE_SCOPE, aud: config.tokenUrl, iat: issuedAt, exp: issuedAt + 3_600 }));
  const signer = createSign("RSA-SHA256"); signer.update(`${header}.${payload}`); signer.end();
  const assertion = `${header}.${payload}.${signer.sign(config.privateKey).toString("base64url")}`;
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() });
  const payloadResult = await response.json().catch(() => ({})) as OAuthTokenResponse;
  if (!response.ok || !payloadResult.access_token) throw new Error(payloadResult.error_description || "Não foi possível autorizar a cópia no Google Drive.");
  return payloadResult.access_token;
}

export async function verifyGoogleDriveBackupAccess(env: NodeJS.ProcessEnv = process.env) {
  const config = getGoogleDriveBackupConfig(env);
  if (!config) throw new Error("A configuração da cópia no Google Drive está incompleta.");
  const accessToken = await getGoogleDriveAccessToken(config);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(config.folderId)}?fields=id,name,mimeType`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const folder = await response.json().catch(() => ({})) as { id?: string; name?: string; mimeType?: string; error?: { message?: string } };
  if (!response.ok || folder.id !== config.folderId || folder.mimeType !== "application/vnd.google-apps.folder") throw new Error(folder.error?.message || "A pasta de backup no Google Drive não foi encontrada ou não foi compartilhada com a conta de serviço.");
  return { folderId: folder.id, folderName: folder.name || "Backups Rencia App" };
}
