import { PhoneApp } from "@/components/phone-app";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PhoneApp code={code.toUpperCase()} />;
}
