import { ScreenApp } from "@/components/screen-app";

export default async function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ScreenApp code={code.toUpperCase()} />;
}
