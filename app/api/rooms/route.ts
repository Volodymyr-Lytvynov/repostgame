import { GameError, createRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { cap?: number; demo?: boolean; language?: "en" | "ru" };
    const created = await createRoom({
      cap: Number(body.cap ?? 6),
      demo: Boolean(body.demo),
      language: body.language,
    });
    return Response.json(created);
  } catch (error) {
    return fail(error);
  }
}

function fail(error: unknown) {
  if (error instanceof GameError) return Response.json({ error: error.message }, { status: 400 });
  console.error(error);
  return Response.json({ error: "Couldn't create a room" }, { status: 500 });
}
