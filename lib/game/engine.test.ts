import { describe, expect, it } from "vitest";
import { buildAssignments } from "./assign";
import { defaultConfig, defaultPlaylist } from "./content";
import { sides } from "./entries";
import {
  addPlayer,
  advancePhase,
  beginGenerating,
  castFavorite,
  freezeSession,
  freshRoom,
  GameError,
  nextMatch,
  removeSubmission,
  submit,
  tick,
  vote,
} from "./engine";
import { splitPool } from "./score";
import type { GameConfig, Mode, RoomState } from "./types";
import { validateSession } from "./validate";
import { capQueries } from "./images";

const NAMES = ["Olya", "Max", "Ira", "Lev", "Noa", "Kim", "Ada", "Gus"];

function config(playlist: Mode[]): GameConfig {
  return { ...defaultConfig(), rounds: playlist.length, playlist };
}

function seated(count: number, playlist: Mode[]): RoomState {
  let state = freshRoom({
    code: "TEST",
    hostToken: "host",
    cap: Math.max(4, count),
    demo: false,
    now: 0,
    config: config(playlist),
  });
  for (let index = 0; index < count; index += 1) {
    state = addPlayer(state, { id: `p${index}`, token: `t${index}`, name: NAMES[index], bot: false, host: index === 0, now: index });
  }
  return state;
}

function started(count: number, playlist: Mode[], raw: unknown = null): RoomState {
  const lobby = seated(count, playlist);
  const generating = beginGenerating(lobby, 0);
  return freezeSession(generating, validateSession(raw, generating.config, count), 1);
}

function writeAll(state: RoomState, textFor: (assignment: RoomState["assignments"][number]) => string): RoomState {
  let next = state;
  const mode = next.config.playlist[next.round];
  const role = mode === "dms" ? (next.writeStep === 0 ? "answer" : "context") : mode === "sabotage" ? "fragment" : "reply";
  const pending = next.assignments.filter((item) => item.round === next.round && item.role === role);
  for (const assignment of pending) next = submit(next, assignment.playerId, assignment.id, textFor(assignment), 1);
  return next;
}

describe("assignments", () => {
  it("gives six players six duels and two distinct opponents", () => {
    const state = started(6, ["ratio"]);
    const round = state.assignments.filter((item) => item.round === 0);
    expect(new Set(round.map((item) => item.prompt)).size).toBe(6);
    for (let seat = 0; seat < 6; seat += 1) {
      const mine = round.filter((item) => item.playerId === `p${seat}`);
      expect(mine).toHaveLength(2);
      const rivals = mine.map((item) => round.find((other) => other.prompt === item.prompt && other.playerId !== item.playerId)?.playerId);
      expect(new Set(rivals).size).toBe(2);
      expect(rivals).not.toContain(`p${seat}`);
    }
  });

  it("never hands a player their own DM answer", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const assignments = buildAssignments(["p0", "p1", "p2", "p3", "p4", "p5"], ["dms"], seed);
      for (let prompt = 0; prompt < 6; prompt += 1) {
        const answer = assignments.find((item) => item.prompt === prompt && item.role === "answer");
        const context = assignments.find((item) => item.prompt === prompt && item.role === "context");
        expect(answer?.playerId).not.toBe(context?.playerId);
      }
    }
  });

  it("puts sabotage fragments on different templates", () => {
    const state = started(6, ["sabotage"]);
    for (let seat = 0; seat < 6; seat += 1) {
      const mine = state.assignments.filter((item) => item.playerId === `p${seat}`);
      expect(mine).toHaveLength(2);
      expect(new Set(mine.map((item) => item.prompt)).size).toBe(2);
      expect(new Set(mine.map((item) => item.slot)).size).toBe(2);
    }
  });
});

describe("likes", () => {
  it("conserves a 1000 pool", () => {
    expect(splitPool([3, 1])).toEqual([750, 250]);
    expect(splitPool([1, 1])).toEqual([500, 500]);
    expect(splitPool([2, 1])).toEqual([667, 333]);
    expect(splitPool([0, 0])).toEqual([0, 0]);
    expect(splitPool([1, 1, 1]).reduce((sum, value) => sum + value, 0)).toBe(1000);
  });

  it("splits a counted duel 3 to 1 and badges a shutout", () => {
    let state = writeAll(advancePhase(started(6, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    expect(state.phase).toBe("reveal");
    state = advancePhase(state, 1);
    expect(state.phase).toBe("voting");
    const prompt = state.orders[0][state.contest];
    const [left, right] = sides(state, 0, prompt);
    const voters = state.seats.filter((id) => id !== left.playerId && id !== right.playerId);
    state = vote(state, voters[0], left.entryId, 1);
    state = vote(state, voters[1], left.entryId, 1);
    state = vote(state, voters[2], left.entryId, 1);
    state = vote(state, voters[3], right.entryId, 1);
    expect(state.phase).toBe("results");
    expect(state.scores[left.playerId]).toBe(750);
    expect(state.scores[right.playerId]).toBe(250);
    expect(state.config.finaleMultiplier).toBe(false);

    let shutout = writeAll(advancePhase(started(6, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    shutout = advancePhase(shutout, 1);
    const shutPrompt = shutout.orders[0][shutout.contest];
    const [winner, loser] = sides(shutout, 0, shutPrompt);
    const crowd = shutout.seats.filter((id) => id !== winner.playerId && id !== loser.playerId);
    for (const id of crowd) shutout = vote(shutout, id, winner.entryId, 1);
    expect(shutout.scores[winner.playerId]).toBe(1000);
    expect(shutout.scores[loser.playerId] ?? 0).toBe(0);
    expect(shutout.badges.some((badge) => badge.kind === "ratioed" && badge.playerId === winner.playerId)).toBe(true);
    expect(shutout.badges.some((badge) => badge.kind === "bro_fell_off" && badge.playerId === loser.playerId)).toBe(true);
  });

  it("pays nothing when nobody votes and 500 when a reply is alone", () => {
    let quiet = writeAll(advancePhase(started(4, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    quiet = advancePhase(quiet, 1);
    quiet = advancePhase(quiet, 1);
    expect(quiet.phase).toBe("results");
    expect(Object.values(quiet.scores).every((score) => score === 0)).toBe(true);

    let solo = writeAll(advancePhase(started(4, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    const prompt = solo.orders[0][0];
    const doomed = solo.assignments.find((item) => item.round === 0 && item.prompt === prompt && item.slot === 1);
    solo = removeSubmission(solo, `sub-${doomed?.id}`);
    solo = advancePhase(solo, 1);
    const survivor = sides(solo, 0, prompt)[0];
    expect(solo.scores[survivor.playerId]).toBe(500);
    expect(solo.scores[doomed?.playerId ?? ""] ?? 0).toBe(0);
  });

  it("skips identical replies without duel badges", () => {
    let state = writeAll(advancePhase(started(4, ["ratio"]), 1), (item) => `same ${item.prompt}`);
    state = advancePhase(state, 1);
    expect(state.phase).toBe("results");
    expect(Object.values(state.scores).every((score) => score === 0)).toBe(true);
    expect(state.badges.some((badge) => badge.kind === "shared_brain_cell")).toBe(true);
    expect(state.badges.some((badge) => badge.kind === "ratioed" || badge.kind === "bro_fell_off")).toBe(false);
  });

  it("pays leaked DMs 800/200 and drops a missing partner", () => {
    let state = advancePhase(started(4, ["dms"]), 1);
    state = writeAll(state, () => "I wanted to see how the professionals do it.");
    expect(state.writeStep).toBe(1);
    state = writeAll(state, (item) => `incoming ${item.prompt}`);
    expect(state.phase).toBe("reveal");
    state = advancePhase(state, 1);
    const entry = state.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.role === "answer");
    const context = state.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.role === "context");
    const voter = state.seats.find((id) => id !== entry?.playerId && id !== context?.playerId) ?? "p0";
    state = vote(state, voter, "s0-0", 1);
    expect(state.phase === "voting" || state.phase === "results").toBe(true);
    if (state.phase === "voting") state = advancePhase(state, 1);
    expect(state.scores[entry?.playerId ?? ""]).toBe(200);
    expect(state.scores[context?.playerId ?? ""]).toBe(800);

    let broken = advancePhase(started(4, ["dms"]), 1);
    broken = writeAll(broken, () => "It was free and I didn't want to go alone.");
    broken = writeAll(broken, (item) => `setup ${item.prompt}`);
    const missing = broken.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.role === "context");
    broken = removeSubmission(broken, `sub-${missing?.id}`);
    broken = advancePhase(broken, 1);
    const author = broken.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.role === "answer");
    const other = broken.seats.find((id) => id !== author?.playerId && id !== missing?.playerId) ?? "p0";
    if (broken.phase === "voting") {
      broken = vote(broken, other, "s0-0", 1);
      if (broken.phase === "voting") broken = advancePhase(broken, 1);
    }
    expect(broken.scores[author?.playerId ?? ""]).toBe(200);
    expect(broken.scores[missing?.playerId ?? ""] ?? 0).toBe(0);
  });

  it("splits sabotage and keeps the missing half", () => {
    let state = writeAll(advancePhase(started(4, ["sabotage"]), 1), (item) => `fragment ${item.prompt}-${item.slot}`);
    state = advancePhase(state, 1);
    const left = state.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.slot === 0);
    const right = state.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.slot === 1);
    const voter = state.seats.find((id) => id !== left?.playerId && id !== right?.playerId) ?? "p0";
    state = vote(state, voter, "s0-0", 1);
    if (state.phase === "voting") state = advancePhase(state, 1);
    expect(state.scores[left?.playerId ?? ""]).toBe(500);
    expect(state.scores[right?.playerId ?? ""]).toBe(500);

    let missing = writeAll(advancePhase(started(4, ["sabotage"]), 1), (item) => `fragment ${item.prompt}-${item.slot}`);
    const dropped = missing.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.slot === 1);
    const kept = missing.assignments.find((item) => item.round === 0 && item.prompt === 0 && item.slot === 0);
    missing = removeSubmission(missing, `sub-${dropped?.id}`);
    missing = advancePhase(missing, 1);
    const reader = missing.seats.find((id) => id !== kept?.playerId && id !== dropped?.playerId) ?? "p0";
    if (missing.phase === "voting") {
      missing = vote(missing, reader, "s0-0", 1);
      if (missing.phase === "voting") missing = advancePhase(missing, 1);
    }
    expect(missing.scores[kept?.playerId ?? ""]).toBe(500);
    expect(missing.scores[dropped?.playerId ?? ""] ?? 0).toBe(0);
  });

  it("doubles only when the host turned the finale on", () => {
    let state = seated(4, ["ratio"]);
    state = { ...state, config: { ...state.config, finaleMultiplier: true } };
    state = freezeSession(beginGenerating(state, 0), validateSession(null, state.config, 4), 1);
    state = writeAll(advancePhase(state, 1), (item) => `reply ${item.prompt}-${item.slot}`);
    state = advancePhase(state, 1);
    const prompt = state.orders[0][state.contest];
    const [left, right] = sides(state, 0, prompt);
    const voters = state.seats.filter((id) => id !== left.playerId && id !== right.playerId);
    state = vote(state, voters[0], left.entryId, 1);
    state = vote(state, voters[1], right.entryId, 1);
    expect(state.scores[left.playerId]).toBe(1000);
    expect(state.scores[right.playerId]).toBe(1000);
  });
});

describe("room rules", () => {
  it("rejects a self vote, a late join, and a short roster", () => {
    let state = writeAll(advancePhase(started(4, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    state = advancePhase(state, 1);
    const prompt = state.orders[0][state.contest];
    const [left] = sides(state, 0, prompt);
    expect(() => vote(state, left.playerId, left.entryId, 1)).toThrow(GameError);
    expect(() => addPlayer(state, { id: "late", token: "late", name: "Late", bot: false, host: false, now: 9 })).toThrow(GameError);
    expect(() => beginGenerating(seated(3, ["ratio"]), 1)).toThrow(GameError);
  });

  it("keeps assignments still on reconnect and opens a fresh cast next match", () => {
    const state = started(4, ["ratio"]);
    const again = tick(state, 2);
    expect(again.assignments).toEqual(state.assignments);
    expect(again.seats).toEqual(state.seats);
    let finished = state;
    for (let step = 0; step < 24 && finished.phase !== "favorites"; step += 1) {
      if (finished.phase === "writing") finished = writeAll(finished, (item) => `line ${item.id}`);
      else finished = advancePhase(finished, 1);
    }
    expect(finished.phase).toBe("favorites");
    const scores = { ...finished.scores };
    const favorite = `d0-${finished.orders[0][0]}`;
    const after = castFavorite(finished, "p0", favorite, 1);
    expect(after.scores).toEqual(scores);
    const rematch = nextMatch(advancePhase(after, 5), 5);
    expect(rematch.phase).toBe("lobby");
    expect(rematch.accounts).toHaveLength(0);
    expect(rematch.players).toHaveLength(4);
    expect(rematch.match).toBe(2);
  });

  it("hides a line after the score without changing likes", () => {
    let state = writeAll(advancePhase(started(4, ["ratio"]), 1), (item) => `reply ${item.prompt}-${item.slot}`);
    state = advancePhase(state, 1);
    state = advancePhase(state, 1);
    const before = { ...state.scores };
    const prompt = state.orders[0][state.contest];
    const submission = state.assignments.find((item) => item.round === 0 && item.prompt === prompt);
    state = removeSubmission(state, `sub-${submission?.id}`);
    expect(state.scores).toEqual(before);
    expect(state.submissions.find((item) => item.id === `sub-${submission?.id}`)?.hidden).toBe(true);
  });
});

describe("fallback session", () => {
  it("builds a playable text session in either language", () => {
    for (const language of ["en", "ru"] as const) {
      const playlist = defaultPlaylist(3);
      const manifest = validateSession({ accounts: [{ name: "Nope", handle: "!!!" }] }, { ...defaultConfig(language), playlist, rounds: 3 }, 6);
      expect(manifest.prompts).toHaveLength(3);
      expect(manifest.prompts[0]).toHaveLength(6);
      expect(manifest.prompts[1]).toHaveLength(6);
      expect(manifest.prompts[2]).toHaveLength(6);
      expect(new Set(manifest.accounts.map((account) => account.handle)).size).toBe(manifest.accounts.length);
      expect(manifest.accounts.length).toBeGreaterThanOrEqual(8);
      const post = manifest.prompts[0][0];
      expect(post.kind).toBe("post");
      if (language === "ru" && post.kind === "post") expect(post.text).toMatch(/[А-Яа-я]/);
    }
    const frozen = started(6, defaultPlaylist(3));
    expect(frozen.phase).toBe("round_intro");
    expect(frozen.accounts.every((account) => account.image === null)).toBe(true);
  });

  it("keeps a real post and never asks for more image queries than the budget", () => {
    const manifest = validateSession(
      {
        images: ["cats in hats"],
        accounts: [{ name: "Cat", handle: "cat_ok", avatar: 0 }],
        rounds: [{ mode: "ratio", posts: [{ account: 0, text: "hello from the model post today" }] }],
      },
      { ...defaultConfig(), playlist: ["ratio", "dms", "explain"], rounds: 3 },
      4,
    );
    expect(manifest.source).toBe("model");
    expect(manifest.prompts[0][0]).toMatchObject({ kind: "post", text: "hello from the model post today" });
    expect(manifest.prompts[0]).toHaveLength(4);
    expect(capQueries(["a", "a", "b", "c", "d", "e", "f", "g"], 6)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
