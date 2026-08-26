import { describe, expect, it } from "vitest";
import { selectActivityDevice } from "./activityDeviceSelection";

describe("selectActivityDevice", () => {
  const sameMacRows = [
    { id: 1, app: "Excellence" },
    { id: 2, app: "Magnus" },
    { id: 3, app: "Ominus" },
  ];

  it("seleciona Magnus quando o APK informa seu app_id no mesmo MAC", () => {
    expect(selectActivityDevice(sameMacRows, "magnus")).toMatchObject({ id: 2, app: "Magnus" });
  });

  it("aceita o nome visual Magnus TV para marcar o cadastro Magnus", () => {
    expect(selectActivityDevice(sameMacRows, "Magnus TV")).toMatchObject({ id: 2, app: "Magnus" });
  });

  it("seleciona Ominus sem atualizar o cadastro Excellence", () => {
    expect(selectActivityDevice(sameMacRows, "ominus")).toMatchObject({ id: 3, app: "Ominus" });
  });

  it("não escolhe um cadastro por adivinhação quando o APK não informa aplicativo", () => {
    expect(selectActivityDevice(sameMacRows, undefined)).toBeUndefined();
  });
});
