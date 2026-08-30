import { describe, expect, it } from "vitest";
import { buildHeartbeatMacLookup } from "./heartbeatMac";

describe("heartbeat MAC lookup", () => {
  it("inclui o formato canônico quando o APK envia MAC sem dois-pontos", () => {
    const lookup = buildHeartbeatMacLookup("6a55e2dbc34a");
    expect(lookup.canonical).toBe("6A:55:E2:DB:C3:4A");
    expect(lookup.candidates).toContain("6A:55:E2:DB:C3:4A");
    expect(lookup.candidates).toContain("6a55e2dbc34a");
  });

  it("aceita o formato com dois-pontos sem duplicar candidatos", () => {
    const lookup = buildHeartbeatMacLookup("6A:55:E2:DB:C3:4A");
    expect(lookup.canonical).toBe("6A:55:E2:DB:C3:4A");
    expect(new Set(lookup.candidates).size).toBe(lookup.candidates.length);
  });
});
