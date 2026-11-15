import { describe, expect, it } from "vitest";
import { benchScores } from "./bench";

const rows = [
  { write: "фраза 0", twist: "подкол 0", photo: null },
  { write: "фраза 1", twist: "подкол 1", photo: null },
  { write: "фраза 2", twist: "подкол 2", photo: null },
];

describe("bench scores", () => {
  it("pays the twister and adds the lead bonus", () => {
    const scores = benchScores({
      kind: "messenger",
      finale: false,
      rows,
      votes: [1, 1, 0],
    });
    expect(scores.find((score) => score.name === "Ира")?.delta).toBe(400);
    expect(scores.find((score) => score.name === "Макс")?.delta).toBe(100);
  });

  it("doubles the finale and ignores a vote for your own twist", () => {
    const scores = benchScores({
      kind: "thread",
      finale: true,
      rows,
      votes: [1, 1, 1],
    });
    expect(scores).toEqual([{ name: "Ира", delta: 800, reason: expect.stringContaining("финал") }]);
  });

  it("does not score a card without a twist", () => {
    const scores = benchScores({
      kind: "job",
      finale: false,
      rows: rows.map((row, seat) => (seat === 1 ? { ...row, twist: "  " } : row)),
      votes: [1, 2, 1],
    });
    expect(scores.map((score) => score.name)).toEqual(["Оля"]);
  });
});
