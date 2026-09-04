import { describe, expect, it } from "vitest";
import { hasActiveDeviceUsingDns, isDnsOperationalInApk } from "./dnsOperationalStatus";

describe("dnsOperationalStatus", () => {
  const now = Date.parse("2026-09-04T00:00:00.000Z");

  it("confirma a DNS quando um cliente liberado está ativo usando o host", () => {
    expect(hasActiveDeviceUsingDns([
      { status: "Liberado", urlM3u8: "http://ronie35.ufcfan.org/get.php?username=x", lastSeen: now - 5 * 60 * 1000 },
    ], "http://ronie35.ufcfan.org", now)).toBe(true);
  });

  it("não confirma DNS por cliente bloqueado, sem URL ou fora da janela", () => {
    expect(isDnsOperationalInApk({ status: "Bloqueado", urlM3u8: "http://ronie35.ufcfan.org/get.php", lastSeen: now }, "http://ronie35.ufcfan.org", now)).toBe(false);
    expect(isDnsOperationalInApk({ status: "Liberado", urlM3u8: "http://outro.example/get.php", lastSeen: now }, "http://ronie35.ufcfan.org", now)).toBe(false);
    expect(isDnsOperationalInApk({ status: "Liberado", urlM3u8: "http://ronie35.ufcfan.org/get.php", lastSeen: now - 121 * 60 * 1000 }, "http://ronie35.ufcfan.org", now)).toBe(false);
  });
});
