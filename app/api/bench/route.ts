import { benchScores } from "@/lib/game/bench";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { votes?: number[]; finale?: boolean };
  const votes = Array.isArray(body.votes) ? body.votes.map((vote) => Number(vote)) : [];
  if (votes.length < 2 || votes.length > 8 || votes.some((vote) => !Number.isFinite(vote))) {
    return Response.json({ error: "Give two to eight vote counts" }, { status: 400 });
  }
  return Response.json({ shares: benchScores(votes, Boolean(body.finale)) });
}
