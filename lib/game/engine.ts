import { buildAssignments, duelId, isDuel, revealOrders, roundId } from "./assign";
import { botLine, botNames, defaultConfig, isMode, PALETTE, taskLimit, clampRounds, defaultPlaylist } from "./content";
import { currentMode, currentPromptIndex, duelOutcome, legalEntryIds, sharedEntries, stepRole, submissionFor } from "./entries";
import { t } from "./i18n";
import { hashSeed, mulberry32, shuffle } from "./random";
import { activeContest, chronicBadges, scoreContest, viralBadges } from "./score";
import type { AccountDraft, Badge, FictionalAccount, GameConfig, ImageGroup, Language, Phase, Player, RoomState, ScoreEvent, SessionManifest } from "./types";
import { validateSession } from "./validate";

export class GameError extends Error {}

export function duration(state: Pick<RoomState, "phase" | "demo" | "writeStep" | "config" | "round">): number {
  const mode = state.config.playlist[state.round] ?? "ratio";
  const demo = state.demo;
  switch (state.phase) {
    case "lobby":
    case "game_over":
      return 0;
    case "generating":
      return demo ? 8000 : 25000;
    case "round_intro":
      return demo ? 2000 : 5000;
    case "writing":
      if (mode === "dms" && state.writeStep === 0) return demo ? 6000 : 30000;
      if (mode === "dms" || mode === "sabotage") return demo ? 7000 : 45000;
      return demo ? 8000 : 60000;
    case "reveal":
      return demo ? 2500 : 8000;
    case "voting":
      return isDuel(mode) ? (demo ? 5000 : 15000) : demo ? 6000 : 20000;
    case "results":
    case "leaderboard":
      return demo ? 3000 : 8000;
    case "favorites":
      return demo ? 6000 : 20000;
    default:
      return 0;
  }
}

export function freshRoom(input: {
  code: string;
  hostToken: string;
  cap: number;
  demo: boolean;
  now: number;
  config?: GameConfig;
  match?: number;
}): RoomState {
  const state: RoomState = {
    code: input.code,
    demo: input.demo,
    cap: input.cap,
    hostToken: input.hostToken,
    match: input.match ?? 1,
    createdAt: input.now,
    players: [],
    status: "lobby",
    phase: "lobby",
    config: input.config ?? defaultConfig(),
    round: 0,
    writeStep: 0,
    contest: 0,
    accounts: [],
    imageGroups: [],
    prompts: [],
    assignments: [],
    orders: [],
    submissions: [],
    votes: [],
    favorites: [],
    scores: {},
    log: [],
    badges: [],
    scored: [],
    deadline: null,
    seats: [],
    seed: 0,
    generationLock: null,
    generationToken: null,
    promptSource: null,
    debug: false,
    paused: false,
    pauseRemaining: null,
  };
  return input.demo ? addDemoBots(state, input.now) : state;
}

export function applySettings(state: RoomState, patch: Partial<GameConfig>): RoomState {
  if (state.phase !== "lobby") fail(state, "settingsLobby");
  const language = patch.language === "en" || patch.language === "ru" ? patch.language : state.config.language;
  const intensity = patch.intensity === "casual" || patch.intensity === "unhinged" || patch.intensity === "footprint" ? patch.intensity : state.config.intensity;
  const rounds = patch.rounds === undefined ? state.config.rounds : clampRounds(patch.rounds);
  let playlist = patch.playlist ?? (patch.rounds === undefined ? state.config.playlist : defaultPlaylist(rounds));
  if (playlist.length !== rounds || playlist.some((mode) => !isMode(mode))) playlist = defaultPlaylist(rounds);
  return {
    ...state,
    config: {
      ...state.config,
      language,
      intensity,
      rounds,
      playlist,
      exclusions: patch.exclusions === undefined ? state.config.exclusions : cleanText(patch.exclusions, 120),
      finaleMultiplier: patch.finaleMultiplier === undefined ? state.config.finaleMultiplier : Boolean(patch.finaleMultiplier),
      searchBudget: 6,
    },
  };
}

export function setCap(state: RoomState, cap: number): RoomState {
  if (state.phase !== "lobby") fail(state, "capLobby");
  if (cap < 4 || cap > 8) fail(state, "capRange");
  if (cap < state.players.length) fail(state, "capSmall");
  return { ...state, cap };
}

export function addPlayer(state: RoomState, player: Omit<Player, "color" | "joinedAt" | "name"> & { name: string; now: number }): RoomState {
  if (state.phase !== "lobby") fail(state, "alreadyStarted");
  if (state.players.length >= state.cap) fail(state, "roomFull");
  const name = cleanName(player.name, state.config.language);
  if (state.players.some((item) => item.name.toLowerCase() === name.toLowerCase())) fail(state, "nameTaken");
  return {
    ...state,
    players: [
      ...state.players,
      {
        id: player.id,
        token: player.token,
        name,
        color: PALETTE[state.players.length % PALETTE.length],
        bot: player.bot,
        host: player.host,
        joinedAt: player.now,
      },
    ],
  };
}

export function addBot(state: RoomState, now: number): RoomState {
  if (!state.debug) fail(state, "botsDebug");
  if (state.phase !== "lobby") fail(state, "botsLobby");
  const names = botNames(state.config.language);
  const name = names.find((item) => !state.players.some((player) => player.name === item)) ?? `Bot ${state.players.length + 1}`;
  return addPlayer(state, {
    id: `bot-${state.players.length}-${state.code}`,
    token: `bot-token-${state.players.length}-${state.code}`,
    name,
    bot: true,
    host: false,
    now,
  });
}

export function beginGenerating(state: RoomState, now: number): RoomState {
  if (state.phase !== "lobby") fail(state, "alreadyStarted");
  if (state.players.length < 4) fail(state, "needFour");
  const seats = [...state.players].sort((a, b) => a.joinedAt - b.joinedAt).map((player) => player.id);
  const next: RoomState = {
    ...state,
    status: "playing",
    phase: "generating",
    seats,
    seed: hashSeed([state.code, String(state.match), ...seats]),
    scores: Object.fromEntries(seats.map((id) => [id, 0])),
    submissions: [],
    votes: [],
    favorites: [],
    log: [],
    badges: [],
    scored: [],
    round: 0,
    contest: 0,
    writeStep: 0,
    prompts: [],
    assignments: [],
    orders: [],
    accounts: [],
    generationLock: null,
    generationToken: null,
    promptSource: null,
  };
  return { ...next, ...schedule(next, now, "generating") };
}

export function claimGeneration(state: RoomState, now: number, token: string): RoomState {
  if (state.phase !== "generating" || state.prompts.length > 0) return state;
  if (state.generationLock && now - state.generationLock < 40_000) return state;
  return { ...state, generationLock: now, generationToken: token };
}

export function freezeSession(state: RoomState, manifest: SessionManifest, now: number): RoomState {
  if (state.phase !== "generating") return state;
  const random = mulberry32(state.seed || 1);
  const accounts = attachImages(manifest.accounts, manifest.imageGroups, random);
  const next: RoomState = {
    ...state,
    accounts,
    imageGroups: manifest.imageGroups,
    prompts: manifest.prompts,
    assignments: buildAssignments(state.seats, state.config.playlist, state.seed || 1),
    orders: revealOrders(state.config.playlist, state.seats.length, state.seed || 1),
    promptSource: manifest.source,
    generationLock: null,
    phase: "round_intro",
    round: 0,
    contest: 0,
    writeStep: 0,
  };
  return { ...next, ...schedule(next, now, "round_intro") };
}

export function fallbackManifest(state: RoomState): SessionManifest {
  return validateSession(null, state.config, state.seats.length || state.players.length);
}

export function tick(state: RoomState, now: number): RoomState {
  if (state.status === "finished" || state.paused) return state;
  if (state.phase === "lobby") {
    if (state.demo && !state.debug && state.players.length >= 4) return beginGenerating(state, now);
    return state;
  }
  if (state.phase === "generating" || state.phase === "game_over") return state;
  const withBots = applyBotMoves(state, now);
  if (!shouldAdvance(withBots, now)) return withBots;
  return advancePhase(withBots, now);
}

export function setDebug(state: RoomState, on: boolean, now: number): RoomState {
  if (!on && state.paused) return { ...resumeGame(state, now), debug: false };
  return { ...state, debug: on };
}

export function pauseGame(state: RoomState, now: number): RoomState {
  if (state.phase === "lobby" || state.phase === "game_over" || state.paused) return state;
  const remaining = state.deadline === null ? duration(state) : Math.max(0, state.deadline - now);
  return { ...state, debug: true, paused: true, deadline: null, pauseRemaining: remaining };
}

export function resumeGame(state: RoomState, now: number): RoomState {
  if (!state.paused) return state;
  return {
    ...state,
    paused: false,
    deadline: now + (state.pauseRemaining ?? duration(state)),
    pauseRemaining: null,
  };
}

export function advancePhase(state: RoomState, now: number): RoomState {
  if (state.phase === "round_intro") return beginWriting(state, now);
  if (state.phase === "writing") {
    const filled = fillMissingBots(state);
    if (currentMode(filled) === "dms" && filled.writeStep === 0) {
      const next = { ...filled, writeStep: 1, phase: "writing" as const };
      return { ...next, ...schedule(next, now, "writing", 1) };
    }
    return beginReveal(filled, now);
  }
  if (state.phase === "reveal") return afterReveal(state, now);
  if (state.phase === "voting") return beginResults(applyCurrentScore(state), now);
  if (state.phase === "results") return afterResults(state, now);
  if (state.phase === "leaderboard") return afterLeaderboard(state, now);
  if (state.phase === "favorites") return finishGame(state);
  return state;
}

export function submit(state: RoomState, playerId: string, assignmentId: string, text: string, now: number): RoomState {
  if (state.phase !== "writing") fail(state, "notWriting");
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment || assignment.playerId !== playerId || assignment.round !== state.round || assignment.role !== stepRole(state)) {
    fail(state, "notYourTask");
  }
  const clean = cleanText(text, taskLimit(assignment.role));
  if (!clean) fail(state, "emptyText");
  const submissions = state.submissions.filter((item) => item.assignmentId !== assignmentId);
  submissions.push({ id: `sub-${assignmentId}`, assignmentId, playerId, text: clean, removed: false, hidden: false });
  return tick({ ...state, submissions }, now);
}

export function vote(state: RoomState, playerId: string, entryId: string, now: number): RoomState {
  if (state.phase !== "voting") fail(state, "notVoting");
  if (!legalEntryIds(state, playerId).includes(entryId)) fail(state, "cannotVote");
  const contest = activeContest(state);
  const votes = state.votes.filter((item) => !(item.contest === contest && item.voterId === playerId));
  votes.push({ round: state.round, contest, voterId: playerId, entryId });
  return tick({ ...state, votes }, now);
}

export function castFavorite(state: RoomState, playerId: string, entryId: string, now: number): RoomState {
  if (state.phase !== "favorites") fail(state, "notFavorite");
  if (!galleryIds(state).includes(entryId)) fail(state, "badEntry");
  const favorites = state.favorites.filter((item) => item.voterId !== playerId);
  favorites.push({ voterId: playerId, entryId });
  return tick({ ...state, favorites }, now);
}

export function removeSubmission(state: RoomState, submissionId: string): RoomState {
  const submission = state.submissions.find((item) => item.id === submissionId);
  const assignment = submission ? state.assignments.find((item) => item.id === submission.assignmentId) : undefined;
  if (!submission || !assignment) fail(state, "noSubmission");
  const contest = isDuel(state.config.playlist[assignment.round] ?? "ratio") ? duelId(assignment.round, assignment.prompt) : roundId(assignment.round);
  const open = !state.scored.includes(contest);
  return {
    ...state,
    submissions: state.submissions.map((item) => {
      if (item.id !== submissionId) return item;
      return open ? { ...item, removed: true, text: "" } : { ...item, hidden: true };
    }),
  };
}

export function nextMatch(state: RoomState, now: number): RoomState {
  if (state.phase !== "game_over") fail(state, "nextMatchLater");
  const blank = freshRoom({
    code: state.code,
    hostToken: state.hostToken,
    cap: state.cap,
    demo: false,
    now,
    config: state.config,
    match: state.match + 1,
  });
  return { ...blank, demo: state.demo, players: state.players, createdAt: state.createdAt };
}

export function cleanName(raw: string, language: Language): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 16) throw new GameError(t(language, "nameLength"));
  return name;
}

export function cleanText(raw: string, max: number): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

export function playerById(state: RoomState, id: string) {
  return state.players.find((player) => player.id === id);
}

export function winnerIds(state: RoomState): string[] {
  const best = Math.max(0, ...state.seats.map((id) => state.scores[id] ?? 0));
  if (best <= 0) return [];
  return state.seats.filter((id) => (state.scores[id] ?? 0) === best);
}

export function galleryIds(state: RoomState): string[] {
  const ids: string[] = [];
  state.config.playlist.forEach((mode, round) => {
    const count = state.prompts[round]?.length ?? 0;
    for (let prompt = 0; prompt < count; prompt += 1) {
      if (isDuel(mode)) {
        if (duelOutcome(state, round, prompt) !== "empty") ids.push(duelId(round, prompt));
        continue;
      }
      const entry = sharedEntries(state, round)[prompt];
      if (entry?.sides.some((side) => side.text)) ids.push(entry.id);
    }
  });
  return ids;
}

function addDemoBots(state: RoomState, now: number): RoomState {
  const names = botNames(state.config.language);
  const players: Player[] = names.slice(0, 4).map((name, index) => ({
    id: `bot-${index}-${state.code}`,
    token: `bot-token-${index}-${state.code}`,
    name,
    color: PALETTE[index],
    bot: true,
    host: false,
    joinedAt: now + index,
  }));
  return { ...state, players };
}

function attachImages(accounts: AccountDraft[], groups: ImageGroup[], random: () => number): FictionalAccount[] {
  const queues = groups.map((group) => shuffle(group.images, random));
  const cursor = groups.map(() => 0);
  return accounts.map((account, index) => {
    const group = account.avatarGroup;
    const image = queues[group]?.[cursor[group] ?? 0] ?? null;
    if (queues[group]) cursor[group] += 1;
    return { ...account, image, color: PALETTE[index % PALETTE.length] };
  });
}

function applyBotMoves(state: RoomState, now: number): RoomState {
  if (!botReady(state, now)) return state;
  if (state.phase === "writing") return fillMissingBots(state);
  if (state.phase !== "voting") return state;
  let votes = state.votes;
  let changed = false;
  for (const id of state.seats) {
    const player = playerById(state, id);
    const contest = activeContest(state);
    if (!player?.bot || votes.some((vote) => vote.contest === contest && vote.voterId === id)) continue;
    const options = legalEntryIds(state, id);
    if (options.length === 0) continue;
    const choice = [...options].sort((a, b) => entryLength(state, b) - entryLength(state, a) || (a < b ? -1 : 1))[0];
    votes = [...votes, { round: state.round, contest, voterId: id, entryId: choice }];
    changed = true;
  }
  return changed ? { ...state, votes } : state;
}

function fillMissingBots(state: RoomState): RoomState {
  if (state.phase !== "writing") return state;
  const role = stepRole(state);
  let submissions = state.submissions;
  let changed = false;
  for (const assignment of state.assignments) {
    if (assignment.round !== state.round || assignment.role !== role) continue;
    if (submissions.some((item) => item.assignmentId === assignment.id)) continue;
    const player = playerById(state, assignment.playerId);
    if (!player?.bot) continue;
    const salt = state.round * 10 + assignment.prompt + assignment.slot;
    submissions = [
      ...submissions,
      {
        id: `sub-${assignment.id}`,
        assignmentId: assignment.id,
        playerId: assignment.playerId,
        text: botLine(state.config.language, role, salt),
        removed: false,
        hidden: false,
      },
    ];
    changed = true;
  }
  return changed ? { ...state, submissions } : state;
}

function entryLength(state: RoomState, entryId: string): number {
  const match = /^e(\d+)-(\d+)-(\d+)$/.exec(entryId) ?? /^s(\d+)-(\d+)$/.exec(entryId);
  if (!match) return 0;
  const round = Number(match[1]);
  const prompt = Number(match[2]);
  if (match.length === 4) {
    const slot = Number(match[3]);
    return submissionFor(state, `a${round}p${prompt}s${slot}`)?.text.length ?? 0;
  }
  const left = submissionFor(state, `a${round}p${prompt}s0`)?.text.length ?? 0;
  const right = submissionFor(state, `a${round}p${prompt}s1`)?.text.length ?? 0;
  return left + right;
}

function botReady(state: RoomState, now: number): boolean {
  if (!state.deadline) return false;
  if (state.phase !== "writing" && state.phase !== "voting") return false;
  return now >= state.deadline - duration(state) + 1200;
}

function shouldAdvance(state: RoomState, now: number): boolean {
  if (state.debug || state.paused) return false;
  if (state.phase === "reveal" || state.phase === "results" || state.phase === "round_intro" || state.phase === "leaderboard" || state.phase === "favorites") {
    return Boolean(state.deadline && now >= state.deadline);
  }
  if (state.phase === "writing" || state.phase === "voting") return phaseComplete(state) || Boolean(state.deadline && now >= state.deadline);
  return false;
}

function phaseComplete(state: RoomState): boolean {
  if (state.phase === "writing") {
    const role = stepRole(state);
    return state.assignments
      .filter((item) => item.round === state.round && item.role === role)
      .every((item) => state.submissions.some((submission) => submission.assignmentId === item.id));
  }
  if (state.phase === "voting") {
    const contest = activeContest(state);
    return state.seats.every((id) => legalEntryIds(state, id).length === 0 || state.votes.some((vote) => vote.contest === contest && vote.voterId === id));
  }
  return false;
}

function afterReveal(state: RoomState, now: number): RoomState {
  if (isDuel(currentMode(state))) {
    const outcome = duelOutcome(state, state.round, currentPromptIndex(state));
    if (outcome !== "contest") return beginResults(applyCurrentScore(state), now);
    return beginVoting(state, now);
  }
  if (!sharedEntries(state, state.round).some((entry) => entry.votable)) return beginResults(applyCurrentScore(state), now);
  return beginVoting(state, now);
}

function afterResults(state: RoomState, now: number): RoomState {
  const count = state.prompts[state.round]?.length ?? 0;
  if (isDuel(currentMode(state)) && state.contest + 1 < count) {
    const next = { ...state, contest: state.contest + 1, phase: "reveal" as const };
    return { ...next, ...schedule(next, now, "reveal") };
  }
  return beginLeaderboard(applyViral(state), now);
}

function afterLeaderboard(state: RoomState, now: number): RoomState {
  if (state.round + 1 < state.config.playlist.length) {
    const next = { ...state, round: state.round + 1, contest: 0, writeStep: 0, phase: "round_intro" as const };
    return { ...next, ...schedule(next, now, "round_intro") };
  }
  const next = { ...state, phase: "favorites" as const };
  return { ...next, ...schedule(next, now, "favorites") };
}

function beginWriting(state: RoomState, now: number): RoomState {
  const next = { ...state, phase: "writing" as const, writeStep: 0 };
  return { ...next, ...schedule(next, now, "writing", 0) };
}

function beginReveal(state: RoomState, now: number): RoomState {
  const next = { ...state, phase: "reveal" as const, contest: 0 };
  return { ...next, ...schedule(next, now, "reveal") };
}

function beginVoting(state: RoomState, now: number): RoomState {
  const next = { ...state, phase: "voting" as const };
  return { ...next, ...schedule(next, now, "voting") };
}

function beginResults(state: RoomState, now: number): RoomState {
  const next = { ...state, phase: "results" as const };
  return { ...next, ...schedule(next, now, "results") };
}

function beginLeaderboard(state: RoomState, now: number): RoomState {
  const next = { ...state, phase: "leaderboard" as const };
  return { ...next, ...schedule(next, now, "leaderboard") };
}

function finishGame(state: RoomState): RoomState {
  const key = "chronic";
  const next = state.scored.includes(key)
    ? state
    : { ...state, badges: [...state.badges, ...chronicBadges(state)], scored: [...state.scored, key] };
  return { ...next, status: "finished", phase: "game_over", deadline: null, paused: false, pauseRemaining: null };
}

function applyCurrentScore(state: RoomState): RoomState {
  const result = scoreContest(state);
  if (state.scored.includes(result.contest)) return state;
  return applyAwards(state, result.events, result.badges, result.contest);
}

function applyViral(state: RoomState): RoomState {
  const key = `viral-${state.round}`;
  if (state.scored.includes(key)) return state;
  return applyAwards(state, [], viralBadges(state, state.round), key);
}

function applyAwards(state: RoomState, events: ScoreEvent[], badges: Badge[], key: string): RoomState {
  const scores = { ...state.scores };
  for (const item of events) scores[item.playerId] = (scores[item.playerId] ?? 0) + item.delta;
  return { ...state, scores, log: [...state.log, ...events], badges: [...state.badges, ...badges], scored: [...state.scored, key] };
}

function schedule(state: RoomState, now: number, phase: Phase, writeStep = state.writeStep) {
  const ms = duration({ ...state, phase, writeStep });
  if (state.paused) return { paused: true, deadline: null, pauseRemaining: ms };
  return { paused: false, deadline: now + ms, pauseRemaining: null };
}

function fail(state: RoomState, key: string): never {
  throw new GameError(t(state.config.language, key));
}
