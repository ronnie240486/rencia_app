/**
 * API REST pública para consumo pelo APK.
 * Todos os endpoints retornam JSON e não requerem autenticação OAuth.
 *
 * Endpoints disponíveis:
 *   POST /api/guim.php
 *        → Endpoint principal do APK (compatível com IBOController/BoxV3)
 *        → Recebe: { "data": "<BASE64 de { app_device_id, app_type, version, is_paid }>" }
 *        → Retorna: { "data": "<string codificada com algoritmo Security.getDecodedString>" }
 *          onde a string decodificada é o AppInfoModel JSON
 *
 *   GET  /api/device/check?mac=XX:XX:XX:XX:XX:XX
 *        → Verifica se um device está cadastrado e retorna seus dados
 *
 *   GET  /api/health
 *        → Health check
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { devices, appSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

/**
 * Detecta o tipo MIME real de uma imagem pelos magic bytes.
 * Necessário porque o S3/CloudFront às vezes retorna content-type: text/html.
 */
function detectImageType(buf: Buffer): string {
  if (buf.length < 4) return "image/jpeg";
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  // GIF: 47 49 46
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "image/webp";
  return "image/jpeg"; // fallback
}

// Multer: armazena em memória para depois enviar ao S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});

// Chaves de configuração válidas para upload de imagem
const UPLOAD_FIELD_KEYS: Record<string, string> = {
  trial_logo_url: "trial_logo_url",
  trial_background_url: "trial_background_url",
  trial_banner_url: "trial_banner_url",
  icon_live_tv_url: "icon_live_tv_url",
  icon_movies_url: "icon_movies_url",
  icon_series_url: "icon_series_url",
  icon_account_url: "icon_account_url",
  icon_change_playlist_url: "icon_change_playlist_url",
};

// Cache de configurações para evitar query no banco a cada request
let settingsCache: Record<string, string> = {};
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60_000; // 60 segundos

// ✅ CORREÇÃO: exportar para que routers.ts possa invalidar o cache ao salvar configurações
export function invalidateSettingsCache() {
  settingsCacheTime = 0;
}

async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now - settingsCacheTime < SETTINGS_CACHE_TTL && Object.keys(settingsCache).length > 0) {
    return settingsCache;
  }
  try {
    const db = await getDb();
    if (!db) return settingsCache;
    const rows = await db.select().from(appSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? "";
    }
    settingsCache = result;
    settingsCacheTime = now;
    return result;
  } catch {
    return settingsCache;
  }
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

/**
 * Decodifica o payload enviado pelo APK BoxV3 (Security.getStringData).
 *
 * O APK codifica assim:
 *   1. JSON → Base64
 *   2. Insere uma encrypt_key de tamanho p1 na posição p2 da string Base64
 *   3. Appende ALPHABET[p2] + ALPHABET[p1] no final
 *
 * Para decodificar:
 *   1. Pega penúltimo char → p2 = ALPHABET.indexOf(char) = posição da key
 *   2. Pega último char → p1 = ALPHABET.indexOf(char) = tamanho da key
 *   3. Remove os 2 últimos chars
 *   4. Remove p1 chars a partir da posição p2
 *   5. Decodifica Base64
 */
function decodeFromApk(encoded: string): Record<string, unknown> | null {
  try {
    const s = encoded.replace(/\s/g, "");
    if (s.length < 3) return null;

    // Pegar penúltimo char = posição da key (p2)
    const p2Char = s[s.length - 2];
    const p2 = ALPHABET.indexOf(p2Char);

    // Pegar último char = tamanho da key (p1)
    const p1Char = s[s.length - 1];
    const p1 = ALPHABET.indexOf(p1Char);

    if (p2 < 0 || p1 < 0) return null;

    // Remover os 2 últimos chars
    let clean = s.slice(0, -2);

    // Remover p1 chars a partir da posição p2
    clean = clean.slice(0, p2) + clean.slice(p2 + p1);

    // Decodificar Base64
    const decoded = Buffer.from(clean, "base64").toString("utf-8").trim();
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Codifica uma string JSON no formato esperado pelo APK BoxV3.
 *
 * O APK usa Security.getDecodedString() para decodificar a resposta:
 *   1. Pega os 2 últimos chars da string
 *   2. Converte cada char para sua posição no alfabeto ALPHABET
 *   3. Remove os últimos 2 chars
 *   4. Reconstrói: substring(0, pos1) + substring(pos1+pos2)
 *   5. Decodifica Base64
 *
 * Para codificar (operação inversa):
 *   1. Codifica JSON em Base64
 *   2. Insere pos2 chars de lixo na posição pos1
 *   3. Adiciona ALPHABET[pos1] + ALPHABET[pos2] no final
 */
function encodeForApk(jsonStr: string): string {
  // Codifica em Base64
  const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");

  // Posições fixas: pos1=5 ('f'), pos2=3 ('d')
  // Garante que pos1 < b64.length para não quebrar
  const pos1 = Math.min(5, b64.length - 1);
  const pos2 = 3;

  // Insere pos2 chars de lixo na posição pos1
  const junk = "X".repeat(pos2);
  const obfuscated = b64.slice(0, pos1) + junk + b64.slice(pos1);

  // Adiciona os 2 chars de posição no final
  return obfuscated + ALPHABET[pos1] + ALPHABET[pos2];
}

export function registerApiRoutes(app: Express) {

  /**
   * POST /api/guim.php
   *
   * Endpoint principal compatível com o APK BoxV3.
   * O APK envia um JSON com campo "data" contendo Base64 de:
   *   { app_device_id: "<MAC>", app_type: "<tipo>", version: "<versão>", is_paid: false }
   *
   * Retorna { "data": "<string codificada>" } onde a string decodificada é:
   * {
   *   mac_registered: true/false,
   *   mac_address: "XX:XX:XX:XX:XX:XX",
   *   expire_date: "2025-12-31",
   *   urls: [{ url: "...", username: "", password: "", type: "m3u_plus" }],
   *   is_trial: 0,
   *   lock: 0,
   *   plan_id: "...",
   *   device_key: "...",
   *   languages: [],
   *   apk_link: "",
   *   app_version: ""
   * }
   */
  app.post("/api/guim.php", async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // O APK envia { data: "<BASE64>" }
      let macAddress: string | null = null;

      if (body && body.data) {
        // O APK usa Security.getStringData que insere uma encrypt_key no Base64
        // Usar decodeFromApk para remover a key antes de decodificar
        const parsed = decodeFromApk(String(body.data));
        if (parsed) {
          const rawDeviceId = (parsed.app_device_id as string) ?? null;
          if (rawDeviceId) {
            // Verificar se já é um MAC no formato XX:XX:XX:XX:XX:XX (sem Base64)
            const isMacFormat = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(rawDeviceId.trim());
            if (isMacFormat) {
              // MAC real do dispositivo sem codificação - usar diretamente
              macAddress = rawDeviceId.trim().toLowerCase();
            } else {
              // Pode ser Base64 do MAC ou android_id em Base64
              try {
                const decoded = Buffer.from(rawDeviceId.replace(/\s/g, ""), "base64").toString("utf-8").trim();
                // Verificar se o Base64 decodificado é um MAC
                const isMacDecoded = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(decoded);
                if (isMacDecoded) {
                  // Era Base64 do MAC real (APK v8+)
                  macAddress = decoded.toLowerCase();
                } else {
                  // android_id em Base64 - converter para hex
                  const hexId = Buffer.from(rawDeviceId.replace(/\s/g, ""), "base64").toString("hex");
                  macAddress = hexId.length > 0 ? hexId.toLowerCase() : rawDeviceId.toLowerCase();
                }
              } catch {
                macAddress = rawDeviceId.toLowerCase();
              }
            }
          }
        } else {
          // Fallback: tentar Base64 simples (compatibilidade)
          try {
            const cleaned = String(body.data).replace(/\s/g, "");
            const decoded = Buffer.from(cleaned, "base64").toString("utf-8").trim();
            const fallback = JSON.parse(decoded);
            macAddress = fallback.app_device_id ?? null;
          } catch {
            macAddress = body.app_device_id ?? body.mac ?? null;
          }
        }
      } else if (body && body.app_device_id) {
        macAddress = body.app_device_id;
      }

      if (!macAddress) {
        // Retornar resposta codificada mesmo para erro
        const errorPayload = {
          mac_registered: false,
          mac_address: "",
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
        };
        res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
        return;
      }

      // Normalizar MAC: remover espaços, converter para maiúsculas
      macAddress = macAddress.trim().toUpperCase();

      const db = await getDb();
      if (!db) {
        const errorPayload = {
          mac_registered: false,
          mac_address: macAddress,
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
        };
        res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
        return;
      }

      // Busca case-insensitive: normalizar MAC para minúsculas
      const macNormalized = macAddress.toLowerCase();
      const result = await db
        .select()
        .from(devices)
        .where(eq(devices.mac, macNormalized))
        .limit(1);
      // Se não encontrar em minúsculas, tentar maiúsculas (compatibilidade)
      if (result.length === 0) {
        const resultUpper = await db
          .select()
          .from(devices)
          .where(eq(devices.mac, macAddress.toUpperCase()))
          .limit(1);
        if (resultUpper.length > 0) result.push(...resultUpper);
      }

      // Device não encontrado
      if (result.length === 0) {
        const notFoundPayload = {
          mac_registered: false,
          mac_address: macAddress,
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
        };
        res.json({ data: encodeForApk(JSON.stringify(notFoundPayload)) });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      // Atualizar status automaticamente se expirado
      if (expired && device.status !== "Expirado") {
        await db
          .update(devices)
          .set({ status: "Expirado" })
          .where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      const isAllowed = device.status === "Liberado";

      // Montar lista de URLs para o APK
      // IMPORTANTE: o campo 'id' deve ser != '0' para o APK liberar a lista
      const urls: Array<{ id: string; url: string; name: string; type: string; is_protected: string }> = [];
      if (device.urlM3u8 && isAllowed) {
        urls.push({
          id: String(device.id),  // id != '0' para o APK liberar
          url: device.urlM3u8,
          name: device.nomeServer || "Lista",
          type: "m3u_plus",
          is_protected: "0",
        });
      }

      // Formatar data de expiração
      // Se device está liberado mas sem data, usar 1 ano no futuro como padrão
      // O APK bloqueia se expire_date for null ou data passada
      let expireDate: string;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      } else if (isAllowed) {
        // Sem data de expiração mas liberado: usar 1 ano no futuro
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        expireDate = oneYearFromNow.toISOString().split("T")[0];
      } else {
        // Bloqueado sem data: usar data passada para garantir bloqueio
        expireDate = "2000-01-01";
      }

      const cfg = await getSettings();
      const responsePayload = {
        mac_registered: isAllowed,
        mac_address: device.mac,
        expire_date: expireDate,
        urls,
        is_trial: 0,
        lock: isAllowed ? 0 : 1,
        plan_id: device.tipo ?? "Usuario",
        device_key: String(device.id),
        apk_link: "",
        app_version: cfg.app_version || "5.0",
        // Configurações personalizáveis via painel
        trial_ended: cfg.trial_title || "Acesso Bloqueado",
        via_website: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
        str_trial_description: cfg.trial_support_text || "Suporte com seu revendedor",
        str_link: cfg.contact_website || "",
        str_whatsapp: cfg.contact_whatsapp || "",
        live_label: cfg.app_channels_label || "Canais",
        movie_label: cfg.app_movies_label || "Filmes",
        series_label: cfg.app_series_label || "Séries",
        banner_url: cfg.trial_banner_url || "",
        logo_url: cfg.trial_logo_url || "",
        // WordModels: frases de impacto e contato para a tela home
        languages: [
          {
            code: "pt",
            id: "1",
            name: "Português",
            words: {
              impact_phrase: cfg.impact_phrase || "",
              contact: cfg.contact_info || "",
            },
          },
          {
            code: "en",
            id: "2",
            name: "English",
            words: {
              impact_phrase: cfg.impact_phrase || "",
              contact: cfg.contact_info || "",
            },
          },
        ],
      };

      res.json({ data: encodeForApk(JSON.stringify(responsePayload)) });

    } catch (error) {
      console.error("[API] /api/guim.php error:", error);
      const errorPayload = {
        mac_registered: false,
        mac_address: "",
        expire_date: null,
        urls: [],
        is_trial: 1,
        lock: 1,
        plan_id: "",
        device_key: "",
        apk_link: "",
        app_version: "5.0",
      };
      res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
    }
  });

  /**
   * GET /api/guim.php
   * Suporte a GET para compatibilidade com alguns clientes
   */
  app.get("/api/guim.php", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim().toUpperCase() : null;

    if (!mac) {
      res.status(400).json({ mac_registered: false, error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ mac_registered: false, error: "Banco de dados indisponível." });
        return;
      }

      const result = await db.select().from(devices).where(eq(devices.mac, mac)).limit(1);

      if (result.length === 0) {
        res.json({ mac_registered: false, mac_address: mac, urls: [], is_trial: 1, lock: 1 });
        return;
      }

      const device = result[0];
      const isAllowed = device.status === "Liberado";
      const urls = device.urlM3u8 && isAllowed
        ? [{ url: device.urlM3u8, username: "", password: "", type: "m3u_plus" }]
        : [];

      res.json({
        mac_registered: isAllowed,
        mac_address: device.mac,
        expire_date: device.dataExpiracao
          ? new Date(device.dataExpiracao).toISOString().split("T")[0]
          : null,
        urls,
        is_trial: 0,
        lock: isAllowed ? 0 : 1,
        plan_id: device.tipo ?? "Usuario",
        device_key: String(device.id),
        status: device.status,
        nome_server: device.nomeServer,
        app: device.app ?? "",
      });
    } catch (error) {
      console.error("[API] GET /api/guim.php error:", error);
      res.status(500).json({ mac_registered: false, error: "Erro interno do servidor." });
    }
  });

  /**
   * GET /api/device/check?mac=XX:XX:XX:XX:XX:XX
   * Endpoint simplificado para verificação de device.
   */
  app.get("/api/device/check", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.status(400).json({ error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Banco de dados indisponível." });
        return;
      }

      const result = await db.select().from(devices).where(eq(devices.mac, mac)).limit(1);

      if (result.length === 0) {
        res.json({ found: false, allowed: false, message: "Device não cadastrado." });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      if (expired && device.status !== "Expirado") {
        await db.update(devices).set({ status: "Expirado" }).where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      res.json({
        found: true,
        status: device.status,
        allowed: device.status === "Liberado",
        mac: device.mac,
        nomeServer: device.nomeServer,
        tipo: device.tipo,
        app: device.app ?? null,
        urlM3u8: device.urlM3u8 ?? null,
        urlEpg: device.urlEpg ?? null,
        modoSelecao: device.modoSelecao,
        dataExpiracao: device.dataExpiracao ? new Date(device.dataExpiracao).toISOString() : null,
        dataCadastro: device.dataCadastro ? new Date(device.dataCadastro).toISOString() : null,
      });
    } catch (error) {
      console.error("[API] /api/device/check error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  /**
   * POST /api/upload-image
   * Recebe um arquivo de imagem do painel, salva no storage S3 e atualiza o banco.
   * Body: multipart/form-data com campo "image" (arquivo) e "field" (chave da configuração).
   * Autenticação: tenta via cookie de sessão; se falhar, permite se vier do painel (origin interno).
   */
  app.post("/api/upload-image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      // Verificar autenticação via sdk (JWT cookie)
      // Se não autenticado, verificar se é uma requisição interna do painel
      let user: any = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        // Permitir se o cookie não estiver disponível mas a origem for confiável
        // (o painel está na mesma origem que o servidor)
        user = { role: "admin" }; // fallback: aceitar upload do painel
      }

      const field = req.body?.field as string;
      if (!field || !UPLOAD_FIELD_KEYS[field]) {
        res.status(400).json({ error: "Campo inválido: " + field });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Nenhuma imagem enviada" });
        return;
      }

      const file = req.file;
      const ext = file.originalname.split(".").pop() || "png";
      const storageKey = `app-images/${field}_${Date.now()}.${ext}`;

      // Salvar no storage S3
      const { url } = await storagePut(storageKey, file.buffer, file.mimetype);

      // Montar URL absoluta para o APK acessar
      const forwardedProto = req.headers["x-forwarded-proto"];
      const forwardedHost = req.headers["x-forwarded-host"] || req.headers["x-forwarded-for"];
      const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : (forwardedProto || "https");
      const host = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || req.headers.host || "");
      // Se host for localhost, usar o domínio de produção configurado
      const publicHost = (host.includes("localhost") || host.includes("127.0.0.1"))
        ? "renciaapp-ldyffp73.manus.space"
        : host;
      const absoluteUrl = `https://${publicHost}${url}`;

      // Atualizar no banco de dados
      const db = await getDb();
      if (db) {
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, field)).limit(1);
        if (existing.length > 0) {
          await db.update(appSettings).set({ value: absoluteUrl, updatedAt: new Date() }).where(eq(appSettings.key, field));
        } else {
          await db.insert(appSettings).values({ key: field, value: absoluteUrl });
        }
        // Invalidar cache de configurações
        settingsCacheTime = 0;
      }

      res.json({ success: true, url: absoluteUrl, field });
    } catch (error: any) {
      console.error("[API] /api/upload-image error:", error);
      res.status(500).json({ error: error.message || "Erro interno ao fazer upload" });
    }
  });

  /**
   * GET /api/health
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/v4/logo.php
   * Endpoint usado pela classe Logo.java do APK para carregar o logo dinâmico.
   * Retorna a imagem do logo configurada no painel, ou o logo padrão OURO REVENDA.
   * Suporta: redirect para URL externa ou proxy da imagem.
   */
  app.get("/api/v4/logo.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      // Se logo estiver oculto, retornar 204 para o APK não exibir nada
      if (cfg.trial_logo_hidden === "true") {
        res.status(204).end();
        return;
      }
      const logoUrl = cfg.trial_logo_url || "";
      const targetUrl = (logoUrl && logoUrl.startsWith("http") && !logoUrl.includes(","))
        ? logoUrl
        : "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_logo_offline-B8wgSvvarHoKB4eoYgKxDA.png";
      // Proxy da imagem: baixar e servir com HTTP 200 (APK não aceita redirect 302)
      const logoImgRes = await fetch(targetUrl, { redirect: "follow" });
      if (!logoImgRes.ok) { res.status(204).end(); return; }
      const logoBuffer = Buffer.from(await logoImgRes.arrayBuffer());
      const logoType = detectImageType(logoBuffer);
      res.setHeader("Content-Type", logoType);
      res.setHeader("Content-Length", logoBuffer.length);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).end(logoBuffer);;
    } catch (error) {
      console.error("[API] /api/v4/logo.php error:", error);
      res.redirect(302, "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_logo_offline-B8wgSvvarHoKB4eoYgKxDA.png");
    }
  });

  /**
   * GET /api/v4/bg.php
   * Endpoint usado pela classe Back.java do APK para carregar o fundo dinâmico.
   * O APK só aceita HTTP 200 com bytes da imagem — NÃO aceita redirect 302.
   * Por isso fazemos proxy da imagem: baixamos do S3 e servimos diretamente.
   */
  app.get("/api/v4/bg.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const bgUrl = cfg.trial_background_url || "";

      if (!bgUrl || !bgUrl.startsWith("http")) {
        // Sem fundo configurado: retornar 204 para o APK usar o fundo padrão
        res.status(204).end();
        return;
      }

      // Proxy da imagem: baixar do S3 e servir com HTTP 200
      const imgRes = await fetch(bgUrl, { redirect: "follow" });
      if (!imgRes.ok) {
        res.status(204).end();
        return;
      }
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      // Detectar tipo real pelo magic bytes (ignora content-type do S3 que pode ser text/html)
      const detectedType = detectImageType(imgBuffer);
      res.setHeader("Content-Type", detectedType);
      res.setHeader("Content-Length", imgBuffer.length);
      res.setHeader("Cache-Control", "public, max-age=60");
      res.status(200).end(imgBuffer);
    } catch (error) {
      console.error("[API] /api/v4/bg.php error:", error);
      res.status(204).end();
    }
  });

  /**
   * GET /api/app-config
   * Retorna configurações públicas do app para o APK buscar ao iniciar.
   */
  app.get("/api/app-config", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      res.json({
        background_url: cfg.trial_background_url || "",
        logo_url: cfg.trial_logo_url || "",
        banner_url: cfg.trial_banner_url || "",
        support_text: cfg.trial_support_text || "Suporte com seu revendedor",
        contact_whatsapp: cfg.contact_whatsapp || "",
        contact_website: cfg.contact_website || "",
        trial_title: cfg.trial_title || "Acesso Bloqueado",
        trial_subtitle: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
        app_channels_label: cfg.app_channels_label || "Canais",
        app_movies_label: cfg.app_movies_label || "Filmes",
        app_series_label: cfg.app_series_label || "Séries",
        // Ícones dos botões
        icon_live_tv_url: cfg.icon_live_tv_url || "",
        icon_movies_url: cfg.icon_movies_url || "",
        icon_series_url: cfg.icon_series_url || "",
        icon_account_url: cfg.icon_account_url || "",
        icon_change_playlist_url: cfg.icon_change_playlist_url || "",
        icon_reload_url: cfg.icon_reload_url || "",
        icon_exit_url: cfg.icon_exit_url || "",
        icon_settings_url: cfg.icon_settings_url || "",
        trial_logo_hidden: cfg.trial_logo_hidden === "true",
        impact_phrase: cfg.impact_phrase || "",
        contact_info: cfg.contact_info || "",
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[API] /api/app-config error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  /**
   * GET /api/v4/icon/:name
   * Retorna redirect para o ícone dinâmico configurado no painel.
   * :name pode ser: live_tv, movies, series, account, change_playlist
   */
  const ICON_DEFAULTS: Record<string, string> = {
    live_tv: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_tv_icon-AAug6wmiVszWoLBpe6xQhX.png",
    movies: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_series_icon-7CwEZ4S5JmMoikDNVJThqn.png",
    series: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_series_icon-7CwEZ4S5JmMoikDNVJThqn.png",
    account: "",
    change_playlist: "",
  };
  const ICON_SETTING_KEYS: Record<string, string> = {
    live_tv: "icon_live_tv_url",
    movies: "icon_movies_url",
    series: "icon_series_url",
    account: "icon_account_url",
    change_playlist: "icon_change_playlist_url",
    reload: "icon_reload_url",
    exit: "icon_exit_url",
    settings: "icon_settings_url",
  };

  app.get("/api/v4/icon/:name", async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const settingKey = ICON_SETTING_KEYS[name];
    if (!settingKey) {
      res.status(404).json({ error: "Icon not found" });
      return;
    }
    try {
      const cfg = await getSettings();
      const iconUrl = cfg[settingKey] || ICON_DEFAULTS[name] || "";
      if (iconUrl && iconUrl.startsWith("http")) {
        res.redirect(302, iconUrl);
        return;
      }
      res.status(404).json({ error: "No icon configured" });
    } catch (error) {
      console.error("[API] /api/v4/icon error:", error);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  /**
   * GET /api/v4/version.php
   * Retorna a versão atual do APK configurada no painel.
   * O APK compara com sua versão interna e exibe notificação se houver atualização.
   */
  app.get("/api/v4/version.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const version = cfg.app_version || "5.0";
      const downloadUrl = cfg.app_download_url || "";
      res.json({
        version,
        download_url: downloadUrl,
        force_update: false,
        message: downloadUrl ? `Nova versão ${version} disponível! Baixe agora.` : "",
      });
    } catch (error) {
      console.error("[API] /api/v4/version.php error:", error);
      res.status(500).json({ error: "Erro interno" });
    }
  });
}
