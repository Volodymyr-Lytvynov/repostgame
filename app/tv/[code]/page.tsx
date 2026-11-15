import { ScreenApp } from "@/components/screen-app";
import { normalizeRoomCode } from "@/lib/game/code";

export default async function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ScreenApp code={normalizeRoomCode(code)} />;
}
