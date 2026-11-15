import { splitPool } from "./score";

export function benchScores(votes: readonly number[], finale = false): number[] {
  const counts = votes.map((vote) => Math.max(0, Math.floor(Number.isFinite(vote) ? vote : 0)));
  const shares = splitPool(counts);
  return finale ? shares.map((share) => share * 2) : shares;
}
