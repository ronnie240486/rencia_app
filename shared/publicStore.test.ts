import { describe, expect, it } from "vitest";
import { PUBLIC_STORE_URL } from "./publicStore";

describe("PUBLIC_STORE_URL", () => {
  it("usa uma URL HTTPS curta e pública para a loja", () => {
    expect(PUBLIC_STORE_URL).toBe("https://tinyurl.com/2yd22mgj");
    expect(new URL(PUBLIC_STORE_URL).protocol).toBe("https:");
  });
});
