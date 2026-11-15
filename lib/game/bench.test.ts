import { describe, expect, it } from "vitest";
import { benchScores } from "./bench";

describe("bench scores", () => {
  it("splits a duel pool", () => {
    expect(benchScores([3, 1])).toEqual([750, 250]);
  });

  it("doubles when the optional finale switch is on", () => {
    expect(benchScores([1, 1], true)).toEqual([1000, 1000]);
  });

  it("pays nothing when the ballot is empty", () => {
    expect(benchScores([0, 0])).toEqual([0, 0]);
  });
});
