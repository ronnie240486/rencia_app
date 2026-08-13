import { describe, expect, it } from "vitest";
import { listAlertTitle, listRecoveryAlertTitle, resolveListAlertTransition } from "./listFailureAlerts";

describe("alertas de falha confirmada de lista", () => {
  it("não alerta quando existe apenas uma falha técnica", () => {
    expect(resolveListAlertTransition(["error"], null)).toBeNull();
  });

  it("alerta apenas após duas falhas técnicas consecutivas", () => {
    expect(resolveListAlertTransition(["error", "error"], null)).toBe("failure");
    expect(resolveListAlertTransition(["error", "error"], "critical")).toBeNull();
  });

  it("registra recuperação apenas após um alerta crítico anterior", () => {
    expect(resolveListAlertTransition(["success", "error"], "critical")).toBe("recovery");
    expect(resolveListAlertTransition(["success", "error"], null)).toBeNull();
  });

  it("usa um título de recuperação diferente do título de falha", () => {
    const target = { deviceId: 9, listName: "Lista 1", deviceName: "Cliente" };
    expect(listRecoveryAlertTitle(target)).toBe("Lista recuperada: Lista 1 · Cliente #9");
    expect(listRecoveryAlertTitle(target)).not.toBe(listAlertTitle(target));
  });
});
