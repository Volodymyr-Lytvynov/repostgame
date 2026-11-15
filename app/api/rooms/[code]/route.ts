import { GameError, RoomNotFound, act, normalizeCode, viewRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    const view = await viewRoom(normalizeCode(code), bearer(request));
    return Response.json(view);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    const action = (await request.json()) as Parameters<typeof act>[2];
    const result = await act(normalizeCode(code), bearer(request), action);
    return Response.json(result.view && result.token ? { ...result.view, playerToken: result.token } : result.view);
  } catch (error) {
    return fail(error);
  }
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  return match?.[1] ?? null;
}

function fail(error: unknown) {
  if (error instanceof RoomNotFound) return Response.json({ error: "No such room" }, { status: 404 });
  if (error instanceof GameError) return Response.json({ error: error.message }, { status: 400 });
  console.error(error);
  return Response.json({ error: "The room didn't answer" }, { status: 500 });
}
