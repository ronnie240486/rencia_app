import { describe, expect, it } from "vitest";
import { orderDeviceUrlsForActive } from "./devicePlaylistOrder";

describe("prioridade de playlist ativa", () => {
  const lists = [{ id: 10, name: "Lista 2" }, { id: 20, name: "Lista 3" }];

  it("entrega a lista reserva ativa como a primeira playlist do aplicativo", () => {
    expect(orderDeviceUrlsForActive(lists, 20).map((item) => item.id)).toEqual([20, 10]);
  });

  it("mantém a ordem cadastrada quando a Lista 1 está ativa", () => {
    expect(orderDeviceUrlsForActive(lists, null).map((item) => item.id)).toEqual([10, 20]);
  });
});
