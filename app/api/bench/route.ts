import { generateTopics } from "@/lib/ai/generate";
import { searchPhotos } from "@/lib/ai/images";
import { applyFallback, applyTopics, ensureShells, freshRoom, givePhotos, missingTopics } from "@/lib/game/engine";
import { ROUND_KINDS, type RoundKind } from "@/lib/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { kind?: string; cap?: number };
  if (!body.kind || !ROUND_KINDS.includes(body.kind as RoundKind)) {
    return Response.json({ error: "Неизвестный режим" }, { status: 400 });
  }
  const kind = body.kind as RoundKind;
  const cap = clamp(body.cap);
  let state = ensureShells(
    freshRoom({
      code: "BENCH",
      hostToken: "bench",
      cap,
      demo: false,
      playlist: [kind],
      now: Date.now(),
    }),
  );
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const fills = await generateTopics(missingTopics(state), []);
      if (fills?.length) state = applyTopics(state, fills, "model");
    } catch {
      state = { ...state, deckLock: null };
    }
  }
  if (missingTopics(state).length) state = applyFallback(state);
  if (kind === "instagram") {
    for (let seat = 0; seat < cap; seat += 1) {
      const card = state.cards.find((item) => item.kind === kind && item.seat === seat);
      let photos: Awaited<ReturnType<typeof searchPhotos>> = [];
      try {
        photos = await searchPhotos(card?.query || card?.topic || "");
      } catch {
        photos = [];
      }
      state = givePhotos(state, seat, photos, photos.length === 0);
    }
  }
  return Response.json({
    source: state.promptSource,
    cards: state.cards
      .filter((card) => card.kind === kind)
      .sort((a, b) => a.seat - b.seat)
      .map((card) => ({
        seat: card.seat,
        topic: card.topic,
        query: card.query,
        photos: card.photos ?? [],
      })),
  });
}

function clamp(cap: number | undefined): number {
  if (!Number.isFinite(cap)) return 3;
  return Math.max(3, Math.min(8, Math.round(cap ?? 3)));
}
