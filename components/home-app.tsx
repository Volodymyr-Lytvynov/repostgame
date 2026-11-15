"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeRoomCode } from "@/lib/game/code";
import { SiteCard } from "./site-card";
import { writeSession } from "./use-room";

export function HomeApp() {
  const router = useRouter();
  const [cap, setCap] = useState(5);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"room" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openWithCode(where: "play" | "tv") {
    const next = normalizeRoomCode(code);
    if (next.length !== 4) {
      setError("Введите код из 4 знаков. Буквы можно набирать и русскими: М станет M.");
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
        body: JSON.stringify({ cap, demo }),
      });
      const body = (await response.json()) as { code?: string; hostToken?: string; error?: string };
      if (!response.ok || !body.code || !body.hostToken) throw new Error(body.error ?? "Комната не создалась");
      writeSession(body.code, { hostToken: body.hostToken });
      router.push(demo ? `/tv/${body.code}` : `/play/${body.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вышло");
      setPending(null);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_.9fr]">
      <section>
        <p className="text-sm uppercase tracking-[0.22em] text-white/45">Вечеринка в браузере</p>
        <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-[1.05] sm:text-6xl">Нормальная фраза. Чужой интерфейс. Общий стыд.</h1>
        <p className="mt-4 max-w-lg text-lg text-white/70">
          Пишешь сообщение, пост или ответ нейросети. Друг вставляет это в чат маме, в вакансию или в подпись к фото. Комната голосует, кто выглядит хуже. Телевизор только показывает, телефоны играют, сервер ведёт комнату.
        </p>
        <p className="mt-8 text-sm text-white/50">Мест в колоде</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[3, 4, 5, 6, 7, 8].map((value) => (
            <button key={value} type="button" onClick={() => setCap(value)} className={`grid size-11 place-items-center rounded-full text-lg ${cap === value ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>{value}</button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" disabled={pending !== null} className="h-12 rounded-xl px-5 text-base" onClick={() => void create(false)}>
            {pending === "room" ? "Создаём…" : "Создать комнату"}
          </Button>
          <Button type="button" variant="outline" disabled={pending !== null} className="h-12 rounded-xl border-white/15 bg-transparent px-5 text-base text-white hover:bg-white/10" onClick={() => void create(true)}>
            {pending === "demo" ? "Собираем…" : "Посмотреть пример"}
          </Button>
        </div>
        <form
          className="mt-8 max-w-md space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            openWithCode("play");
          }}
        >
          <Input
            value={code}
            onChange={(event) => {
              setCode(normalizeRoomCode(event.target.value));
              setError(null);
            }}
            placeholder="Код комнаты"
            maxLength={4}
            className="h-12 bg-white/5 px-3 text-base uppercase tracking-[0.2em] text-white md:text-base"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" className="h-12 flex-1 rounded-xl text-base">Играть</Button>
            <Button type="button" className="h-12 flex-1 rounded-xl text-base" onClick={() => openWithCode("tv")}>Экран</Button>
          </div>
          <p className="text-sm text-white/55">«Играть» открывает телефон. «Экран» — общую картинку, которую все смотрят.</p>
          <p className="text-sm"><a href="/bench" className="text-white/45 underline">Стенд раунда</a></p>
        </form>
        {error ? <p className="mt-4 text-[#ff8d72]">{error}</p> : null}
      </section>
      <section className="relative hidden min-h-[640px] lg:block" aria-hidden>
        <div className="absolute left-0 top-8 w-[320px] -rotate-6">
          <SiteCard kind="messenger" mode="show" write="Я уже выехал" twist="Маме" author="Оля" />
        </div>
        <div className="absolute right-0 top-36 w-[300px] rotate-3">
          <SiteCard kind="instagram" mode="show" twist="семейный ужин, всё в порядке" author="Макс" topic="семейный чат" />
        </div>
      </section>
    </main>
  );
}
