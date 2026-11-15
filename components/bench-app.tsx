"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { botTwist, botWrite, limits, roundTitle, twistCopy, writeCopy } from "@/lib/game/content";
import { BENCH_NAMES, benchScores } from "@/lib/game/bench";
import { sourceSeatFor, twisterSeat } from "@/lib/game/engine";
import { ROUND_KINDS, type Photo, type RoundKind } from "@/lib/game/types";
import { SiteCard } from "./site-card";

type Draft = {
  seat: number;
  topic: string;
  query: string;
  photos: Photo[];
  write: string;
  twist: string;
  photo: number | null;
};

export function BenchApp() {
  const [kind, setKind] = useState<RoundKind>("messenger");
  const [cap, setCap] = useState(3);
  const [finale, setFinale] = useState(false);
  const [source, setSource] = useState<"model" | "backup" | null>(null);
  const [cards, setCards] = useState<Draft[] | null>(null);
  const [votes, setVotes] = useState<Array<number | null>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setPending(true);
    setError(null);
    setCards(null);
    setVotes([]);
    void fetch("/api/bench", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, cap }),
    })
      .then(async (response) => {
        const body = (await response.json()) as { source?: "model" | "backup" | null; cards?: Draft[]; error?: string };
        if (!response.ok || !body.cards) throw new Error(body.error ?? "Заходы не собрались");
        if (cancel) return;
        setSource(body.source ?? null);
        setCards(body.cards.map((card) => ({ ...card, photos: card.photos ?? [], write: "", twist: "", photo: kind === "instagram" && card.photos?.length ? 0 : null })));
        setVotes(Array.from({ length: body.cards.length }, () => null));
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Не вышло");
      })
      .finally(() => {
        if (!cancel) setPending(false);
      });
    return () => {
      cancel = true;
    };
  }, [kind, cap]);

  const max = limits(kind);
  const scores = useMemo(
    () =>
      cards
        ? benchScores({
            kind,
            finale,
            rows: cards.map((card) => ({ write: card.write, twist: card.twist, photo: card.photo })),
            votes,
          })
        : [],
    [cards, finale, kind, votes],
  );

  function patch(seat: number, change: Partial<Draft>) {
    setCards((current) => current?.map((card) => (card.seat === seat ? { ...card, ...change } : card)) ?? null);
  }

  function fillBots() {
    setCards((current) =>
      current?.map((card) => ({
        ...card,
        write: kind === "instagram" ? "" : botWrite(kind, card.seat, 0),
        twist: botTwist(kind, card.seat, 0),
        photo: kind === "instagram" && card.photos.length > 0 ? 0 : card.photo,
      })) ?? null,
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-white/50 underline">
            На главную
          </Link>
          <h1 className="mt-2 text-4xl font-semibold">Стенд раунда</h1>
          <p className="mt-2 max-w-2xl text-white/65">Все заходы одного режима, без таймера. Фразы, подколы и голоса можно менять: счёт справа считается теми же правилами, что в игре.</p>
        </div>
        <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={fillBots} disabled={!cards}>
          Подставить заготовки
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {ROUND_KINDS.map((item) => (
          <button key={item} type="button" onClick={() => { setKind(item); setCards(null); setVotes([]); }} className={`rounded-full px-3 py-2 text-sm ${kind === item ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
            {roundTitle(item)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/55">Мест</span>
        {[3, 4, 5, 6, 7, 8].map((value) => (
          <button key={value} type="button" onClick={() => { setCap(value); setCards(null); setVotes([]); }} className={`grid size-9 place-items-center rounded-full ${cap === value ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
            {value}
          </button>
        ))}
        <button type="button" onClick={() => setFinale((value) => !value)} className={`rounded-full px-3 py-2 text-sm ${finale ? "bg-[#ffb020] text-[#1a100c]" : "bg-white/10"}`}>
          {finale ? "Финал ×2" : "Обычный раунд"}
        </button>
        <span className="text-sm text-white/50">{pending ? "Собираем заходы…" : source === "model" ? "Заходы модели" : source === "backup" ? "Запасной набор" : ""}</span>
      </div>
      {error ? <p className="mt-4 text-[#ff8d72]">{error}</p> : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          {cards?.map((card) => {
            const author = BENCH_NAMES[card.seat] ?? `Игрок ${card.seat + 1}`;
            const twister = BENCH_NAMES[twisterSeat(card.seat, cards.length)] ?? "";
            const photo = card.photo !== null ? card.photos[card.photo] ?? null : null;
            return (
              <section key={card.seat} className="grid gap-4 rounded-3xl bg-white/5 p-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <p className="text-sm text-white/50">{kind === "thread" ? `${author} пишет реплай · ${twister} ставит пост` : `${author} пишет · ${twister} выворачивает`}</p>
                  <label className="mt-3 block text-sm text-white/55">
                    {kind === "thread" ? "Заготовка" : "Заход"}
                    <textarea value={card.topic} onChange={(event) => patch(card.seat, { topic: event.target.value })} className="mt-1 min-h-16 w-full rounded-xl bg-black/30 px-3 py-2 text-base text-white" />
                  </label>
                  {kind === "instagram" ? (
                    <div className="mt-3">
                      <p className="text-sm text-white/55">Кадр · {card.query || "без запроса"}</p>
                      {card.photos.length === 0 ? <p className="mt-2 text-sm text-white/45">Фото не нашлось. Подкол всё равно можно проверить.</p> : (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {card.photos.map((item, index) => (
                            <button key={item.url} type="button" onClick={() => patch(card.seat, { photo: index })} className={`overflow-hidden rounded-xl ${card.photo === index ? "ring-2 ring-[#ff5a36]" : ""}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.thumb || item.url} alt={card.query || "кадр"} className="h-28 w-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="mt-3 block text-sm text-white/55">
                      {writeCopy(kind, card.topic).title}
                      <input value={card.write} maxLength={max.write} onChange={(event) => patch(card.seat, { write: event.target.value })} placeholder={writeCopy(kind, card.topic).placeholder} className="mt-1 h-11 w-full rounded-xl bg-black/30 px-3 text-base text-white" />
                      <span className="mt-1 block text-white/35">{card.write.length}/{max.write}</span>
                    </label>
                  )}
                  <label className="mt-3 block text-sm text-white/55">
                    {twistCopy(kind).title}
                    <input value={card.twist} maxLength={max.twist} onChange={(event) => patch(card.seat, { twist: event.target.value })} placeholder={twistCopy(kind).placeholder} className="mt-1 h-11 w-full rounded-xl bg-black/30 px-3 text-base text-white" />
                    <span className="mt-1 block text-white/35">{card.twist.length}/{max.twist}</span>
                  </label>
                </div>
                <SiteCard kind={kind} mode="show" compact write={card.write} twist={card.twist} photo={photo} author={author} poster={twister} likes={votes.filter((choice) => choice === card.seat).length} topic={card.topic} />
              </section>
            );
          })}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="rounded-3xl bg-white/5 p-4">
            <h2 className="text-xl font-semibold">{kind === "thread" ? "Лайки" : "Голоса"}</h2>
            <p className="mt-1 text-sm text-white/50">{kind === "thread" ? "Свой пост лайкнуть нельзя." : "За свой подкол голосовать нельзя."}</p>
            <div className="mt-3 space-y-3">
              {cards?.map((_, voter) => {
                const forbidden = sourceSeatFor(voter, cards.length);
                return (
                  <div key={voter}>
                    <p className="text-sm text-white/70">{BENCH_NAMES[voter]}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cards.map((card) => {
                        const blocked = card.seat === forbidden;
                        const selected = votes[voter] === card.seat;
                        return (
                          <button
                            key={card.seat}
                            type="button"
                            disabled={blocked}
                            onClick={() => setVotes((current) => current.map((choice, index) => (index === voter ? (choice === card.seat ? null : card.seat) : choice)))}
                            className={`rounded-full px-2 py-1 text-xs ${blocked ? "bg-white/5 text-white/25" : selected ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}
                          >
                            {blocked ? "свой" : BENCH_NAMES[card.seat]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-3xl bg-white/5 p-4">
            <h2 className="text-xl font-semibold">Очки</h2>
            {scores.length === 0 ? <p className="mt-2 text-sm text-white/50">{kind === "thread" ? "Пока пусто. Нужны реплай, пост и чужой лайк." : "Пока пусто. Нужны подкол и чужой голос. Пустая фраза, кроме Витрины, в счёт не идёт."}</p> : (
              <ul className="mt-3 space-y-3">
                {scores.map((score) => (
                  <li key={score.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <b>{score.name}</b>
                      <span className="tabular-nums text-[#9be7b8]">+{score.delta}</span>
                    </div>
                    <p className="text-sm text-white/50">{score.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
