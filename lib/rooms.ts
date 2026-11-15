import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { generateSession } from "./ai/generate";
import { fillImageGroups } from "./ai/images";
import { sql } from "./db";
import { defaultConfig, sessionCounts } from "./game/content";
import {
  addBot,
  addPlayer,
  advancePhase,
  applySettings,
  beginGenerating,
  castFavorite,
  claimGeneration,
  cleanName,
  fallbackManifest,
  freezeSession,
  freshRoom,
  GameError,
  nextMatch,
  pauseGame,
  removeSubmission,
  resumeGame,
  setCap,
  setDebug,
  submit,
  tick,
  vote,
} from "./game/engine";
import { normalizeRoomCode } from "./game/code";
import { mulberry32 } from "./game/random";
import { buildView } from "./game/view";
import type { ClientView, GameConfig, Language, RoomState } from "./game/types";
import { validateSession } from "./game/validate";

type Row = { state: RoomState | string; version: number };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomNotFound extends Error {}

function parseState(value: RoomState | string): RoomState {
  const state = typeof value === "string" ? (JSON.parse(value) as RoomState) : value;
  if (!state?.config || !state.phase) throw new RoomNotFound();
  return state;
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
  throw new GameError("The room is busy, try again");
}

function makeCode(): string {
  return Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export async function createRoom(input: { cap: number; demo: boolean; language?: Language }): Promise<{ code: string; hostToken: string }> {
  const language = input.language === "ru" ? "ru" : "en";
  const cap = input.demo ? 4 : clampCap(input.cap);
  const recent = await sql<{ count: string }>("select count(*)::text as count from rooms where created_at > now() - interval '1 hour'");
  if (Number(recent[0]?.count ?? 0) > 40) throw new GameError(language === "ru" ? "Слишком много комнат за час. Подожди немного." : "Too many rooms this hour. Wait a moment.");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeCode();
    const hostToken = randomBytes(24).toString("hex");
    const state = freshRoom({
      code,
      hostToken,
      cap,
      demo: input.demo,
      now: Date.now(),
      config: defaultConfig(language),
    });
    const rows = await sql<{ code: string }>(
      "insert into rooms (code, state, version) values ($1, $2::jsonb, 1) on conflict (code) do nothing returning code",
      [code, JSON.stringify(state)],
    );
    if (rows[0]) return { code, hostToken };
  }
  throw new GameError(language === "ru" ? "Комната не создалась" : "Couldn't create a room");
}

export async function viewRoom(code: string, token: string | null): Promise<ClientView> {
  const normalized = normalizeCode(code);
  await kick(normalized);
  const saved = await load(normalized);
  return buildView(saved.state, saved.version, token, Date.now());
}

async function kick(code: string): Promise<void> {
  await mutate(code, (state) => tick(state, Date.now()));
  await ensureSession(code);
  await mutate(code, (state) => tick(state, Date.now()));
}

async function ensureSession(code: string): Promise<void> {
  const row = await load(code);
  if (row.state.phase !== "generating" || row.state.prompts.length > 0) return;
  const token = randomUUID();
  await mutate(code, (state) => claimGeneration(state, Date.now(), token));
  const claimed = await load(code);
  if (claimed.state.generationToken !== token || claimed.state.phase !== "generating") return;
  const players = claimed.state.seats.length;
  let manifest = validateSession(null, claimed.state.config, players);
  try {
    const raw = await generateSession(claimed.state.config, sessionCounts(players, claimed.state.config.playlist));
    manifest = validateSession(raw, claimed.state.config, players);
  } catch {
    manifest = fallbackManifest(claimed.state);
  }
  try {
    manifest = {
      ...manifest,
      imageGroups: await fillImageGroups(manifest.imageGroups, claimed.state.config.searchBudget, mulberry32(claimed.state.seed || 1)),
    };
  } catch {
    manifest = { ...manifest, imageGroups: manifest.imageGroups.map((group) => ({ ...group, images: [] })) };
  }
  await mutate(code, (state) => {
    if (state.phase !== "generating" || state.generationToken !== token) return state;
    return freezeSession(state, manifest, Date.now());
  });
}

type Action =
  | { type: "join"; name?: string }
  | { type: "cap"; cap?: number }
  | { type: "settings"; language?: Language; intensity?: GameConfig["intensity"]; exclusions?: string; rounds?: number; playlist?: GameConfig["playlist"]; finaleMultiplier?: boolean }
  | { type: "again" }
  | { type: "start" }
  | { type: "submit"; assignmentId?: string; text?: string }
  | { type: "vote"; entryId?: string }
  | { type: "favorite"; entryId?: string }
  | { type: "remove"; submissionId?: string }
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
    await mutate(normalized, (current) =>
      addPlayer(current, {
        id: playerId,
        token: playerToken,
        name: cleanName(action.name ?? "", current.config.language),
        bot: false,
        host: Boolean(token && token === current.hostToken),
        now,
      }),
    );
    await kick(normalized);
    const saved = await load(normalized);
    return { view: buildView(saved.state, saved.version, playerToken, now), token: playerToken, playerId };
  }

  await mutate(normalized, (current) => {
    const host = Boolean(token && (token === current.hostToken || current.players.some((player) => player.token === token && player.host)));
    const player = current.players.find((item) => item.token === token);
    if (action.type === "cap") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Число игроков меняет только создатель" : "Only the host can change the player count");
      return setCap(current, clampCap(action.cap ?? current.cap));
    }
    if (action.type === "settings") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Настройки меняет только создатель" : "Only the host can change settings");
      return applySettings(current, {
        language: action.language,
        intensity: action.intensity,
        exclusions: action.exclusions,
        rounds: action.rounds,
        playlist: action.playlist,
        finaleMultiplier: action.finaleMultiplier,
      });
    }
    if (action.type === "again") {
      if (!host && !current.demo) throw new GameError(current.config.language === "ru" ? "Следующую катку крутит создатель" : "The host starts the next match");
      return nextMatch(current, now);
    }
    if (action.type === "start") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Начинает создатель комнаты" : "The host starts the game");
      return beginGenerating(current, now);
    }
    if (action.type === "debug") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Режим проверки включает создатель" : "The host toggles check mode");
      return setDebug(current, Boolean(action.on), now);
    }
    if (action.type === "pause") {
      if (!host && !current.demo) throw new GameError(current.config.language === "ru" ? "Паузу ставит создатель" : "The host pauses");
      return pauseGame(current, now);
    }
    if (action.type === "resume") {
      if (!host && !current.demo) throw new GameError(current.config.language === "ru" ? "Продолжить может создатель" : "The host resumes");
      return resumeGame(current, now);
    }
    if (action.type === "bot") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Бота добавляет создатель" : "The host adds bots");
      return addBot(current, now);
    }
    if (action.type === "skip") {
      if (!host && !current.demo) throw new GameError(current.config.language === "ru" ? "Дальше может переключить создатель" : "The host skips ahead");
      if (current.phase === "lobby" || current.phase === "game_over") return current;
      if (current.phase === "generating") return freezeSession(current, fallbackManifest(current), now);
      return advancePhase(current, now);
    }
    if (action.type === "remove") {
      if (!host) throw new GameError(current.config.language === "ru" ? "Убирать может только создатель" : "Only the host can remove a line");
      return removeSubmission(current, action.submissionId ?? "");
    }
    if (!player) throw new GameError(current.config.language === "ru" ? "Сначала представься" : "Join with a name first");
    if (action.type === "submit") return submit(current, player.id, action.assignmentId ?? "", action.text ?? "", now);
    if (action.type === "vote") return vote(current, player.id, action.entryId ?? "", now);
    if (action.type === "favorite") return castFavorite(current, player.id, action.entryId ?? "", now);
    return current;
  });
  await kick(normalized);
  const saved = await load(normalized);
  return { view: buildView(saved.state, saved.version, token, now) };
}

export function normalizeCode(code: string): string {
  return normalizeRoomCode(code);
}

function clampCap(cap: number): number {
  if (!Number.isFinite(cap)) return 6;
  return Math.max(4, Math.min(8, Math.round(cap)));
}

export { GameError };
