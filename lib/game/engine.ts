import { botTwist, botWrite, fallbackTopic, limits, LINEUPS, PALETTE, plural } from "./content";
import type {
  Card,
  LineupId,
  Phase,
  Photo,
  RoomState,
  RoundKind,
  ScoreEvent,
  ShownCard,
  Submission,
  Twist,
} from "./types";

export class GameError extends Error {}

export function duration(phase: Phase, demo: boolean): number {
  const table: Record<Phase, number> = {
    lobby: 0,
    write: demo ? 8000 : 50000,
    twist: demo ? 8000 : 45000,
    reveal: demo ? 5500 : 7000,
    vote: demo ? 8000 : 25000,
    scores: demo ? 5000 : 8000,
    done: 0,
  };
  return table[phase];
}

export function freshRoom(input: {
  code: string;
  hostToken: string;
  cap: number;
  demo: boolean;
  lineup: LineupId;
  seed: number;
  now: number;
}): RoomState {
  const state: RoomState = {
    code: input.code,
    demo: input.demo,
    cap: input.cap,
    lineup: input.lineup,
    seed: input.seed,
    hostToken: input.hostToken,
    createdAt: input.now,
    players: [],
    status: "lobby",
    phase: "lobby",
    round: 0,
    playlist: LINEUPS[input.lineup],
    cards: [],
    submissions: [],
    twists: [],
    votes: [],
    scores: {},
    log: [],
    reveal: 0,
    deadline: null,
    seats: [],
    deckLock: null,
    promptSource: null,
    debug: false,
    paused: false,
    pauseRemaining: null,
  };
  const withBots = input.demo ? addDemoBots(state, input.now) : state;
  return ensureShells(withBots);
}

function addDemoBots(state: RoomState, now: number): RoomState {
  const names = ["Лёша", "Марина", "Богдан"];
  const players = names.map((name, index) => ({
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

export function ensureShells(state: RoomState): RoomState {
  const have = new Set(state.cards.map((card) => `${card.kind}:${card.seat}`));
  const cards = [...state.cards];
  for (const slot of requiredSlots(state.playlist, state.cap)) {
    if (have.has(`${slot.kind}:${slot.seat}`)) continue;
    cards.push({
      kind: slot.kind,
      seat: slot.seat,
      topic: "",
      query: "",
      photos: slot.kind === "instagram" ? null : [],
      photoError: false,
    });
  }
  return cards.length === state.cards.length ? state : { ...state, cards };
}

export function requiredSlots(playlist: RoundKind[], cap: number): Array<{ kind: RoundKind; seat: number }> {
  const slots: Array<{ kind: RoundKind; seat: number }> = [];
  for (const kind of playlist) {
    for (let seat = 0; seat < cap; seat += 1) slots.push({ kind, seat });
  }
  return slots;
}

export function cardAt(state: RoomState, kind: RoundKind, seat: number): Card | undefined {
  return state.cards.find((card) => card.kind === kind && card.seat === seat);
}

export function missingTopics(state: RoomState): Array<{ kind: RoundKind; seat: number }> {
  return requiredSlots(state.playlist, state.cap).filter((slot) => {
    const card = cardAt(state, slot.kind, slot.seat);
    return !card?.topic;
  });
}

export function nextPhotoSlot(state: RoomState): { kind: RoundKind; seat: number; query: string } | null {
  for (const slot of requiredSlots(state.playlist, state.cap)) {
    if (slot.kind !== "instagram") continue;
    const card = cardAt(state, slot.kind, slot.seat);
    if (card?.topic && card.photos === null) return { ...slot, query: card.query || card.topic };
  }
  return null;
}

export function isDeckReady(state: RoomState): boolean {
  return requiredSlots(state.playlist, state.cap).every((slot) => {
    const card = cardAt(state, slot.kind, slot.seat);
    if (!card?.topic) return false;
    if (slot.kind === "instagram" && card.photos === null) return false;
    return true;
  });
}

export function deckProgress(state: RoomState): { ready: boolean; done: number; total: number; label: string } {
  const slots = requiredSlots(state.playlist, state.cap);
  let done = 0;
  let photosDone = 0;
  let photosTotal = 0;
  for (const slot of slots) {
    const card = cardAt(state, slot.kind, slot.seat);
    const topicReady = Boolean(card?.topic);
    const photoReady = slot.kind !== "instagram" || card?.photos !== null;
    if (topicReady && photoReady) done += 1;
    if (slot.kind === "instagram") {
      photosTotal += 1;
      if (card?.photos !== null && card?.topic) photosDone += 1;
    }
  }
  const ready = slots.length > 0 && done === slots.length;
  const label = ready
    ? "Колода готова"
    : photosTotal > 0
      ? `Задания и фото · ${photosDone} из ${photosTotal}`
      : `Задания · ${done} из ${slots.length}`;
  return { ready, done, total: slots.length, label };
}

export function applyTopics(
  state: RoomState,
  fills: Array<{ kind: RoundKind; seat: number; topic: string; query?: string }>,
  source: "model" | "backup",
): RoomState {
  const nextCards = state.cards.map((card) => {
    if (card.topic) return card;
    const fill = fills.find((item) => item.kind === card.kind && item.seat === card.seat);
    if (!fill?.topic.trim()) return card;
    return {
      ...card,
      topic: fill.topic.trim().slice(0, 140),
      query: (fill.query ?? "").trim().slice(0, 80),
    };
  });
  const stillMissing = missingTopics({ ...state, cards: nextCards });
  const completed = stillMissing.length === 0 ? source : state.promptSource;
  return { ...state, cards: nextCards, promptSource: completed, deckLock: stillMissing.length ? state.deckLock : null };
}

export function applyFallback(state: RoomState): RoomState {
  const fills = missingTopics(state).map((slot) => {
    const topic = fallbackTopic(slot.kind, state.code, slot.seat);
    return { kind: slot.kind, seat: slot.seat, topic: topic.topic, query: topic.query };
  });
  return applyTopics(state, fills, "backup");
}

export function givePhotos(state: RoomState, seat: number, photos: Photo[], failed: boolean): RoomState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.kind === "instagram" && card.seat === seat && card.photos === null
        ? { ...card, photos, photoError: failed || photos.length === 0 }
        : card,
    ),
  };
}

export function setCap(state: RoomState, cap: number): RoomState {
  if (state.phase !== "lobby") throw new GameError("Число игроков меняется только в лобби");
  if (cap < 3 || cap > 8) throw new GameError("В комнате от 3 до 8 игроков");
  if (cap < state.players.length) throw new GameError("Стольких людей уже не высадить");
  return ensureShells({ ...state, cap });
}

export function setLineup(state: RoomState, lineup: LineupId): RoomState {
  if (state.phase !== "lobby") throw new GameError("Набор раундов меняется только в лобби");
  return ensureShells({ ...state, lineup, playlist: LINEUPS[lineup] });
}

export function addPlayer(state: RoomState, player: Omit<RoomState["players"][number], "color" | "joinedAt"> & { now: number }): RoomState {
  if (state.phase !== "lobby") throw new GameError("Игра уже началась");
  if (state.players.length >= state.cap) throw new GameError("Комната заполнена");
  const name = cleanName(player.name);
  if (state.players.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    throw new GameError("Такое имя уже занято");
  }
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

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 16) throw new GameError("Имя от 2 до 16 символов");
  return name;
}

export function cleanText(raw: string, max: number): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

export function twisterSeat(seat: number, count: number): number {
  return (seat + 1) % count;
}

export function sourceSeatFor(seat: number, count: number): number {
  return (seat - 1 + count) % count;
}

export function startGame(state: RoomState, now: number): RoomState {
  if (!isDeckReady(state)) throw new GameError("Колода ещё собирается");
  if (state.players.length < 3) throw new GameError("Нужно минимум три игрока");
  if (state.phase !== "lobby") throw new GameError("Игра уже идёт");
  const seats = [...state.players].sort((a, b) => a.joinedAt - b.joinedAt).map((player) => player.id);
  return {
    ...state,
    status: "playing",
    phase: "write",
    round: 0,
    seats,
    submissions: [],
    twists: [],
    votes: [],
    scores: Object.fromEntries(seats.map((id) => [id, 0])),
    log: [],
    reveal: 0,
    deadline: now + duration("write", state.demo),
  };
}

export function tick(state: RoomState, now: number): RoomState {
  if (state.status === "finished" || state.paused) return state;
  if (state.phase === "lobby") {
    if (state.demo && !state.debug && isDeckReady(state) && state.players.length >= 3) return startGame(state, now);
    return state;
  }
  const withBots = applyBotMoves(state, now);
  if (!shouldAdvance(withBots, now)) return withBots;
  return advancePhase(withBots, now);
}

export function setDebug(state: RoomState, on: boolean, now: number): RoomState {
  if (!on && state.paused) return { ...resumeGame(state, now), debug: false };
  return { ...state, debug: on };
}

export function pauseGame(state: RoomState, now: number): RoomState {
  if (state.phase === "lobby" || state.phase === "done" || state.paused) return state;
  const remaining = state.deadline === null ? duration(state.phase, state.demo) : Math.max(0, state.deadline - now);
  return { ...state, debug: true, paused: true, deadline: null, pauseRemaining: remaining };
}

export function resumeGame(state: RoomState, now: number): RoomState {
  if (!state.paused) return state;
  return {
    ...state,
    paused: false,
    deadline: now + (state.pauseRemaining ?? duration(state.phase, state.demo)),
    pauseRemaining: null,
  };
}

const BOT_NAMES = ["Лёша", "Марина", "Богдан", "Света", "Тимур", "Катя", "Остап", "Нина"];

export function addBot(state: RoomState, now: number): RoomState {
  if (!state.debug) throw new GameError("Бота можно добавить в режиме проверки");
  if (state.phase !== "lobby") throw new GameError("Бота можно добавить только до старта");
  const name = BOT_NAMES.find((item) => !state.players.some((player) => player.name === item)) ?? `Бот ${state.players.length + 1}`;
  const index = state.players.length;
  return addPlayer(state, {
    id: `bot-${index}-${state.code}`,
    token: `bot-token-${index}-${state.code}`,
    name,
    bot: true,
    host: false,
    now,
  });
}

function applyBotMoves(state: RoomState, now: number): RoomState {
  if (!botReady(state, now)) return state;
  if (state.phase === "write") {
    let submissions = state.submissions;
    let changed = false;
    state.seats.forEach((id, seat) => {
      const player = playerById(state, id);
      if (!player?.bot || submissionFor(state, seat)) return;
      submissions = [...submissions, botSubmission(state, seat, id)];
      changed = true;
    });
    return changed ? { ...state, submissions } : state;
  }
  if (state.phase === "twist") {
    let twists = state.twists;
    let changed = false;
    state.seats.forEach((id, seat) => {
      const player = playerById(state, id);
      const source = sourceSeatFor(seat, state.seats.length);
      if (!player?.bot || twistFor(state, source)) return;
      twists = [...twists, botTwistEntry(state, source, id)];
      changed = true;
    });
    return changed ? { ...state, twists } : state;
  }
  if (state.phase === "vote") {
    let votes = state.votes;
    let changed = false;
    for (const id of state.seats) {
      const player = playerById(state, id);
      if (!player?.bot || voteFor(state, id) || !voterCanVote(state, id)) continue;
      const seat = botChoice(state, id);
      if (seat === null) continue;
      votes = [...votes, { round: state.round, voterId: id, seat }];
      changed = true;
    }
    return changed ? { ...state, votes } : state;
  }
  return state;
}

function botReady(state: RoomState, now: number): boolean {
  if (!state.deadline) return false;
  if (state.phase === "reveal" || state.phase === "scores" || state.phase === "lobby" || state.phase === "done") {
    return false;
  }
  return now >= state.deadline - duration(state.phase, state.demo) + 1200;
}

function shouldAdvance(state: RoomState, now: number): boolean {
  if (state.debug || state.paused) return false;
  if (state.phase === "reveal" || state.phase === "scores") return Boolean(state.deadline && now >= state.deadline);
  if (state.phase === "write" || state.phase === "twist" || state.phase === "vote") {
    return phaseComplete(state) || Boolean(state.deadline && now >= state.deadline);
  }
  return false;
}

function phaseComplete(state: RoomState): boolean {
  if (state.phase === "write") return state.seats.every((_, seat) => submissionFor(state, seat));
  if (state.phase === "twist") return state.seats.every((id) => twistFor(state, sourceSeatFor(state.seats.indexOf(id), state.seats.length)));
  if (state.phase === "vote") return state.seats.every((id) => !voterCanVote(state, id) || voteFor(state, id));
  return false;
}

export function advancePhase(state: RoomState, now: number): RoomState {
  if (state.phase === "write") return beginTwist(fillMissingWrites(state), now);
  if (state.phase === "twist") return beginReveal(fillMissingTwists(state), now);
  if (state.phase === "reveal") {
    const order = revealOrder(state);
    if (state.reveal + 1 < order.length) {
      return { ...state, reveal: state.reveal + 1, ...schedule(state, now, "reveal") };
    }
    if (votableSeats(state).length === 0) return beginScores(applyScores(state), now);
    return beginVote(state, now);
  }
  if (state.phase === "vote") return beginScores(applyScores(fillMissingVotes(state)), now);
  if (state.phase === "scores") return nextRound(state, now);
  return state;
}

function beginTwist(state: RoomState, now: number): RoomState {
  const twists = [...state.twists];
  const kind = currentKind(state);
  for (let seat = 0; seat < state.seats.length; seat += 1) {
    const submission = submissionFor(state, seat);
    const useless = kind !== "instagram" && !submission?.text;
    if (!useless || twistFor(state, seat)) continue;
    twists.push({
      round: state.round,
      seat,
      twisterId: state.seats[twisterSeat(seat, state.seats.length)],
      text: "",
    });
  }
  return { ...state, twists, phase: "twist", ...schedule(state, now, "twist") };
}

function schedule(state: RoomState, now: number, phase: Phase) {
  const ms = duration(phase, state.demo);
  if (state.paused) return { paused: true, deadline: null, pauseRemaining: ms };
  return { paused: false, deadline: now + ms, pauseRemaining: null };
}

function beginReveal(state: RoomState, now: number): RoomState {
  if (revealOrder(state).length === 0) return beginScores(applyScores(state), now);
  return { ...state, phase: "reveal", reveal: 0, ...schedule(state, now, "reveal") };
}

function beginVote(state: RoomState, now: number): RoomState {
  return { ...state, phase: "vote", ...schedule(state, now, "vote") };
}

function beginScores(state: RoomState, now: number): RoomState {
  return { ...state, phase: "scores", ...schedule(state, now, "scores") };
}

function nextRound(state: RoomState, now: number): RoomState {
  if (state.round + 1 >= state.playlist.length) {
    return { ...state, status: "finished", phase: "done", deadline: null, paused: false, pauseRemaining: null };
  }
  return {
    ...state,
    round: state.round + 1,
    phase: "write",
    reveal: 0,
    ...schedule(state, now, "write"),
  };
}

function fillMissingWrites(state: RoomState): RoomState {
  const submissions = [...state.submissions];
  state.seats.forEach((id, seat) => {
    if (submissionFor(state, seat)) return;
    const player = playerById(state, id);
    submissions.push(player?.bot ? botSubmission(state, seat, id) : { round: state.round, seat, authorId: id, text: "", photo: defaultPhoto(state, seat) });
  });
  return { ...state, submissions };
}

function fillMissingTwists(state: RoomState): RoomState {
  const twists = [...state.twists];
  for (let seat = 0; seat < state.seats.length; seat += 1) {
    if (twistFor(state, seat)) continue;
    const twisterId = state.seats[twisterSeat(seat, state.seats.length)];
    const player = playerById(state, twisterId);
    twists.push(player?.bot ? botTwistEntry(state, seat, twisterId) : { round: state.round, seat, twisterId, text: "" });
  }
  return { ...state, twists };
}

function fillMissingVotes(state: RoomState): RoomState {
  return state;
}

export function submitWrite(state: RoomState, playerId: string, text: string, photo: number | null, now: number): RoomState {
  if (state.phase !== "write") throw new GameError("Сейчас не время писать");
  const seat = state.seats.indexOf(playerId);
  if (seat < 0) throw new GameError("Тебя нет в этой партии");
  const kind = currentKind(state);
  const card = currentCard(state, seat);
  const max = limits(kind).write;
  const clean = cleanText(text, max);
  let chosen: number | null = null;
  if (kind === "instagram") {
    const count = card?.photos?.length ?? 0;
    if (count === 0) chosen = null;
    else if (photo === null || photo < 0 || photo >= count) throw new GameError("Выбери один из кадров");
    else chosen = photo;
  } else if (!clean) {
    throw new GameError("Пустую строку не отправишь");
  }
  const submissions = state.submissions.filter((item) => !(item.round === state.round && item.seat === seat));
  submissions.push({ round: state.round, seat, authorId: playerId, text: kind === "instagram" ? "" : clean, photo: chosen });
  return tick({ ...state, submissions }, now);
}

export function submitTwist(state: RoomState, playerId: string, text: string, now: number): RoomState {
  if (state.phase !== "twist") throw new GameError("Сейчас не время выворачивать");
  const seat = state.seats.indexOf(playerId);
  if (seat < 0) throw new GameError("Тебя нет в этой партии");
  const source = sourceSeatFor(seat, state.seats.length);
  const kind = currentKind(state);
  const clean = cleanText(text, limits(kind).twist);
  if (!clean) throw new GameError("Пустой подкол не отправишь");
  const twists = state.twists.filter((item) => !(item.round === state.round && item.seat === source));
  twists.push({ round: state.round, seat: source, twisterId: playerId, text: clean });
  return tick({ ...state, twists }, now);
}

export function submitVote(state: RoomState, playerId: string, seat: number, now: number): RoomState {
  if (state.phase !== "vote") throw new GameError("Сейчас не время голосовать");
  if (!votableSeats(state).includes(seat)) throw new GameError("За эту карточку нельзя голосовать");
  const mine = sourceSeatFor(state.seats.indexOf(playerId), state.seats.length);
  if (seat === mine) throw new GameError("За свой подкол голосовать нельзя");
  const votes = state.votes.filter((item) => !(item.round === state.round && item.voterId === playerId));
  votes.push({ round: state.round, voterId: playerId, seat });
  return tick({ ...state, votes }, now);
}

export function currentKind(state: RoomState): RoundKind {
  return state.playlist[state.round] ?? "thread";
}

function currentCard(state: RoomState, seat: number): Card | undefined {
  return cardAt(state, currentKind(state), seat);
}

function defaultPhoto(state: RoomState, seat: number): number | null {
  if (currentKind(state) !== "instagram") return null;
  const photos = currentCard(state, seat)?.photos;
  return photos && photos.length > 0 ? 0 : null;
}

function botSubmission(state: RoomState, seat: number, id: string): Submission {
  const kind = currentKind(state);
  return {
    round: state.round,
    seat,
    authorId: id,
    text: kind === "instagram" ? "" : botWrite(kind, seat, state.round),
    photo: kind === "instagram" ? defaultPhoto(state, seat) : null,
  };
}

function botTwistEntry(state: RoomState, source: number, twisterId: string): Twist {
  return {
    round: state.round,
    seat: source,
    twisterId,
    text: botTwist(currentKind(state), source, state.round),
  };
}

export function submissionFor(state: RoomState, seat: number): Submission | undefined {
  return state.submissions.find((item) => item.round === state.round && item.seat === seat);
}

export function twistFor(state: RoomState, seat: number): Twist | undefined {
  return state.twists.find((item) => item.round === state.round && item.seat === seat);
}

function voteFor(state: RoomState, voterId: string): { seat: number } | undefined {
  return state.votes.find((item) => item.round === state.round && item.voterId === voterId);
}

export function playerById(state: RoomState, id: string) {
  return state.players.find((player) => player.id === id);
}

export function revealOrder(state: RoomState): number[] {
  const order: number[] = [];
  for (let seat = 0; seat < state.seats.length; seat += 1) {
    if (isShowable(state, seat)) order.push(seat);
  }
  return order;
}

export function isShowable(state: RoomState, seat: number): boolean {
  const twist = twistFor(state, seat);
  if (!twist?.text) return false;
  if (currentKind(state) === "instagram") return true;
  return Boolean(submissionFor(state, seat)?.text);
}

export function votableSeats(state: RoomState): number[] {
  return revealOrder(state);
}

function voterCanVote(state: RoomState, playerId: string): boolean {
  const seat = state.seats.indexOf(playerId);
  if (seat < 0) return false;
  const forbidden = sourceSeatFor(seat, state.seats.length);
  return votableSeats(state).some((candidate) => candidate !== forbidden);
}

function botChoice(state: RoomState, playerId: string): number | null {
  const seat = state.seats.indexOf(playerId);
  const forbidden = sourceSeatFor(seat, state.seats.length);
  const options = votableSeats(state).filter((candidate) => candidate !== forbidden);
  if (options.length === 0) return null;
  return [...options].sort((a, b) => (twistFor(state, b)?.text.length ?? 0) - (twistFor(state, a)?.text.length ?? 0) || a - b)[0];
}

export function voteCounts(state: RoomState): Map<number, number> {
  const counts = new Map<number, number>();
  for (const vote of state.votes) {
    if (vote.round !== state.round) continue;
    counts.set(vote.seat, (counts.get(vote.seat) ?? 0) + 1);
  }
  return counts;
}

export function scoreRound(state: RoomState): ScoreEvent[] {
  if (state.log.some((event) => event.round === state.round)) return [];
  const counts = voteCounts(state);
  const max = Math.max(0, ...counts.values());
  const leaders = [...counts.entries()].filter(([, count]) => count === max && count > 0);
  const best = leaders.length === 1 ? leaders[0][0] : null;
  const finale = state.round === state.playlist.length - 1;
  const events: ScoreEvent[] = [];
  for (const [seat, count] of counts) {
    if (!count) continue;
    const twist = twistFor(state, seat);
    if (!twist) continue;
    const isBest = seat === best;
    const raw = count * 100 + (isBest ? 200 : 0);
    const delta = finale ? raw * 2 : raw;
    const votes = `${count} ${plural(count, "голос", "голоса", "голосов")}`;
    const reason = `${votes}${isBest ? " и лучший подкол" : ""}${finale ? " · финал ×2" : ""}`;
    events.push({ round: state.round, playerId: twist.twisterId, delta, reason });
  }
  return events;
}

function applyScores(state: RoomState): RoomState {
  const events = scoreRound(state);
  if (events.length === 0) return state;
  const scores = { ...state.scores };
  for (const event of events) scores[event.playerId] = (scores[event.playerId] ?? 0) + event.delta;
  return { ...state, scores, log: [...state.log, ...events] };
}

export function shownCard(state: RoomState, seat: number): ShownCard | null {
  const author = playerById(state, state.seats[seat] ?? "");
  const twist = twistFor(state, seat);
  const submission = submissionFor(state, seat);
  const card = currentCard(state, seat);
  if (!author || !card) return null;
  const twister = twist ? playerById(state, twist.twisterId) : undefined;
  const photo =
    currentKind(state) === "instagram" && submission?.photo !== null && submission?.photo !== undefined
      ? card.photos?.[submission.photo] ?? null
      : null;
  const counts = voteCounts(state);
  return {
    seat,
    kind: currentKind(state),
    authorName: author.name,
    authorColor: author.color,
    twisterName: twister?.name ?? "",
    write: submission?.text ?? "",
    twist: twist?.text ?? "",
    photo,
    topic: card.topic,
    votable: isShowable(state, seat),
    votes: counts.get(seat) ?? 0,
  };
}

export function winners(state: RoomState): string[] {
  const totals = state.seats.map((id) => ({ id, score: state.scores[id] ?? 0 }));
  const best = Math.max(-1, ...totals.map((item) => item.score));
  return totals.filter((item) => item.score === best && best > 0).map((item) => playerById(state, item.id)?.name ?? "");
}
