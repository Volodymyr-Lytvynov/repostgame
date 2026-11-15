import { duelId, isDuel, roundId, sharedId } from "./assign";
import { taskLimit } from "./content";
import { combine, currentMode, currentPromptIndex, duelOutcome, legalEntryIds, sharedEntries, sides, stepRole, submissionFor, templateOf } from "./entries";
import { t } from "./i18n";
import { activeContest } from "./score";
import { playerById, winnerIds } from "./engine";
import type { ClientView, FeedAccount, FeedCard, Language, PlayerTask, RoomState } from "./types";

export function phaseLabel(language: Language, phase: RoomState["phase"], mode: ClientView["mode"]): string {
  return t(language, `phase_${phase}`, { mode: mode ? t(language, `mode_${mode}`) : "" });
}

export function buildView(state: RoomState, version: number, token: string | null, now: number): ClientView {
  const player = token ? state.players.find((item) => item.token === token) ?? null : null;
  const isHost = Boolean(player?.host || (token && token === state.hostToken));
  const mode = state.phase === "lobby" ? null : currentMode(state);
  const duel = Boolean(mode && isDuel(mode));
  const showAuthors = state.phase === "results" || state.phase === "leaderboard" || state.phase === "favorites" || state.phase === "game_over";
  const live = state.phase === "reveal" || state.phase === "voting" || state.phase === "results";
  const spotlight = duel && live ? cardFor(state, state.round, currentPromptIndex(state), showAuthors) : null;
  const board = !duel && live ? cardsInRound(state, state.round, showAuthors) : [];
  const gallery = state.phase === "favorites" || state.phase === "game_over" ? allCards(state) : [];
  const people = (state.seats.length ? state.seats : state.players.map((item) => item.id))
    .map((id) => playerById(state, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const contest = state.prompts.length ? activeContest(state) : "";

  return {
    version,
    serverNow: now,
    code: state.code,
    demo: state.demo,
    cap: state.cap,
    match: state.match,
    status: state.status,
    phase: state.phase,
    round: state.round,
    roundCount: state.config.playlist.length,
    mode,
    writeStep: state.writeStep,
    contest: state.contest,
    contestCount: duel ? state.prompts[state.round]?.length ?? 0 : live ? 1 : 0,
    playlist: state.config.playlist,
    config: state.config,
    deadline: state.deadline,
    debug: state.debug,
    paused: state.paused,
    pauseRemaining: state.pauseRemaining,
    players: [...state.players]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        bot: item.bot,
        host: item.host,
        score: state.scores[item.id] ?? 0,
      })),
    readyIds: readyIds(state),
    stepTotal: state.seats.length,
    generation: { source: state.promptSource },
    spotlight,
    board: gallery.length ? gallery : board,
    gallery,
    scoreboard: people
      .map((item) => {
        const events = state.log.filter((event) => event.playerId === item.id && eventMatches(state, event.contest, event.round));
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          total: state.scores[item.id] ?? 0,
          delta: events.reduce((sum, event) => sum + event.delta, 0),
          reason: events.map((event) => event.reason).join(", "),
          badges: state.badges.filter((badge) => badge.playerId === item.id).map((badge) => badge.kind),
        };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, state.config.language)),
    badges: state.badges,
    winners: state.phase === "game_over" ? winnerIds(state).map((id) => playerById(state, id)?.name ?? "").filter(Boolean) : [],
    you: player
      ? {
          id: player.id,
          name: player.name,
          host: player.host,
          tasks: tasksFor(state, player.id),
          choices: state.phase === "voting" ? legalEntryIds(state, player.id) : [],
          votedEntry: state.votes.find((vote) => vote.voterId === player.id && vote.contest === contest)?.entryId ?? null,
          favorite: state.favorites.find((favorite) => favorite.voterId === player.id)?.entryId ?? null,
        }
      : null,
    isHost,
    joinPath: `/play/${state.code}`,
  };
}

function eventMatches(state: RoomState, contest: string, round: number): boolean {
  if (state.phase === "results") return contest === activeContest(state);
  if (state.phase === "leaderboard") return round === state.round;
  return false;
}

function readyIds(state: RoomState): string[] {
  if (state.phase === "writing") {
    const role = stepRole(state);
    return state.seats.filter((id) => {
      const mine = state.assignments.filter((item) => item.round === state.round && item.playerId === id && item.role === role);
      return mine.length > 0 && mine.every((item) => submissionFor(state, item.id));
    });
  }
  if (state.phase === "voting") {
    const contest = activeContest(state);
    return state.votes.filter((vote) => vote.contest === contest).map((vote) => vote.voterId);
  }
  if (state.phase === "favorites") return state.favorites.map((favorite) => favorite.voterId);
  return [];
}

function tasksFor(state: RoomState, playerId: string): PlayerTask[] {
  if (state.phase !== "writing") return [];
  const role = stepRole(state);
  const language = state.config.language;
  return state.assignments
    .filter((item) => item.round === state.round && item.playerId === playerId && item.role === role && !submissionFor(state, item.id))
    .map((item) => {
      const prompt = state.prompts[item.round]?.[item.prompt];
      const mode = state.config.playlist[item.round];
      if (mode === "dms" && item.role === "context") {
        const answer = submissionFor(state, `a${item.round}p${item.prompt}s0`);
        const sender = prompt?.kind === "question" ? prompt.sender : "";
        return {
          assignmentId: item.id,
          role,
          max: taskLimit(role),
          title: t(language, "taskContext"),
          prompt: answer?.text || t(language, "blankAnswer"),
          aside: t(language, "from", { name: sender }),
          placeholder: t(language, "placeholderContext"),
        };
      }
      if (mode === "sabotage" && prompt?.kind === "template") {
        return {
          assignmentId: item.id,
          role,
          max: taskLimit(role),
          title: t(language, "taskFragment"),
          prompt: item.slot === 0 ? prompt.instructionA : prompt.instructionB,
          aside: "",
          placeholder: t(language, "placeholderFragment"),
        };
      }
      const title = mode === "explain" ? t(language, "taskExplain") : mode === "dms" ? t(language, "taskAnswer") : t(language, "taskReply");
      const body = prompt?.kind === "post" ? prompt.text : prompt?.kind === "scenario" ? prompt.text : prompt?.kind === "question" ? prompt.text : "";
      const aside = prompt?.kind === "post" ? accountAside(state, prompt.account) : "";
      return {
        assignmentId: item.id,
        role,
        max: taskLimit(role),
        title,
        prompt: body,
        aside,
        placeholder: mode === "dms" ? t(language, "placeholderAnswer") : t(language, "placeholderReply"),
      };
    });
}

function accountAside(state: RoomState, index: number): string {
  const account = state.accounts[index];
  if (!account) return "";
  return `${account.name} @${account.handle}`;
}

function allCards(state: RoomState): FeedCard[] {
  return state.config.playlist.flatMap((_, round) => cardsInRound(state, round, true));
}

function cardsInRound(state: RoomState, round: number, showAuthors: boolean): FeedCard[] {
  const count = state.prompts[round]?.length ?? 0;
  const cards: FeedCard[] = [];
  for (let prompt = 0; prompt < count; prompt += 1) {
    const card = cardFor(state, round, prompt, showAuthors);
    if (card) cards.push(card);
  }
  return cards;
}

function cardFor(state: RoomState, round: number, prompt: number, showAuthors: boolean): FeedCard | null {
  const mode = state.config.playlist[round];
  if (!mode) return null;
  const pair = sides(state, round, prompt);
  const source = state.prompts[round]?.[prompt];
  if (!source) return null;
  if (isDuel(mode) && duelOutcome(state, round, prompt) === "empty") return null;
  if (!isDuel(mode) && pair.every((side) => !side.text)) return null;
  const contest = isDuel(mode) ? duelId(round, prompt) : roundId(round);
  const names = pair.map((side) => (showAuthors ? playerById(state, side.playerId)?.name ?? "" : ""));
  const colors = pair.map((side) => (showAuthors ? playerById(state, side.playerId)?.color ?? "" : ""));
  const template = templateOf(source);
  const questionRevealed = showAuthors && mode === "dms";
  const entryA = isDuel(mode) ? pair[0].entryId : sharedId(round, prompt);
  const entryB = isDuel(mode) ? pair[1].entryId : "";
  return {
    id: isDuel(mode) ? duelId(round, prompt) : sharedId(round, prompt),
    mode,
    round,
    prompt,
    account: source.kind === "post" ? feedAccount(state, source.account) : null,
    fictionLikes: source.kind === "post" ? source.fictionLikes : 0,
    fictionViews: source.kind === "post" ? source.fictionViews : 0,
    ago: source.kind === "post" ? source.ago : "",
    promptText: source.kind === "post" ? source.text : source.kind === "scenario" ? source.text : questionRevealed && source.kind === "question" ? source.text : "",
    questionRevealed,
    sender: source.kind === "question" ? source.sender : "",
    combined: template ? combine(template.pattern, pair[0].text, pair[1].text) : "",
    textA: pair[0].text,
    textB: pair[1].text,
    authorA: names[0],
    authorB: names[1],
    colorA: colors[0],
    colorB: colors[1],
    showAuthors,
    votesA: countVotes(state, contest, entryA),
    votesB: entryB ? countVotes(state, contest, entryB) : 0,
    likesA: likesFor(state, contest, pair[0].playerId),
    likesB: likesFor(state, contest, pair[1].playerId),
    skipped: isDuel(mode) && duelOutcome(state, round, prompt) === "skip",
    entryA,
    entryB,
    votable: isDuel(mode) ? duelOutcome(state, round, prompt) === "contest" : Boolean(sharedEntries(state, round)[prompt]?.votable),
    submissionA: pair[0].submissionId,
    submissionB: pair[1].submissionId,
    favoriteVotes: state.favorites.filter((favorite) => favorite.entryId === (isDuel(mode) ? duelId(round, prompt) : sharedId(round, prompt))).length,
  };
}

function feedAccount(state: RoomState, index: number): FeedAccount | null {
  const account = state.accounts[index];
  if (!account) return null;
  const parts = account.name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
  return {
    name: account.name,
    handle: account.handle,
    verified: account.verified,
    initials,
    color: account.color,
    image: account.image?.thumb || account.image?.url || null,
    license: account.image?.license ?? "",
    author: account.image?.author ?? "",
  };
}

function countVotes(state: RoomState, contest: string, entryId: string): number {
  return state.votes.filter((vote) => vote.contest === contest && vote.entryId === entryId).length;
}

function likesFor(state: RoomState, contest: string, playerId: string): number {
  return state.log.filter((event) => event.contest === contest && event.playerId === playerId).reduce((sum, event) => sum + event.delta, 0);
}
