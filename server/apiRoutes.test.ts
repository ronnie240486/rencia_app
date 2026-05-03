import { describe, expect, it } from "vitest";

// Reimplementar a função encodeForApk para testar
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

function getEncryptKeyPosition(s: string): number {
  return ALPHABET.indexOf(s);
}

function getDecodedString(encoded: string): string {
  const v0 = getEncryptKeyPosition(encoded[encoded.length - 2]);
  const v1 = getEncryptKeyPosition(encoded[encoded.length - 1]);
  const p0 = encoded.slice(0, encoded.length - 2);
  const result = p0.slice(0, v0) + p0.slice(v0 + v1);
  const decoded = Buffer.from(result, "base64").toString("utf-8").trim();
  return decoded;
}

function encodeForApk(jsonStr: string): string {
  const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");
  const pos1 = Math.min(5, b64.length - 1);
  const pos2 = 3;
  const junk = "X".repeat(pos2);
  const obfuscated = b64.slice(0, pos1) + junk + b64.slice(pos1);
  return obfuscated + ALPHABET[pos1] + ALPHABET[pos2];
}

describe("encodeForApk / getDecodedString", () => {
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

  it("deve decodificar o Base64 da requisição do APK corretamente", () => {
    // O APK envia: Base64 de {"app_device_id":"AA:BB:CC:DD:EE:FF","app_type":"android","version":"5.0","is_paid":false}
    const b64 = "eyJhcHBfZGV2aWNlX2lkIjoiQUE6QkI6Q0M6REQ6RUU6RkYiLCJhcHBfdHlwZSI6ImFuZHJvaWQiLCJ2ZXJzaW9uIjoiNS4wIiwiaXNfcGFpZCI6ZmFsc2V9";
    const cleaned = b64.replace(/\s/g, "");
    const decoded = Buffer.from(cleaned, "base64").toString("utf-8").trim();
    const parsed = JSON.parse(decoded);
    expect(parsed.app_device_id).toBe("AA:BB:CC:DD:EE:FF");
    expect(parsed.app_type).toBe("android");
    expect(parsed.version).toBe("5.0");
    expect(parsed.is_paid).toBe(false);
  });
});
