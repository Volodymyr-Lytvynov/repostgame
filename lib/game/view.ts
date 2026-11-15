import { limits, skinsFromSeed, twistCopy } from "./content";
import {
  currentKind,
  deckProgress,
  playerById,
  revealOrder,
  shownCard,
  sourceSeatFor,
  submissionFor,
  twistFor,
  votableSeats,
  winners,
} from "./engine";
import type { ClientView, PlayerTask, RoomState, ShownCard } from "./types";

export function buildView(state: RoomState, version: number, token: string | null, now: number): ClientView {
  const player = token ? state.players.find((item) => item.token === token) ?? null : null;
  const isHost = Boolean(player?.host || (token && token === state.hostToken));
  const skins = skinsFromSeed(state.seed);
  const playing = state.status !== "lobby";
  const kind = playing ? currentKind(state) : null;
  const order = playing ? revealOrder(state) : [];
  const spotlight = state.phase === "reveal" ? shownCard(state, order[state.reveal] ?? -1) : null;
  const ballot = state.phase === "vote" ? order.map((seat) => shownCard(state, seat)).filter((card): card is ShownCard => Boolean(card)) : [];
  const deck = deckProgress(state);
  const people = (state.seats.length ? state.seats : state.players.map((item) => item.id))
    .map((id) => playerById(state, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    version,
    serverNow: now,
    code: state.code,
    demo: state.demo,
    cap: state.cap,
    lineup: state.lineup,
    skins,
    status: state.status,
    phase: state.phase,
    round: state.round,
    roundCount: state.playlist.length,
    kind,
    playlist: state.playlist,
    deadline: state.deadline,
    players: state.players
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        bot: item.bot,
        host: item.host,
        score: state.scores[item.id] ?? 0,
      })),
    seatsReady: readyIds(state),
    deck: { ...deck, source: state.promptSource },
    spotlight,
    ballot,
    scoreboard: people
      .map((item) => {
        const events = state.log.filter((event) => event.round === state.round && event.playerId === item.id);
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          total: state.scores[item.id] ?? 0,
          delta: events.reduce((sum, event) => sum + event.delta, 0),
          reason: events.map((event) => event.reason).join(", "),
        };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru")),
    winners: state.phase === "done" ? winners(state).filter(Boolean) : [],
    you: player
      ? {
          id: player.id,
          name: player.name,
          host: player.host,
          seat: state.seats.indexOf(player.id),
          task: taskFor(state, player.id),
        }
      : null,
    isHost,
    joinPath: `/play/${state.code}`,
  };
}

function readyIds(state: RoomState): string[] {
  if (state.phase === "write") {
    return state.seats.filter((_, seat) => submissionFor(state, seat)).map((id) => id);
  }
  if (state.phase === "twist") {
    return state.seats.filter((id) => {
      const source = sourceSeatFor(state.seats.indexOf(id), state.seats.length);
      return Boolean(twistFor(state, source));
    });
  }
  if (state.phase === "vote") {
    return state.votes.filter((vote) => vote.round === state.round).map((vote) => vote.voterId);
  }
  return [];
}

function taskFor(state: RoomState, playerId: string): PlayerTask | null {
  const seat = state.seats.indexOf(playerId);
  if (seat < 0) return null;
  const kind = currentKind(state);
  if (state.phase === "write") {
    if (submissionFor(state, seat)) return null;
    const card = state.cards.find((item) => item.kind === kind && item.seat === seat);
    if (!card) return null;
    return { phase: "write", kind, topic: card.topic, photos: card.photos ?? [], max: limits(kind).write };
  }
  if (state.phase === "twist") {
    const source = sourceSeatFor(seat, state.seats.length);
    if (twistFor(state, source)) return null;
    const card = state.cards.find((item) => item.kind === kind && item.seat === source);
    const submission = submissionFor(state, source);
    const author = playerById(state, state.seats[source] ?? "");
    const photo =
      kind === "instagram" && submission?.photo !== null && submission?.photo !== undefined
        ? card?.photos?.[submission.photo] ?? null
        : null;
    return {
      phase: "twist",
      kind,
      hint: twistCopy(kind).title,
      sourceText: submission?.text || card?.topic || "",
      sourceName: author?.name ?? "",
      photo,
      max: limits(kind).twist,
    };
  }
  if (state.phase === "vote") {
    const forbidden = sourceSeatFor(seat, state.seats.length);
    const selected = state.votes.find((vote) => vote.round === state.round && vote.voterId === playerId)?.seat;
    const options = votableSeats(state)
      .map((candidate) => shownCard(state, candidate))
      .filter((card): card is ShownCard => Boolean(card))
      .map((card) => ({ ...card, mine: card.seat === forbidden, selected: card.seat === selected }));
    if (!options.some((card) => !card.mine)) return null;
    return { phase: "vote", options };
  }
  return null;
}

export function phaseLabel(phase: ClientView["phase"]): string {
  if (phase === "write") return "Все пишут ответ";
  if (phase === "twist") return "Чужие фразы выворачивают";
  if (phase === "reveal") return "Смотрим, что получилось";
  if (phase === "vote") return "Голос за самый стыдный вариант";
  if (phase === "scores") return "Очки этого раунда";
  if (phase === "done") return "Партия закрыта";
  return "Лобби";
}
