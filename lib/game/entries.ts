import { duelId, isDuel, roundId, sharedId, sideId } from "./assign";
import type { Assignment, Prompt, RoomState, SabotagePrompt, Submission } from "./types";

export type Side = {
  assignmentId: string;
  submissionId: string | null;
  playerId: string;
  raw: string;
  text: string;
  credited: boolean;
  hidden: boolean;
  removed: boolean;
  entryId: string;
};

export type SharedEntry = {
  id: string;
  round: number;
  prompt: number;
  sides: [Side, Side];
  votable: boolean;
};

export function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function combine(pattern: string, a: string, b: string): string {
  return pattern.replaceAll("{a}", a).replaceAll("{b}", b);
}

export function currentMode(state: RoomState) {
  return state.config.playlist[state.round] ?? "ratio";
}

export function currentPromptIndex(state: RoomState): number {
  return state.orders[state.round]?.[state.contest] ?? state.contest;
}

export function contestIdFor(state: RoomState, round = state.round, prompt = currentPromptIndex(state)): string {
  return isDuel(state.config.playlist[round] ?? "ratio") ? duelId(round, prompt) : roundId(round);
}

export function assignmentAt(state: RoomState, round: number, prompt: number, slot: number): Assignment | undefined {
  return state.assignments.find((item) => item.round === round && item.prompt === prompt && item.slot === slot);
}

export function submissionFor(state: RoomState, assignmentId: string): Submission | undefined {
  return state.submissions.find((item) => item.assignmentId === assignmentId);
}

export function stepRole(state: RoomState): Assignment["role"] {
  const mode = currentMode(state);
  if (mode === "dms") return state.writeStep === 0 ? "answer" : "context";
  if (mode === "sabotage") return "fragment";
  return "reply";
}

export function sides(state: RoomState, round: number, prompt: number): [Side, Side] {
  return [sideAt(state, round, prompt, 0), sideAt(state, round, prompt, 1)];
}

export function duelOutcome(state: RoomState, round: number, prompt: number): "empty" | "uncontested" | "skip" | "contest" {
  const [left, right] = sides(state, round, prompt);
  if (left.credited && right.credited && normalizeText(left.raw) === normalizeText(right.raw)) return "skip";
  if (left.credited && right.credited) return "contest";
  if (left.credited || right.credited) return "uncontested";
  return "empty";
}

export function sharedEntries(state: RoomState, round: number): SharedEntry[] {
  const count = state.prompts[round]?.length ?? 0;
  return Array.from({ length: count }, (_, prompt) => {
    const pair = sides(state, round, prompt);
    const votable = pair.some((side) => side.credited);
    return { id: sharedId(round, prompt), round, prompt, sides: pair, votable };
  });
}

export function legalEntryIds(state: RoomState, playerId: string): string[] {
  const mode = currentMode(state);
  if (isDuel(mode)) {
    const prompt = currentPromptIndex(state);
    if (duelOutcome(state, state.round, prompt) !== "contest") return [];
    const pair = sides(state, state.round, prompt);
    if (pair.some((side) => side.playerId === playerId)) return [];
    return pair.map((side) => side.entryId);
  }
  return sharedEntries(state, state.round)
    .filter((entry) => entry.votable && entry.sides.every((side) => side.playerId !== playerId))
    .map((entry) => entry.id);
}

export function contributors(state: RoomState, entryId: string): string[] {
  const parsed = parseEntry(entryId);
  if (!parsed) return [];
  if (parsed.kind === "side") {
    return [assignmentAt(state, parsed.round, parsed.prompt, parsed.slot)?.playerId ?? ""].filter(Boolean);
  }
  return [0, 1]
    .map((slot) => assignmentAt(state, parsed.round, parsed.prompt, slot)?.playerId ?? "")
    .filter(Boolean);
}

function sideAt(state: RoomState, round: number, promptIndex: number, slot: number): Side {
  const assignment = assignmentAt(state, round, promptIndex, slot);
  const submission = assignment ? submissionFor(state, assignment.id) : undefined;
  const removed = Boolean(submission?.removed);
  const hidden = Boolean(submission?.hidden);
  const raw = removed ? "" : (submission?.text ?? "").trim();
  const credited = Boolean(raw);
  const mode = state.config.playlist[round];
  const prompt = state.prompts[round]?.[promptIndex];
  let text = raw;
  if (hidden) text = "";
  else if (!raw && !removed && mode === "sabotage" && prompt?.kind === "template") {
    text = slot === 0 ? prompt.fallbackA : prompt.fallbackB;
  }
  return {
    assignmentId: assignment?.id ?? "",
    submissionId: submission?.id ?? null,
    playerId: assignment?.playerId ?? "",
    raw,
    text,
    credited,
    hidden,
    removed,
    entryId: sideId(round, promptIndex, slot),
  };
}

function parseEntry(entryId: string): { kind: "side" | "shared"; round: number; prompt: number; slot: number } | null {
  const side = /^e(\d+)-(\d+)-(\d+)$/.exec(entryId);
  if (side) return { kind: "side", round: Number(side[1]), prompt: Number(side[2]), slot: Number(side[3]) };
  const shared = /^s(\d+)-(\d+)$/.exec(entryId);
  if (shared) return { kind: "shared", round: Number(shared[1]), prompt: Number(shared[2]), slot: 0 };
  return null;
}

export function templateOf(prompt: Prompt | undefined): SabotagePrompt | null {
  return prompt?.kind === "template" ? prompt : null;
}
