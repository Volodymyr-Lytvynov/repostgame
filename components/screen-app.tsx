"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeList, FeedCardView, ModeIntro } from "@/components/site-card";
import { phaseLabel } from "@/lib/game/view";
import { t } from "@/lib/game/i18n";
import type { ClientView } from "@/lib/game/types";
import { DebugBar } from "./debug-bar";
import { QrImage } from "./qr-image";
import { readSession, secondsLeft, useClock, useRoom } from "./use-room";

export function ScreenApp({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const session = readSession(code);
    setToken(session.hostToken ?? session.playerToken ?? null);
    setOrigin(window.location.origin);
  }, [code]);
  const { view, error, offline, send } = useRoom(code, token);
  const now = useClock(view?.serverNow);
  const [origin, setOrigin] = useState("");
  if (error && !view) {
    return <Shell><p className="text-2xl">{error}</p><Link href="/" className="mt-4 underline">{t("en", "home")}</Link></Shell>;
  }
  if (!view) return <Shell><p className="text-2xl">{t("en", "connecting")}</p></Shell>;
  const language = view.config.language;
  const left = secondsLeft(view.deadline, now);
  return (
    <Shell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/50">
            {view.phase === "lobby" ? view.code : t(language, "roundOf", { round: view.round + 1, total: view.roundCount })}
            {view.contestCount > 1 && (view.phase === "reveal" || view.phase === "voting" || view.phase === "results") ? ` · ${t(language, "duelOf", { n: view.contest + 1, total: view.contestCount })}` : ""}
          </p>
          <h1 className="text-4xl font-semibold">{view.mode ? t(language, `mode_${view.mode}`) : "Digital Footprint"}</h1>
        </div>
        <div className="text-right">
          {view.paused ? <div className="text-4xl font-semibold text-[#ffb020]">{t(language, "pause")}</div> : null}
          {!view.paused && left !== null ? <div className="text-5xl font-semibold tabular-nums">{left}</div> : null}
          <p className="text-sm text-white/60">{phaseLabel(language, view.phase, view.mode)}</p>
        </div>
      </header>
      <section className="grid flex-1 content-center justify-items-center gap-4 py-6">
        {view.phase === "lobby" ? <Lobby view={view} origin={origin} send={send} /> : null}
        {view.phase === "generating" ? <p className="text-2xl text-white/70">{t(language, "generatingHint")}</p> : null}
        {view.phase === "round_intro" && view.mode ? <ModeIntro mode={view.mode} language={language} /> : null}
        {view.phase === "writing" ? <p className="text-2xl text-white/70">{t(language, "ready", { done: view.readyIds.length, total: view.stepTotal })}</p> : null}
        {view.spotlight ? <FeedCardView card={view.spotlight} language={language} /> : null}
        {view.phase !== "game_over" && view.phase !== "favorites" ? (
          <div className="grid w-full gap-4 md:grid-cols-2">
            {view.board.map((card) => <FeedCardView key={card.id} card={card} language={language} />)}
          </div>
        ) : null}
        {view.phase === "results" || view.phase === "leaderboard" || view.phase === "game_over" || view.phase === "favorites" ? <Scores view={view} send={send} /> : null}
      </section>
      <footer className="space-y-3">
        {offline ? <p className="text-center text-sm text-[#ffb020]">{t(language, "offline")}</p> : null}
        <Roster view={view} />
        {view.isHost || view.demo ? <DebugBar view={view} send={send} /> : null}
      </footer>
    </Shell>
  );
}

function Lobby({ view, origin, send }: { view: ClientView; origin: string; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  return (
    <div className="grid w-full items-center gap-8 md:grid-cols-[auto_1fr]">
      {origin ? <QrImage value={`${origin}${view.joinPath}`} alt={view.code} className="size-56" /> : <div />}
      <div>
        <p className="text-5xl font-semibold tracking-widest">{view.code}</p>
        <p className="mt-3 text-lg text-white/65">{view.playlist.map((mode) => t(language, `mode_${mode}`)).join(" → ")}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {view.players.map((player) => (
            <li key={player.id} className="rounded-full bg-white/10 px-3 py-1" style={{ color: player.color }}>{player.name}</li>
          ))}
        </ul>
        {view.isHost && view.players.length >= 4 ? (
          <button type="button" className="mt-6 rounded-xl bg-[#ff5a36] px-5 py-3 text-[#1a100c]" onClick={() => void send({ type: "start" })}>
            {t(language, "start")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Scores({ view, send }: { view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  return (
    <div className="w-full max-w-3xl">
      {view.phase === "game_over" ? (
        <h2 className="mb-4 text-center text-4xl font-semibold">
          {view.winners.length ? view.winners.join(" · ") : t(language, "noWinner")}
        </h2>
      ) : null}
      <ol className="space-y-2">
        {view.scoreboard.map((player, index) => (
          <li key={player.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-xl font-semibold" style={{ color: player.color }}>{index + 1}. {player.name}</p>
              {player.reason ? <p className="text-sm text-white/55">{player.reason}</p> : null}
              <div className="mt-1"><BadgeList kinds={player.badges} language={language} /></div>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{player.total}</p>
          </li>
        ))}
      </ol>
      {view.phase === "favorites" || view.phase === "game_over" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <p className="md:col-span-2 text-sm uppercase tracking-[0.16em] text-white/40">{t(language, "gallery")} · {t(language, "fiction")}</p>
          {view.gallery.map((card) => <FeedCardView key={card.id} card={card} language={language} />)}
        </div>
      ) : null}
      {view.phase === "game_over" && (view.isHost || view.demo) ? (
        <button type="button" className="mt-6 rounded-xl bg-white/10 px-5 py-3" onClick={() => void send({ type: "again" })}>{t(language, "nextMatch")}</button>
      ) : null}
    </div>
  );
}

function Roster({ view }: { view: ClientView }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {view.players.map((player) => (
        <li key={player.id} className={`rounded-full px-3 py-1 text-sm ${view.readyIds.includes(player.id) ? "bg-[#3dd68c] text-[#102218]" : "bg-white/10"}`} style={view.readyIds.includes(player.id) ? undefined : { color: player.color }}>
          {player.name} · {player.score}
        </li>
      ))}
    </ul>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-6">{children}</main>;
}
