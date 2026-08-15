import { describe, expect, it } from "vitest";
import { getUnseenNoticeIds, parseSeenNoticeIds } from "../client/src/components/noticeSeen";

describe("avisos vistos no painel", () => {
  it("identifica avisos novos mesmo após o modal ter sido fechado no mesmo dia", () => {
    expect(getUnseenNoticeIds([{ id: 10 }, { id: 11 }], ["10"])).toEqual(["11"]);
  });

  it("ignora dados inválidos preservados no navegador", () => {
    expect(parseSeenNoticeIds("not-json")).toEqual([]);
    expect(parseSeenNoticeIds('["4", 5]')).toEqual(["4", "5"]);
  });
});
