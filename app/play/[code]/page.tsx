import { PhoneApp } from "@/components/phone-app";
import { normalizeRoomCode } from "@/lib/game/code";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PhoneApp code={normalizeRoomCode(code)} />;
}
