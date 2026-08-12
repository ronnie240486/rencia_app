import { describe, expect, it } from "vitest";
import { getConnectionState } from "./customerProfile";

describe("ficha 360° do cliente", () => {
  it("identifica conexão online apenas nos últimos 30 minutos", () => {
    const now = new Date("2026-08-12T12:00:00Z");
    expect(getConnectionState(new Date("2026-08-12T11:30:00Z"), now)).toBe("online");
    expect(getConnectionState(new Date("2026-08-12T11:29:59Z"), now)).toBe("offline");
    expect(getConnectionState(null, now)).toBe("offline");
  });
});
