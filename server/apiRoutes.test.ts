import { describe, expect, it } from "vitest";

// Reimplementar as funções para testar
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

/**
 * Decodifica o payload enviado pelo APK BoxV3 (Security.getStringData).
 * O APK insere uma encrypt_key de tamanho p1 na posição p2 do Base64,
 * e appende ALPHABET[p2] + ALPHABET[p1] no final.
 */
function decodeFromApk(encoded: string): Record<string, unknown> | null {
  try {
    const s = encoded.replace(/\s/g, "");
    if (s.length < 3) return null;
    const p2 = ALPHABET.indexOf(s[s.length - 2]);
    const p1 = ALPHABET.indexOf(s[s.length - 1]);
    if (p2 < 0 || p1 < 0) return null;
    let clean = s.slice(0, -2);
    clean = clean.slice(0, p2) + clean.slice(p2 + p1);
    const decoded = Buffer.from(clean, "base64").toString("utf-8").trim();
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Simula o Security.getStringData do APK (para testes).
 */
function encodeAsApkSends(mac: string, p1 = 5, p2 = 10): string {
  const payload = JSON.stringify({ app_device_id: mac, app_type: "smart-tv", version: "1.0", is_paid: false });
  const b64 = Buffer.from(payload, "utf-8").toString("base64");
  const key = "X".repeat(p1);
  const safeP2 = Math.min(p2, b64.length - 1);
  const encoded = b64.slice(0, safeP2) + key + b64.slice(safeP2);
  return encoded + ALPHABET[safeP2] + ALPHABET[p1];
}

/**
 * Codifica a resposta do servidor para o APK (encodeForApk).
 */
function encodeForApk(jsonStr: string): string {
  const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");
  const pos1 = Math.min(5, b64.length - 1);
  const pos2 = 3;
  const junk = "X".repeat(pos2);
  const obfuscated = b64.slice(0, pos1) + junk + b64.slice(pos1);
  return obfuscated + ALPHABET[pos1] + ALPHABET[pos2];
}

/**
 * Decodifica a resposta do servidor (como o APK faz com getDecodedString).
 */
function getDecodedString(encoded: string): string {
  const v0 = ALPHABET.indexOf(encoded[encoded.length - 2]);
  const v1 = ALPHABET.indexOf(encoded[encoded.length - 1]);
  const p0 = encoded.slice(0, encoded.length - 2);
  const result = p0.slice(0, v0) + p0.slice(v0 + v1);
  return Buffer.from(result, "base64").toString("utf-8").trim();
}

describe("decodeFromApk - decodificação do payload enviado pelo APK", () => {
  it("deve extrair o MAC corretamente do payload do APK", () => {
    const mac = "AA:BB:CC:DD:EE:FF";
    const encoded = encodeAsApkSends(mac, 5, 10);
    const result = decodeFromApk(encoded);
    expect(result).not.toBeNull();
    expect(result?.app_device_id).toBe(mac);
  });

  it("deve funcionar com diferentes posições e tamanhos de key", () => {
    const mac = "11:22:33:44:55:66";
    for (let p1 = 0; p1 <= 15; p1++) {
      for (let p2 = 0; p2 <= 20; p2++) {
        const encoded = encodeAsApkSends(mac, p1, p2);
        const result = decodeFromApk(encoded);
        expect(result?.app_device_id).toBe(mac);
      }
    }
  });

  it("deve retornar null para payload inválido", () => {
    expect(decodeFromApk("")).toBeNull();
    expect(decodeFromApk("ab")).toBeNull();
  });
});

describe("encodeForApk / getDecodedString - resposta do servidor para o APK", () => {
  it("deve codificar e decodificar corretamente um JSON simples", () => {
    const original = '{"mac_registered":false,"mac_address":"AA:BB:CC:DD:EE:FF"}';
    const encoded = encodeForApk(original);
    const decoded = getDecodedString(encoded);
    expect(decoded).toBe(original);
  });

  it("deve codificar e decodificar o AppInfoModel completo", () => {
    const payload = JSON.stringify({
      mac_registered: true,
      mac_address: "11:22:33:44:55:66",
      expire_date: "2026-12-31",
      urls: [{ url: "http://example.com/m3u8", username: "", password: "", type: "m3u_plus" }],
      is_trial: 0,
      lock: 0,
      plan_id: "Usuario",
      device_key: "42",
      languages: [],
      apk_link: "",
      app_version: "",
    });
    const encoded = encodeForApk(payload);
    const decoded = getDecodedString(encoded);
    expect(decoded).toBe(payload);
  });

  it("a resposta codificada deve ter os 2 últimos chars no alfabeto", () => {
    const encoded = encodeForApk('{"test":true}');
    const lastTwo = encoded.slice(-2);
    expect(ALPHABET).toContain(lastTwo[0]);
    expect(ALPHABET).toContain(lastTwo[1]);
  });
});
