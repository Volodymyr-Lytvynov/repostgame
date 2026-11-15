"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { phaseLabel } from "@/lib/game/view";
import { roundTitle } from "@/lib/game/content";
import type { ClientView } from "@/lib/game/types";
import { DebugBar } from "./debug-bar";
import { QrImage } from "./qr-image";
import { SiteCard } from "./site-card";
import { readSession, useRoom } from "./use-room";

export function ScreenApp({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const session = readSession(code);
    setToken(session.hostToken ?? session.playerToken ?? null);
  }, [code]);
  const { view, error, offline, send } = useRoom(code, token);
  const now = useClock(view?.serverNow);

  if (error && !view) {
    return <Shell><p className="text-2xl">{error}</p><Link href="/" className="mt-4 underline">На главную</Link></Shell>;
  }
  if (!view) return <Shell><p className="text-2xl">Открываем комнату…</p></Shell>;

  const title = view.kind ? roundTitle(view.kind) : "Кривой репост";
  const finale = view.kind === "instagram" && view.round === view.roundCount - 1;
  const left = secondsLeft(view.deadline, now);

  return (
    <Shell>
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/50">{view.phase === "lobby" ? "Комната" : `Раунд ${view.round + 1} из ${view.roundCount}`}</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          {finale && view.phase !== "done" ? <p className="text-[#ffb020]">Финал · очки ×2</p> : null}
        </div>
        <div className="text-right">
          {view.paused ? <div className="text-4xl font-semibold text-[#ffb020]">Пауза</div> : null}
          {!view.paused && left !== null && view.phase !== "lobby" && view.phase !== "done" ? <div className="text-4xl font-semibold tabular-nums">{left}</div> : null}
          {view.debug && !view.paused ? <p className="text-sm text-[#ffb020]">Проверка</p> : null}
          <p className="max-w-[16rem] text-sm text-white/60">{phaseLabel(view.phase, view.kind)}</p>
        </div>
      </header>

      <section className="grid flex-1 place-items-center py-4">
        {view.phase === "lobby" ? <Lobby view={view} /> : null}
        {view.phase === "write" || view.phase === "twist" ? (
          <SiteCard kind={view.kind ?? "thread"} mode="wait" topic={view.kind === "instagram" ? "Кадр выбирают на телефонах" : undefined} />
        ) : null}
        {view.phase === "reveal" && view.spotlight ? (
          <div className="w-full">
            <SiteCard
              kind={view.spotlight.kind}
              mode="show"
              write={view.spotlight.write}
              twist={view.spotlight.twist}
              photo={view.spotlight.photo}
              author={view.spotlight.authorName}
              poster={view.spotlight.twisterName}
              topic={view.spotlight.topic}
            />
            <p className="mt-3 text-center text-white/70">{view.spotlight.kind === "thread" ? `реплай ${view.spotlight.authorName} · пост ${view.spotlight.twisterName}` : `фраза ${view.spotlight.authorName} · подкол ${view.spotlight.twisterName}`}</p>
          </div>
        ) : null}
        {view.phase === "vote" ? <Ballot view={view} /> : null}
        {view.phase === "scores" || view.phase === "done" ? <Scores view={view} send={send} /> : null}
      </section>

      <footer className="space-y-3">
        {offline ? <p className="text-center text-sm text-[#ffb020]">Нет связи. Пробуем ещё.</p> : null}
        <PlayerRow view={view} />
        {view.isHost || view.demo ? <DebugBar view={view} send={send} /> : null}
      </footer>
    </Shell>
  );
}

function Lobby({ view }: { view: ClientView }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
      {origin ? <QrImage value={`${origin}${view.joinPath}`} className="size-56" /> : <div className="size-56" />}
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Код комнаты</p>
        <p data-testid="room-code" className="text-7xl font-semibold tracking-[0.18em]">{view.code}</p>
        <p className="mt-2 max-w-md text-white/70">Отсканируйте код телефоном или откройте сайт и введите эти четыре знака.</p>
        <p className="mt-4 text-lg">{view.deck.label}</p>
        <p className="text-white/50">{view.players.length} из {view.cap} уже внутри</p>
        <p className="mt-4 text-sm uppercase tracking-[0.16em] text-white/45">Катка {view.match}</p>
        <p className="mt-1 text-xl">{view.playlist.map((kind, index) => `${index + 1}. ${roundTitle(kind)}`).join("  ·  ")}</p>
      </div>
    </div>
  );
}

function Ballot({ view }: { view: ClientView }) {
  return (
    <div className="w-full">
      {view.kind === "thread" ? (
        <p className="mb-4 text-center text-white/70">Лайк приносит паре 100 очков: по 50 автору реплая и тому, кто поставил пост. Если пара одна впереди — ещё по 100. В финале всё ×2.</p>
      ) : view.round === 0 ? (
        <p className="mb-4 text-center text-white/70">100 очков за голос получает тот, кто вывернул фразу. Если одна карточка впереди — ещё 200. В финале оба числа ×2.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.ballot.map((card) => (
          <div key={card.seat} className="relative">
            <SiteCard kind={card.kind} mode="show" compact write={card.write} twist={card.twist} photo={card.photo} author={card.authorName} poster={card.twisterName} likes={card.votes} topic={card.topic} />
            {card.kind === "thread" ? null : <span className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-1 text-sm text-white">{card.votes}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Scores({ view, send }: { view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const lead = view.winners;
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="w-full max-w-xl">
      {view.phase === "done" ? (
        <div className="mb-6 text-center">
          <h2 className="text-5xl font-semibold">{lead.length === 0 ? "Никто не набрал очков" : lead.length > 1 ? `Ничья: ${lead.join(", ")}` : `Выжил ${lead[0]}`}</h2>
          {view.isHost || view.demo ? (
            <button type="button" className="mt-4 rounded-full bg-[#ff5a36] px-5 py-3 text-lg font-medium text-[#1a100c]" onClick={() => void send({ type: "again" }).catch((caught: Error) => setError(caught.message))}>
              Ещё катка
            </button>
          ) : null}
          {error ? <p className="mt-2 text-[#ff8d72]">{error}</p> : null}
        </div>
      ) : null}
      <ul className="space-y-3">
        {view.scoreboard.map((row) => (
          <li key={row.id} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-2xl">{row.name}</span>
            <span className="text-right">
              <b className="text-2xl tabular-nums">{row.total}</b>
              {row.delta ? <span className="ml-3 text-[#9be7b8]">+{row.delta}</span> : null}
              {row.reason ? <span className="mt-1 block text-sm text-white/55">{row.reason}</span> : <span className="mt-1 block text-sm text-white/40">без очков в этом раунде</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlayerRow({ view }: { view: ClientView }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {view.players.map((player) => {
        const ready = view.seatsReady.includes(player.id);
        return (
          <span key={player.id} className="rounded-full bg-white/10 px-3 py-1 text-sm" style={{ boxShadow: ready ? `inset 0 0 0 2px ${player.color}` : undefined }}>
            <i className="mr-2 inline-block size-2 rounded-full" style={{ background: player.color }} />
            {player.name}
            <b className="ml-2 tabular-nums">{player.score}</b>
          </span>
        );
      })}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col bg-[#14110e] px-4 py-4 text-[#f6f1e8] sm:px-8">{children}</main>;
}

function useClock(serverNow?: number) {
  const [now, setNow] = useState(serverNow ?? Date.now());
  useEffect(() => {
    if (!serverNow) return;
    const offset = serverNow - Date.now();
    const id = window.setInterval(() => setNow(Date.now() + offset), 200);
    setNow(Date.now() + offset);
    return () => window.clearInterval(id);
  }, [serverNow]);
  return now;
}

function secondsLeft(deadline: number | null, now: number) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
