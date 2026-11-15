import { derange, mulberry32, shuffle } from "./random";
import type { Assignment, Mode } from "./types";

export function isDuel(mode: Mode): boolean {
  return mode === "ratio" || mode === "explain";
}

export function assignmentId(round: number, prompt: number, slot: number): string {
  return `a${round}p${prompt}s${slot}`;
}

export function duelId(round: number, prompt: number): string {
  return `d${round}-${prompt}`;
}

export function sideId(round: number, prompt: number, slot: number): string {
  return `e${round}-${prompt}-${slot}`;
}

export function roundId(round: number): string {
  return `r${round}`;
}

export function sharedId(round: number, prompt: number): string {
  return `s${round}-${prompt}`;
}

export function buildAssignments(seats: readonly string[], playlist: readonly Mode[], seed: number): Assignment[] {
  const random = mulberry32(seed);
  const assignments: Assignment[] = [];
  playlist.forEach((mode, round) => {
    const count = seats.length;
    if (mode === "dms") {
      const writers = derange(seats, random);
      for (let index = 0; index < count; index += 1) {
        assignments.push(make(round, index, seats[index], 0, "answer"));
        assignments.push(make(round, index, writers[index], 1, "context"));
      }
      return;
    }
    const role = mode === "sabotage" ? "fragment" : "reply";
    for (let index = 0; index < count; index += 1) {
      assignments.push(make(round, index, seats[index], 0, role));
      assignments.push(make(round, index, seats[(index + 1) % count], 1, role));
    }
  });
  return assignments;
}

export function revealOrders(playlist: readonly Mode[], count: number, seed: number): number[][] {
  return playlist.map((mode, round) => {
    const indexes = Array.from({ length: count }, (_, index) => index);
    if (!isDuel(mode)) return indexes;
    return shuffle(indexes, mulberry32(seed + 17 * (round + 1)));
  });
}

function make(round: number, prompt: number, playerId: string, slot: number, role: Assignment["role"]): Assignment {
  return { id: assignmentId(round, prompt, slot), round, prompt, playerId, slot, role };
}
