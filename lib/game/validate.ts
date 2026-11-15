import { agoLabel, fallbackAccounts, fallbackImageQueries, fallbackPosts, fallbackQuestions, fallbackScenarios, fallbackSenders, fallbackTemplates, sessionCounts } from "./content";
import { hashSeed } from "./random";
import type { AccountDraft, DmPrompt, ExplainPrompt, GameConfig, Prompt, RatioPrompt, SabotagePrompt, SessionManifest } from "./types";

export function validateSession(raw: unknown, config: GameConfig, playerCount: number): SessionManifest {
  const counts = sessionCounts(playerCount, config.playlist);
  const record = asRecord(raw);
  let usedModel = false;
  const queries = mergeQueries(record, counts.imageGroups, () => {
    usedModel = true;
  });
  const accounts = mergeAccounts(record, counts.accounts, queries.length, config.language, () => {
    usedModel = true;
  });
  const prompts = mergeRounds(record, config, playerCount, accounts.length, () => {
    usedModel = true;
  });
  return {
    source: raw == null || !usedModel ? "backup" : "model",
    imageGroups: queries.map((query) => ({ query, images: [] })),
    accounts,
    prompts,
  };
}

function mergeQueries(record: Record<string, unknown> | null, count: number, mark: () => void): string[] {
  const model = stringList(record?.images).map(cleanQuery).filter(Boolean);
  const fallback = fallbackImageQueries(count);
  return Array.from({ length: count }, (_, index) => {
    const query = model[index];
    if (!query) return fallback[index];
    mark();
    return query;
  });
}

function mergeAccounts(record: Record<string, unknown> | null, count: number, groups: number, language: GameConfig["language"], mark: () => void): AccountDraft[] {
  const model = Array.isArray(record?.accounts) ? record.accounts : [];
  const languageFallback = fallbackAccounts(language, count);
  const drafts: AccountDraft[] = [];
  const used = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const parsed = parseAccount(model[index], groups);
    if (parsed && !used.has(parsed.handle)) {
      drafts.push(parsed);
      used.add(parsed.handle);
      mark();
      continue;
    }
    const base = languageFallback[index % languageFallback.length];
    let handle = sanitizeHandle(base.handle) || `account${index}`;
    let suffix = 2;
    while (used.has(handle)) {
      handle = `${sanitizeHandle(base.handle) || "account"}${suffix}`.slice(0, 24);
      suffix += 1;
    }
    drafts.push({ name: base.name, handle, verified: base.verified, avatarGroup: index % groups });
    used.add(handle);
  }
  return drafts;
}

function mergeRounds(record: Record<string, unknown> | null, config: GameConfig, playerCount: number, accountCount: number, mark: () => void): Prompt[][] {
  const rounds = Array.isArray(record?.rounds) ? record.rounds : [];
  const sparePool = collectPosts(record?.spares, accountCount, mark);
  const ratioPool: Array<{ account: number; text: string }> = [];
  config.playlist.forEach((mode, index) => {
    if (mode !== "ratio") return;
    ratioPool.push(...collectPosts(asRecord(rounds[index])?.posts, accountCount, mark));
  });
  ratioPool.push(...sparePool);
  let ratioCursor = 0;
  return config.playlist.map((mode, index) => {
    const source = asRecord(rounds[index]);
    if (mode === "ratio") {
      const posts: RatioPrompt[] = [];
      for (let seat = 0; seat < playerCount; seat += 1) {
        const next = ratioPool[ratioCursor];
        ratioCursor += 1;
        const postBank = fallbackPosts(config.language, config.intensity, playerCount * config.playlist.length + playerCount);
        const text = next?.text || postBank[posts.length + index * playerCount] || postBank[0];
        const account = next ? next.account : (posts.length + index) % accountCount;
        if (next) mark();
        posts.push(decoratePost(config, account, text, index * 20 + seat));
      }
      return posts;
    }
    if (mode === "dms") {
      const questions = stringList(source?.questions).map((item) => cleanLine(item, 140)).filter((item) => item.length >= 4);
      const senders = stringList(source?.senders).map((item) => cleanLine(item, 40)).filter(Boolean);
      if (questions.length) mark();
      const questionBank = fallbackQuestions(config.language, config.intensity, playerCount);
      const senderBank = fallbackSenders(config.language, playerCount);
      return Array.from({ length: playerCount }, (_, seat) => {
        const prompt: DmPrompt = {
          kind: "question",
          text: questions[seat] || questionBank[seat],
          sender: senders[seat] || senderBank[seat],
        };
        return prompt;
      });
    }
    if (mode === "explain") {
      const scenarios = stringList(source?.scenarios).map((item) => cleanLine(item, 220)).filter((item) => item.length >= 8);
      if (scenarios.length) mark();
      const scenarioBank = fallbackScenarios(config.language, config.intensity, playerCount);
      return Array.from({ length: playerCount }, (_, seat) => {
        const prompt: ExplainPrompt = { kind: "scenario", text: scenarios[seat] || scenarioBank[seat] };
        return prompt;
      });
    }
    const templates = Array.isArray(source?.templates) ? source.templates : [];
    if (templates.length) mark();
    const templateBank = fallbackTemplates(config.language, config.intensity, playerCount);
    return Array.from({ length: playerCount }, (_, seat) => {
      const parsed = parseTemplate(templates[seat]);
      const base = templateBank[seat];
      const prompt: SabotagePrompt = parsed ?? {
        kind: "template",
        instructionA: base.instructionA,
        instructionB: base.instructionB,
        pattern: base.pattern,
        fallbackA: base.fallbackA,
        fallbackB: base.fallbackB,
      };
      return prompt;
    });
  });
}

function collectPosts(value: unknown, accountCount: number, mark: () => void): Array<{ account: number; text: string }> {
  if (!Array.isArray(value)) return [];
  const posts: Array<{ account: number; text: string }> = [];
  for (const item of value) {
    const record = asRecord(item);
    const text = cleanLine(record?.text, 180);
    const account = typeof record?.account === "number" ? Math.floor(record.account) : -1;
    if (text.length < 8 || account < 0 || account >= accountCount) continue;
    posts.push({ account, text });
    mark();
  }
  return posts;
}

function decoratePost(config: GameConfig, account: number, text: string, salt: number): RatioPrompt {
  const seed = hashSeed([text, String(salt), config.language]);
  return {
    kind: "post",
    account,
    text,
    fictionLikes: 12 + (seed % 9800),
    fictionViews: 400 + (seed % 200000),
    ago: agoLabel(config.language, seed),
  };
}

function parseAccount(value: unknown, groups: number): AccountDraft | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = cleanLine(record.name, 32);
  const handle = sanitizeHandle(record.handle);
  const avatar = typeof record.avatar === "number" ? Math.floor(record.avatar) : 0;
  if (name.length < 2 || !handle) return null;
  return {
    name,
    handle,
    verified: Boolean(record.verified),
    avatarGroup: ((avatar % groups) + groups) % groups,
  };
}

function parseTemplate(value: unknown): SabotagePrompt | null {
  const record = asRecord(value);
  if (!record) return null;
  const instructionA = cleanLine(record.a ?? record.instructionA, 120);
  const instructionB = cleanLine(record.b ?? record.instructionB, 120);
  const fallbackA = cleanLine(record.fallbackA, 80);
  const fallbackB = cleanLine(record.fallbackB, 80);
  let pattern = cleanLine(record.pattern, 160);
  if (!pattern.includes("{a}") || !pattern.includes("{b}")) pattern = "{a} — {b}";
  if (instructionA.length < 8 || instructionB.length < 4 || fallbackA.length < 2 || fallbackB.length < 2) return null;
  return { kind: "template", instructionA, instructionB, pattern, fallbackA, fallbackB };
}

function sanitizeHandle(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

function cleanQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function cleanLine(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
