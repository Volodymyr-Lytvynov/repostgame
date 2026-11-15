import { isDuel } from "./assign";
import { contestIdFor, currentPromptIndex, duelOutcome, sharedEntries, sides } from "./entries";
import { t } from "./i18n";
import type { Badge, RoomState, ScoreEvent } from "./types";

export function splitPool(counts: readonly number[], pool = 1000): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((count) => (count / total) * pool);
  const floors = exact.map((value) => Math.floor(value));
  let left = pool - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (left <= 0) break;
    floors[item.index] += 1;
    left -= 1;
  }
  return floors;
}

export function scoreContest(state: RoomState): { contest: string; events: ScoreEvent[]; badges: Badge[] } {
  const mode = state.config.playlist[state.round] ?? "ratio";
  if (isDuel(mode)) return scoreDuel(state, state.round, currentPromptIndex(state));
  return scoreShared(state, state.round);
}

export function viralBadges(state: RoomState, round: number): Badge[] {
  const mode = state.config.playlist[round];
  const shares: Array<{ players: string[]; share: number }> = [];
  if (!mode) return [];
  if (isDuel(mode)) {
    const count = state.prompts[round]?.length ?? 0;
    for (let prompt = 0; prompt < count; prompt += 1) {
      if (duelOutcome(state, round, prompt) !== "contest") continue;
      const pair = sides(state, round, prompt);
      const votes = votesFor(state, `d${round}-${prompt}`);
      if (votes.length === 0) continue;
      for (const side of pair) {
        const countForSide = votes.filter((vote) => vote.entryId === side.entryId).length;
        shares.push({ players: [side.playerId], share: countForSide / votes.length });
      }
    }
  } else {
    const votes = votesFor(state, `r${round}`);
    if (votes.length === 0) return [];
    for (const entry of sharedEntries(state, round)) {
      if (!entry.votable) continue;
      const countForEntry = votes.filter((vote) => vote.entryId === entry.id).length;
      const players = entry.sides.filter((side) => side.credited).map((side) => side.playerId);
      shares.push({ players, share: countForEntry / votes.length });
    }
  }
  const best = Math.max(-1, ...shares.map((item) => item.share));
  if (best <= 0) return [];
  const badges: Badge[] = [];
  for (const item of shares) {
    if (item.share !== best) continue;
    for (const playerId of item.players) {
      badges.push({ kind: "viral", playerId, round, contest: `viral-${round}` });
    }
  }
  return badges;
}

export function chronicBadges(state: RoomState): Badge[] {
  const best = Math.max(0, ...state.seats.map((id) => state.scores[id] ?? 0));
  if (best <= 0) return [];
  return state.seats
    .filter((id) => (state.scores[id] ?? 0) === best)
    .map((playerId) => ({
      kind: "chronically_online" as const,
      playerId,
      round: Math.max(0, state.config.playlist.length - 1),
    }));
}

function scoreDuel(state: RoomState, round: number, prompt: number) {
  const contest = `d${round}-${prompt}`;
  const pair = sides(state, round, prompt);
  const outcome = duelOutcome(state, round, prompt);
  const multiplier = finaleMultiplier(state, round);
  if (outcome === "skip") {
    return {
      contest,
      events: [] as ScoreEvent[],
      badges: pair.map((side) => ({ kind: "shared_brain_cell" as const, playerId: side.playerId, round, contest })),
    };
  }
  if (outcome === "empty") return { contest, events: [] as ScoreEvent[], badges: [] as Badge[] };
  if (outcome === "uncontested") {
    const only = pair.find((side) => side.credited);
    if (!only) return { contest, events: [] as ScoreEvent[], badges: [] as Badge[] };
    return {
      contest,
      events: [event(state, round, contest, only.playerId, 500 * multiplier, t(state.config.language, "uncontestedReason"))],
      badges: [] as Badge[],
    };
  }
  const votes = votesFor(state, contest);
  const counts = pair.map((side) => votes.filter((vote) => vote.entryId === side.entryId).length);
  if (counts[0] + counts[1] === 0) return { contest, events: [] as ScoreEvent[], badges: [] as Badge[] };
  const shares = splitPool(counts).map((value) => value * multiplier);
  const events = pair.flatMap((side, index) =>
    shares[index] > 0 ? [event(state, round, contest, side.playerId, shares[index], t(state.config.language, "likesReason", { n: shares[index] }))] : [],
  );
  const badges: Badge[] = [];
  const cast = counts[0] + counts[1];
  if (cast >= 3 && (counts[0] === 0 || counts[1] === 0)) {
    const winner = counts[0] > counts[1] ? 0 : 1;
    badges.push({ kind: "ratioed", playerId: pair[winner].playerId, round, contest });
  }
  pair.forEach((side, index) => {
    if (counts[index] === 0 && counts[1 - index] > 0) {
      badges.push({ kind: "bro_fell_off", playerId: side.playerId, round, contest });
    }
  });
  return { contest, events, badges };
}

function scoreShared(state: RoomState, round: number) {
  const contest = `r${round}`;
  const mode = state.config.playlist[round];
  const votes = votesFor(state, contest);
  const entries = sharedEntries(state, round).filter((entry) => entry.votable);
  const counts = new Map(entries.map((entry) => [entry.id, votes.filter((vote) => vote.entryId === entry.id).length]));
  const best = Math.max(0, ...counts.values());
  const multiplier = finaleMultiplier(state, round);
  const events: ScoreEvent[] = [];
  const badges: Badge[] = [];
  for (const entry of entries) {
    const count = counts.get(entry.id) ?? 0;
    if (!count) continue;
    const [answer, context] = entry.sides;
    if (mode === "dms") {
      pushShare(state, events, round, contest, answer, 200 * count * multiplier);
      pushShare(state, events, round, contest, context, 800 * count * multiplier);
    } else {
      pushShare(state, events, round, contest, answer, 500 * count * multiplier);
      pushShare(state, events, round, contest, context, 500 * count * multiplier);
    }
    if (count !== best) continue;
    if (mode === "dms" && answer.credited) {
      badges.push({ kind: "digital_footprint", playerId: answer.playerId, round, contest });
    }
    for (const side of entry.sides) {
      if (!side.credited) continue;
      badges.push({ kind: "partners_in_crime", playerId: side.playerId, round, contest });
    }
  }
  return { contest, events, badges };
}

function pushShare(state: RoomState, events: ScoreEvent[], round: number, contest: string, side: { playerId: string; credited: boolean }, delta: number) {
  if (!side.credited || delta <= 0) return;
  events.push(event(state, round, contest, side.playerId, delta, t(state.config.language, "likesReason", { n: delta })));
}

function votesFor(state: RoomState, contest: string) {
  return state.votes.filter((vote) => vote.contest === contest);
}

function finaleMultiplier(state: RoomState, round: number): number {
  return state.config.finaleMultiplier && round === state.config.playlist.length - 1 ? 2 : 1;
}

function event(state: RoomState, round: number, contest: string, playerId: string, delta: number, reason: string): ScoreEvent {
  return { round, contest, playerId, delta, reason };
}

export function activeContest(state: RoomState): string {
  return contestIdFor(state);
}
