import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { generateTopics } from "./ai/generate";
import { searchPhotos } from "./ai/images";
import { sql } from "./db";
import {
  addBot,
  addPlayer,
  advancePhase,
  pauseGame,
  resumeGame,
  setDebug,
  applyFallback,
  applyTopics,
  cleanName,
  ensureShells,
  freshRoom,
  GameError,
  givePhotos,
  isDeckReady,
  missingTopics,
  nextMatch,
  nextPhotoSlot,
  setCap,
  startGame,
  submitTwist,
  submitVote,
  submitWrite,
  tick,
} from "./game/engine";
import { normalizeRoomCode } from "./game/code";
import { buildView } from "./game/view";
import type { ClientView, RoomState } from "./game/types";

type Row = { state: RoomState | string; version: number };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomNotFound extends Error {}

function parseState(value: RoomState | string): RoomState {
  const state = typeof value === "string" ? (JSON.parse(value) as RoomState) : value;
  return {
    ...state,
    match: state.match || 1,
    played: state.played ?? [],
    usedTopics: state.usedTopics ?? [],
  };
}

async function load(code: string): Promise<{ state: RoomState; version: number }> {
  const rows = await sql<Row>("select state, version from rooms where code = $1", [code]);
  if (!rows[0]) throw new RoomNotFound();
  return { state: parseState(rows[0].state), version: rows[0].version };
}

async function save(code: string, current: number, next: RoomState): Promise<boolean> {
  const rows = await sql<{ version: number }>(
    "update rooms set state = $1::jsonb, version = $2, updated_at = now() where code = $3 and version = $4 returning version",
    [JSON.stringify(next), current + 1, code, current],
  );
  return rows.length > 0;
}

async function mutate(code: string, change: (state: RoomState) => RoomState): Promise<RoomState> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const row = await load(code);
    const next = change(row.state);
    if (JSON.stringify(next) === JSON.stringify(row.state)) return row.state;
    if (await save(code, row.version, next)) return next;
  }
  throw new GameError("Комната занята, попробуй ещё раз");
}

function makeCode(): string {
  return Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export async function createRoom(input: { cap: number; demo: boolean }): Promise<{ code: string; hostToken: string }> {
  const cap = input.demo ? 3 : clampCap(input.cap);
  const recent = await sql<{ count: string }>(
    "select count(*)::text as count from rooms where created_at > now() - interval '1 hour'",
  );
  if (Number(recent[0]?.count ?? 0) > 40) throw new GameError("Слишком много комнат за час. Подожди немного.");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeCode();
    const hostToken = randomBytes(24).toString("hex");
    const state = freshRoom({
      code,
      hostToken,
      cap,
      demo: input.demo,
      now: Date.now(),
    });
    const rows = await sql<{ code: string }>(
      "insert into rooms (code, state, version) values ($1, $2::jsonb, 1) on conflict (code) do nothing returning code",
      [code, JSON.stringify(state)],
    );
    if (rows[0]) return { code, hostToken };
  }
  throw new GameError("Не вышло создать комнату");
}

export async function syncRoom(code: string): Promise<{ state: RoomState; version: number }> {
  await ensureTopics(code);
  for (let step = 0; step < 3; step += 1) {
    const fetched = await ensureOnePhoto(code);
    if (!fetched) break;
  }
  await mutate(code, (state) => tick(ensureShells(state), Date.now()));
  return load(code);
}

async function ensureTopics(code: string): Promise<void> {
  const row = await load(code);
  const missing = missingTopics(ensureShells(row.state));
  if (missing.length === 0) return;
  if (row.state.deckLock && Date.now() - row.state.deckLock < 20_000) return;
  if (!process.env.OPENAI_API_KEY?.trim()) {
    await mutate(code, (state) => applyFallback(ensureShells(state)));
    return;
  }
  await mutate(code, (state) => (missingTopics(state).length ? { ...state, deckLock: Date.now() } : state));
  try {
    const avoid = [...row.state.usedTopics, ...row.state.cards.map((card) => card.topic).filter(Boolean)];
    const fills = await generateTopics(missing, avoid);
    await mutate(code, (state) => {
      const shelled = ensureShells(state);
      if (!fills?.length) return applyFallback(shelled);
      const withModel = applyTopics(shelled, fills, "model");
      return missingTopics(withModel).length ? applyFallback(withModel) : withModel;
    });
  } catch {
    await mutate(code, (state) => applyFallback({ ...ensureShells(state), deckLock: null }));
  }
}

async function ensureOnePhoto(code: string): Promise<boolean> {
  const row = await load(code);
  const slot = nextPhotoSlot(ensureShells(row.state));
  if (!slot) return false;
  let photos: Awaited<ReturnType<typeof searchPhotos>> = [];
  try {
    photos = await searchPhotos(slot.query);
  } catch {
    photos = [];
  }
  await mutate(code, (state) => givePhotos(state, slot.seat, photos, photos.length === 0));
  return true;
}

export async function viewRoom(code: string, token: string | null): Promise<ClientView> {
  const { state, version } = await syncRoom(normalizeCode(code));
  return buildView(state, version, token, Date.now());
}

type Action =
  | { type: "join"; name?: string }
  | { type: "cap"; cap?: number }
  | { type: "again" }
  | { type: "start" }
  | { type: "write"; text?: string; photo?: number | null }
  | { type: "twist"; text?: string }
  | { type: "vote"; seat?: number }
  | { type: "skip" }
  | { type: "debug"; on?: boolean }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "bot" };

export async function act(code: string, token: string | null, action: Action): Promise<{ view: ClientView; token?: string; playerId?: string }> {
  const normalized = normalizeCode(code);
  const now = Date.now();
  if (action.type === "join") {
    const playerId = randomUUID();
    const playerToken = randomBytes(24).toString("hex");
    const state = await mutate(normalized, (current) =>
      addPlayer(ensureShells(current), {
        id: playerId,
        token: playerToken,
        name: cleanName(action.name ?? ""),
        bot: false,
        host: Boolean(token && token === current.hostToken),
        now,
      }),
    );
    const saved = await load(normalized);
    return { view: buildView(state, saved.version, playerToken, now), token: playerToken, playerId };
  }

  const state = await mutate(normalized, (current) => {
    const host = Boolean(token && (token === current.hostToken || current.players.some((player) => player.token === token && player.host)));
    const player = current.players.find((item) => item.token === token);
    if (action.type === "cap") {
      if (!host) throw new GameError("Число игроков меняет только создатель");
      return setCap(current, clampCap(action.cap ?? current.cap));
    }
    if (action.type === "again") {
      if (!host && !current.demo) throw new GameError("Следующую катку крутит создатель");
      return nextMatch(current);
    }
    if (action.type === "start") {
      if (!host) throw new GameError("Начинает создатель комнаты");
      if (!isDeckReady(current)) throw new GameError("Колода ещё собирается");
      return startGame(current, now);
    }
    if (action.type === "debug") {
      if (!host) throw new GameError("Режим проверки включает создатель");
      return setDebug(current, Boolean(action.on), now);
    }
    if (action.type === "pause") {
      if (!host && !current.demo) throw new GameError("Паузу ставит создатель");
      return pauseGame(current, now);
    }
    if (action.type === "resume") {
      if (!host && !current.demo) throw new GameError("Продолжить может создатель");
      return resumeGame(current, now);
    }
    if (action.type === "bot") {
      if (!host) throw new GameError("Бота добавляет создатель");
      return addBot(current, now);
    }
    if (action.type === "skip") {
      if (!host && !current.demo) throw new GameError("Дальше может переключить создатель");
      if (current.phase === "lobby" || current.phase === "done") return current;
      return advancePhase(current, now);
    }
    if (!player) throw new GameError("Сначала представься");
    if (action.type === "write") return submitWrite(current, player.id, action.text ?? "", action.photo ?? null, now);
    if (action.type === "twist") return submitTwist(current, player.id, action.text ?? "", now);
    if (action.type === "vote") return submitVote(current, player.id, Number(action.seat), now);
    return current;
  });
  const saved = await load(normalized);
  return { view: buildView(state, saved.version, token, now) };
}

export function normalizeCode(code: string): string {
  return normalizeRoomCode(code);
}

function clampCap(cap: number): number {
  if (!Number.isFinite(cap)) return 5;
  return Math.max(3, Math.min(8, Math.round(cap)));
}

export { GameError };
