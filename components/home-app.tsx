"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/game/i18n";
import { normalizeRoomCode } from "@/lib/game/code";
import type { Language } from "@/lib/game/types";
import { writeSession } from "./use-room";

export function HomeApp() {
  const router = useRouter();
  const [cap, setCap] = useState(6);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [pending, setPending] = useState<"room" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("footprint:language");
    if (stored === "ru" || stored === "en") setLanguage(stored);
  }, []);

  function choose(next: Language) {
    setLanguage(next);
    window.localStorage.setItem("footprint:language", next);
  }

  function openWithCode(where: "play" | "tv") {
    const next = normalizeRoomCode(code);
    if (next.length !== 4) {
      setError(language === "ru" ? "Код из 4 знаков." : "Enter the 4-character code.");
      return;
    }
    setError(null);
    router.push(`/${where}/${next}`);
  }

  async function create(demo: boolean) {
    setPending(demo ? "demo" : "room");
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cap, demo, language }),
      });
      const body = (await response.json()) as { code?: string; hostToken?: string; error?: string };
      if (!response.ok || !body.code || !body.hostToken) throw new Error(body.error ?? t(language, "createFailed"));
      writeSession(body.code, { hostToken: body.hostToken });
      router.push(demo ? `/tv/${body.code}` : `/play/${body.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(language, "createFailed"));
      setPending(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-10">
      <div className="mb-6 flex gap-2">
        {(["en", "ru"] as const).map((value) => (
          <button key={value} type="button" onClick={() => choose(value)} className={`rounded-full px-3 py-1 text-sm ${language === value ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
            {value === "ru" ? "Русский" : "English"}
          </button>
        ))}
      </div>
      <p className="text-sm uppercase tracking-[0.22em] text-white/45">Digital Footprint</p>
      <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-[1.05]">{t(language, "tagline")}</h1>
      <p className="mt-4 max-w-xl text-lg text-white/70">{t(language, "homeLead")}</p>
      <p className="mt-8 text-sm text-white/50">{t(language, "seats")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[4, 5, 6, 7, 8].map((value) => (
          <button key={value} type="button" onClick={() => setCap(value)} className={`grid size-11 place-items-center rounded-full text-lg ${cap === value ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
            {value}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" disabled={pending !== null} className="h-12 rounded-xl px-5 text-base" onClick={() => void create(false)}>
          {pending === "room" ? t(language, "creating") : t(language, "create")}
        </Button>
        <Button type="button" variant="outline" disabled={pending !== null} className="h-12 rounded-xl border-white/15 bg-transparent px-5 text-base text-white hover:bg-white/10" onClick={() => void create(true)}>
          {pending === "demo" ? t(language, "creating") : t(language, "sample")}
        </Button>
      </div>
      <form
        className="mt-8 max-w-md space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          openWithCode("play");
        }}
      >
        <p className="text-sm text-white/50">{t(language, "haveCode")}</p>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => {
              setCode(normalizeRoomCode(event.target.value));
              setError(null);
            }}
            maxLength={4}
            className="h-12 bg-white/5 text-lg tracking-[0.2em] text-white uppercase"
          />
          <Button type="submit" variant="outline" className="h-12 rounded-xl border-white/15 bg-transparent px-4 text-white hover:bg-white/10">{t(language, "play")}</Button>
          <Button type="button" variant="outline" className="h-12 rounded-xl border-white/15 bg-transparent px-4 text-white hover:bg-white/10" onClick={() => openWithCode("tv")}>{t(language, "screen")}</Button>
        </div>
        {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
      </form>
    </main>
  );
}
