import { sessionCounts } from "../game/content";
import type { GameConfig } from "../game/types";

const TONE: Record<GameConfig["intensity"], string> = {
  casual: "Awkward, dry, and mildly embarrassing. No gore and no slurs.",
  unhinged: "Dark, horny, corporate, and absurd. It is still a joke, not a threat.",
  footprint: "Deadpan, filthy, and mean only about fictional people. No slurs and no real victims.",
};

export async function generateSession(config: GameConfig, counts: ReturnType<typeof sessionCounts>): Promise<unknown | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const language = config.language === "ru" ? "Russian" : "English";
  try {
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
            content: [
              "You write fictional social-media setups for an adult party game. Players invent the jokes. You invent only the setups. Do not write sample replies.",
              `Write every player-facing string in ${language}. Image search queries stay short English.`,
              TONE[config.intensity],
              "Fictional accounts only. Do not impersonate real people or imply a real brand wrote the post.",
              "Posts should sound like a person actually posted them. Vary caps, emoji, length, and voice.",
              "Sabotage instructions are concrete tasks, never 'be funny'. Patterns must contain {a} and {b}.",
              'Return JSON: {"images": string[], "accounts": [{"name","handle","avatar","verified"}], "spares": [{"account","text"}], "rounds": [ratio {"mode":"ratio","posts":[{"account","text"}]} | dms {"mode":"dms","questions":string[],"senders":string[]} | explain {"mode":"explain","scenarios":string[]} | sabotage {"mode":"sabotage","templates":[{"a","b","pattern","fallbackA","fallbackB"}]}]}.',
              "Handles are unique, lowercase, and contain only letters, digits, dots, and underscores.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              language,
              intensity: config.intensity,
              exclusions: config.exclusions,
              players: counts.playerCount,
              accounts: counts.accounts,
              imageQueries: counts.imageGroups,
              sparePosts: counts.sparePosts,
              rounds: config.playlist.map((mode) => ({ mode, count: counts.perRound })),
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
