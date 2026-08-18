import { describe, expect, it } from "vitest";
import { collectDnsTargetDeviceIds, urlUsesDnsHost } from "./remoteCommandDns";

describe("remoteCommandDns", () => {
  it("reconhece URLs vinculadas à DNS sem confundir hosts parecidos", () => {
    expect(urlUsesDnsHost("https://fenix.example.com:8080/get.php?u=1", "https://fenix.example.com:8080")).toBe(true);
    expect(urlUsesDnsHost("https://fenix.example.com:80801/get.php", "https://fenix.example.com:8080")).toBe(false);
  });

  it("inclui cada MAC uma vez mesmo quando a DNS está em mais de uma lista", () => {
    const targetIds = collectDnsTargetDeviceIds(
      [{ id: 10, urlM3u8: "https://outra.example/lista" }, { id: 11, urlM3u8: "https://fenix.example/live" }],
      [
        { deviceId: 10, urlM3u8: "https://fenix.example/lista2" },
        { deviceId: 11, xtServer: "https://fenix.example" },
      ],
      "https://fenix.example",
    );
    expect(targetIds.sort()).toEqual([10, 11]);
  });
});
