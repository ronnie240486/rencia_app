// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.
//
// Fallback (Railway e outros ambientes sem Forge configurado): grava o
// arquivo direto no disco, na mesma pasta que o storageProxy já serve
// localmente (client/public/manus-storage). Assim, upload de imagens/APKs
// funciona sem depender de nenhuma credencial do Manus.

import path from "path";
import fs from "fs";
import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    return null;
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function getCloudinaryConfig() {
  const cloudName = ENV.cloudinaryCloudName;
  const apiKey = ENV.cloudinaryApiKey;
  const apiSecret = ENV.cloudinaryApiSecret;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Guarda o arquivo numa conta gratuita do Cloudinary (fora do container).
// Existe porque nem todo serviço/plano do Railway oferece "Volume" (disco
// persistente) — sem ele, UPLOADS_DIR não resolve nada, já que o container
// inteiro é recriado a cada deploy. O Cloudinary devolve uma URL pública
// (https://res.cloudinary.com/...) que já funciona em todo o resto do
// código sem nenhuma mudança: qualquer URL que não seja "/manus-storage/..."
// já é tratada como externa (ver resolvePublicImageUrl em apiRoutes.ts).
async function cloudinaryPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const cfg = getCloudinaryConfig();
  if (!cfg) throw new Error("Cloudinary não configurado");

  const key = appendHashSuffix(normalizeKey(relKey));
  const lastDot = key.lastIndexOf(".");
  const publicId = lastDot === -1 ? key : key.slice(0, lastDot);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1Hex(`public_id=${publicId}&timestamp=${timestamp}${cfg.apiSecret}`);

  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: contentType }));
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", cfg.apiKey);
  form.append("signature", signature);

  const resourceType = contentType.startsWith("video/") ? "video" : contentType.startsWith("image/") ? "image" : "raw";
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`;
  const resp = await fetch(uploadUrl, { method: "POST", body: form });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Cloudinary upload falhou (${resp.status}): ${msg}`);
  }
  const json = (await resp.json()) as { secure_url?: string; url?: string };
  const url = json.secure_url || json.url;
  if (!url) throw new Error("Cloudinary não retornou URL do arquivo");
  return { key, url };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

// Onde os arquivos enviados pelo painel (logo, banner, imagem de fundo,
// APK) ficam guardados quando o Forge (storage do Manus) não está
// configurado — é o caso do Railway. IMPORTANTE: por padrão isso é uma
// pasta dentro do próprio build (dist/public/manus-storage), que o Railway
// APAGA e recria do zero a cada deploy — é por isso que uma imagem
// configurada no painel "some" depois de qualquer atualização do sistema,
// mesmo sem ninguém ter mexido nela. Configurando a variável de ambiente
// UPLOADS_DIR pra apontar pra um Volume persistente do Railway, os
// arquivos passam a sobreviver aos deploys. Ver README/instruções do painel.
export function localStorageDir(): string {
  if (ENV.uploadsDir) return ENV.uploadsDir;
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  return path.join(distPath, "manus-storage");
}

function publicBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "";
}

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const dir = localStorageDir();
  const filePath = path.join(dir, key);
  if (!filePath.startsWith(dir)) {
    throw new Error("Invalid storage key");
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  fs.writeFileSync(filePath, buffer);
  return { key, url: `/manus-storage/${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const forge = getForgeConfig();
  if (!forge) {
    const cloudinary = getCloudinaryConfig();
    if (cloudinary) {
      return cloudinaryPut(relKey, data, contentType);
    }
    return localStoragePut(relKey, data);
  }
  const { forgeUrl, forgeKey } = forge;
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const forge = getForgeConfig();
  const key = normalizeKey(relKey);

  if (!forge) {
    // Arquivo local: já é servido publicamente pelo storageProxy, sem precisar assinar.
    return `${publicBaseUrl()}/manus-storage/${key}`;
  }

  const { forgeUrl, forgeKey } = forge;
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
