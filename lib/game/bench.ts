import { PALETTE, limits } from "./content";
import { cleanText, freshRoom, isShowable, scoreRound, sourceSeatFor, twisterSeat } from "./engine";
import type { RoundKind } from "./types";

export const BENCH_NAMES = ["Оля", "Макс", "Ира", "Лёша", "Марина", "Богдан", "Света", "Тимур"];

export type BenchRow = {
  write: string;
  twist: string;
  photo: number | null;
};

export type BenchScore = {
  name: string;
  delta: number;
  reason: string;
};

export function benchScores(input: {
  kind: RoundKind;
  finale: boolean;
  rows: BenchRow[];
  votes: Array<number | null>;
}): BenchScore[] {
  const count = input.rows.length;
  const ids = Array.from({ length: count }, (_, seat) => `p${seat}`);
  const max = limits(input.kind);
  let state = freshRoom({
    code: "BENCH",
    hostToken: "bench",
    cap: count,
    demo: false,
    playlist: input.finale ? [input.kind] : [input.kind, input.kind],
    now: 0,
  });
  state = {
    ...state,
    status: "playing",
    phase: "vote",
    round: 0,
    seats: ids,
    players: ids.map((id, seat) => ({
      id,
      token: id,
      name: BENCH_NAMES[seat] ?? `Игрок ${seat + 1}`,
      color: PALETTE[seat % PALETTE.length],
      bot: false,
      host: seat === 0,
      joinedAt: seat,
    })),
    submissions: input.rows.map((row, seat) => ({
      round: 0,
      seat,
      authorId: ids[seat],
      text: input.kind === "instagram" ? "" : cleanText(row.write, max.write),
      photo: row.photo,
    })),
    twists: input.rows.map((row, seat) => ({
      round: 0,
      seat,
      twisterId: ids[twisterSeat(seat, count)],
      text: cleanText(row.twist, max.twist),
    })),
    votes: [],
    log: [],
  };
  state = {
    ...state,
    votes: input.votes.flatMap((seat, voter) => {
      if (seat === null || seat === sourceSeatFor(voter, count) || !isShowable(state, seat)) return [];
      return [{ round: 0, voterId: ids[voter], seat }];
    }),
  };
  return scoreRound(state).map((event) => ({
    name: state.players.find((player) => player.id === event.playerId)?.name ?? event.playerId,
    delta: event.delta,
    reason: event.reason,
  }));
}
