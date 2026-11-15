import { GameError, createRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { cap?: number; demo?: boolean };
    const created = await createRoom({
      cap: Number(body.cap ?? 5),
      demo: Boolean(body.demo),
    });
    return Response.json(created);
  } catch (error) {
    return fail(error);
  }
}

function fail(error: unknown) {
  if (error instanceof GameError) return Response.json({ error: error.message }, { status: 400 });
  console.error(error);
  return Response.json({ error: "Не вышло создать комнату" }, { status: 500 });
}
