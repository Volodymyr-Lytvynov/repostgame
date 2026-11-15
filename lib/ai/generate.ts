import type { RoundKind } from "../game/types";

export type TopicFill = { kind: RoundKind; seat: number; topic: string; query: string };

const KINDS = new Set<RoundKind>([
  "messenger",
  "thread",
  "job",
  "market",
  "search",
  "review",
  "video",
  "ai",
  "instagram",
]);

export async function generateTopics(
  missing: Array<{ kind: RoundKind; seat: number }>,
  avoid: string[],
): Promise<TopicFill[] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || missing.length === 0) return null;
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ты пишешь заходы для взрослой вечеринки на русском. Игроки сами придумают шутку. Ты даёшь только короткую тему, без панчлайна. Верни JSON {\"cards\":[{\"kind\",\"seat\",\"topic\",\"query\"}]}. topic до 90 символов. Для kind=thread topic — заготовка поста или только его начало: игрок допишет под неё реплай, а другой игрок потом придумает, под какой пост этот реплай поставить. Для kind=instagram query — английская фраза из 2–5 слов для поиска обычного фото, конкретно и безопасно: еда, улица, офис, животное, транспорт. Без знаменитостей, без детей в странном контексте, без жестокости и без сексуальных тем. Не повторяй уже занятые темы.",
        },
        {
          role: "user",
          content: JSON.stringify({
            need: missing,
            avoid,
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;
  return parseFills(content, missing);
}

function parseFills(content: string, missing: Array<{ kind: RoundKind; seat: number }>): TopicFill[] {
  const parsed = JSON.parse(content) as { cards?: Array<{ kind?: string; seat?: number; topic?: string; query?: string }> };
  const needed = new Set(missing.map((slot) => `${slot.kind}:${slot.seat}`));
  const fills: TopicFill[] = [];
  for (const card of parsed.cards ?? []) {
    if (!card.kind || !KINDS.has(card.kind as RoundKind) || typeof card.seat !== "number") continue;
    if (!needed.has(`${card.kind}:${card.seat}`)) continue;
    const topic = (card.topic ?? "").replace(/\s+/g, " ").trim();
    if (topic.length < 4) continue;
    fills.push({
      kind: card.kind as RoundKind,
      seat: card.seat,
      topic: topic.slice(0, 140),
      query: (card.query ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    });
  }
  return fills;
}
