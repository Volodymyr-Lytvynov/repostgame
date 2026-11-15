import { describe, expect, it } from "vitest";
import { normalizeRoomCode } from "./code";

describe("normalizeRoomCode", () => {
  it("turns cyrillic lookalikes into the latin room code", () => {
    expect(normalizeRoomCode("мвек")).toBe("MBEK");
    expect(normalizeRoomCode(" МВ ЕК ")).toBe("MBEK");
    expect(normalizeRoomCode("ab12")).toBe("AB12");
  });
});