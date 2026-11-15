"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { BadgeList, FeedCardView, ModeIntro } from "@/components/site-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/game/i18n";
import type { ClientView, FeedCard, GameConfig, Mode, PlayerTask } from "@/lib/game/types";
import { DebugBar } from "./debug-bar";
import { QrImage } from "./qr-image";
import { readSession, secondsLeft, useClock, useRoom, writeSession } from "./use-room";

export function PhoneApp({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const session = readSession(code);
    setToken(session.playerToken ?? session.hostToken ?? null);
    setReady(true);
  }, [code]);
  const room = useRoom(code, ready ? token : null);
  if (!ready || (!room.view && !room.error)) return <PhoneShell><p>{t("en", "connecting")}</p></PhoneShell>;
  if (room.error && !room.view) {
    return (
      <PhoneShell>
        <p className="text-xl">{room.error}</p>
        <Link className="mt-4 underline" href="/">{t("en", "home")}</Link>
      </PhoneShell>
    );
  }
  if (!room.view) return <PhoneShell><p>{t("en", "connecting")}</p></PhoneShell>;
  if (!room.view.you) {
    return (
      <Join
        code={code}
        view={room.view}
        token={token}
        onJoined={(playerToken) => {
          writeSession(code, { ...readSession(code), playerToken });
          setToken(playerToken);
        }}
        send={room.send}
      />
    );
  }
  return <Controller code={code} view={room.view} offline={room.offline} send={room.send} />;
}

function Join({
  code,
  view,
  token,
  onJoined,
  send,
}: {
  code: string;
  view: ClientView;
  token: string | null;
  onJoined: (token: string) => void;
  send: (action: Record<string, unknown>, auth?: string | null) => Promise<ClientView & { playerToken?: string }>;
}) {
  const language = view.config.language;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <PhoneShell>
      <p className="text-sm uppercase tracking-[0.16em] text-white/50">{code}</p>
      <h1 className="mt-2 text-3xl font-semibold">{t(language, "yourName")}</h1>
      <p className="mt-2 text-white/65">{t(language, "nameHint")}</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            const body = await send({ type: "join", name }, token);
            if (body.playerToken) onJoined(body.playerToken);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : t(language, "roomDown"));
          } finally {
            setPending(false);
          }
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={16} className="h-12 bg-white/5 px-3 text-base text-white md:text-base" />
        {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
        <Button type="submit" disabled={pending || name.trim().length < 2} className="h-12 w-full rounded-xl text-base">
          {t(language, "join")}
        </Button>
      </form>
    </PhoneShell>
  );
}

function Controller({
  code,
  view,
  offline,
  send,
}: {
  code: string;
  view: ClientView;
  offline: boolean;
  send: (action: Record<string, unknown>) => Promise<unknown>;
}) {
  const language = view.config.language;
  const now = useClock(view.serverNow);
  const left = secondsLeft(view.deadline, now);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <PhoneShell>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">{code}</p>
          <h1 className="text-2xl font-semibold">{view.mode ? t(language, `mode_${view.mode}`) : "Digital Footprint"}</h1>
          {view.phase !== "lobby" ? <p className="text-sm text-white/55">{t(language, "roundOf", { round: view.round + 1, total: view.roundCount })}</p> : null}
        </div>
        {left !== null && !view.paused ? <p className="text-3xl font-semibold tabular-nums">{left}</p> : null}
        {view.paused ? <p className="text-xl text-[#ffb020]">{t(language, "pause")}</p> : null}
      </header>
      {offline ? <p className="mt-3 text-sm text-[#ffb020]">{t(language, "offline")}</p> : null}
      <div className="mt-5 flex flex-1 flex-col gap-4">
        {view.phase === "lobby" ? <Lobby view={view} origin={origin} send={send} /> : null}
        {view.phase === "generating" ? <p className="text-lg text-white/70">{t(language, "generatingHint")}</p> : null}
        {view.phase === "round_intro" && view.mode ? <ModeIntro mode={view.mode} language={language} /> : null}
        {view.phase === "writing" ? <Tasks view={view} send={send} /> : null}
        {view.phase === "voting" ? <p className="text-sm text-white/50">{t(language, "abstain")}</p> : null}
        {view.spotlight ? <CardBlock card={view.spotlight} view={view} send={send} /> : null}
        {view.board.map((card) => <CardBlock key={card.id} card={card} view={view} send={send} />)}
        {view.phase === "results" || view.phase === "leaderboard" || view.phase === "game_over" ? <Scores view={view} send={send} /> : null}
      </div>
      {view.isHost || view.demo ? <div className="mt-6"><DebugBar view={view} send={send} /></div> : null}
    </PhoneShell>
  );
}

function Lobby({ view, origin, send }: { view: ClientView; origin: string; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: Record<string, unknown>) {
    setError(null);
    try {
      await send(action);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(language, "roomDown"));
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-white/70">{t(language, "tagline")}</p>
      {view.demo ? <p>{t(language, "demoWatch")}</p> : null}
      <Roster view={view} />
      {view.isHost ? (
        <div className="space-y-4">
          <Field label={t(language, "language")}>
            <Choice
              values={["en", "ru"]}
              current={view.config.language}
              label={(value) => (value === "ru" ? "Русский" : "English")}
              onPick={(value) => void run({ type: "settings", language: value })}
            />
          </Field>
          <Field label={t(language, "intensity")}>
            <Choice
              values={["casual", "unhinged", "footprint"] as GameConfig["intensity"][]}
              current={view.config.intensity}
              label={(value) => t(language, value)}
              onPick={(value) => void run({ type: "settings", intensity: value })}
            />
          </Field>
          <Field label={t(language, "rounds")}>
            <Choice values={[2, 3, 4, 5]} current={view.config.rounds} label={(value) => String(value)} onPick={(value) => void run({ type: "settings", rounds: value })} />
          </Field>
          <Field label={t(language, "playlist")}>
            <ol className="space-y-2">
              {view.playlist.map((mode, index) => (
                <li key={`${mode}-${index}`} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                  <span>{t(language, `mode_${mode}`)}</span>
                  <span className="flex gap-1">
                    <Tiny onClick={() => void run({ type: "settings", playlist: move(view.playlist, index, -1) })}>↑</Tiny>
                    <Tiny onClick={() => void run({ type: "settings", playlist: move(view.playlist, index, 1) })}>↓</Tiny>
                  </span>
                </li>
              ))}
            </ol>
          </Field>
          <label className="block text-sm text-white/60">
            {t(language, "exclusions")}
            <Input
              defaultValue={view.config.exclusions}
              maxLength={120}
              onBlur={(event) => void run({ type: "settings", exclusions: event.target.value })}
              className="mt-1 h-11 bg-white/5 text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={view.config.finaleMultiplier} onChange={(event) => void run({ type: "settings", finaleMultiplier: event.target.checked })} />
            {t(language, "finale")}
          </label>
          <Field label={t(language, "seats")}>
            <Choice values={[4, 5, 6, 7, 8]} current={view.cap} label={(value) => String(value)} onPick={(value) => void run({ type: "cap", cap: value })} />
          </Field>
          {origin ? <QrImage value={`${origin}${view.joinPath}`} alt={view.code} className="size-40" /> : null}
          <Link className="block underline text-white/70" href={`/tv/${view.code}`}>{t(language, "openScreen")}</Link>
          <Button
            type="button"
            disabled={pending || view.players.length < 4}
            className="h-12 w-full rounded-xl"
            onClick={() => {
              setPending(true);
              void run({ type: "start" }).finally(() => setPending(false));
            }}
          >
            {pending ? t(language, "starting") : t(language, "start")}
          </Button>
        </div>
      ) : (
        <p className="text-white/60">{t(language, "waiting")}</p>
      )}
      {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
    </div>
  );
}

function Tasks({ view, send }: { view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  const tasks = view.you?.tasks ?? [];
  if (tasks.length === 0) return <p className="text-white/70">{t(language, "sent")}</p>;
  return (
    <div className="space-y-4">
      {view.mode === "ratio" || view.mode === "explain" ? <p className="text-sm text-white/55">{t(language, "bothPrompts")}</p> : null}
      {view.mode === "dms" && view.writeStep === 1 ? <p className="text-sm text-white/55">{t(language, "contextHidden")}</p> : null}
      <p className="text-sm text-white/50">{t(language, "ready", { done: view.readyIds.length, total: view.stepTotal })}</p>
      {tasks.map((task) => <TaskForm key={task.assignmentId} task={task} language={language} send={send} />)}
    </div>
  );
}

function TaskForm({ task, language, send }: { task: PlayerTask; language: ClientView["config"]["language"]; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await send({ type: "submit", assignmentId: task.assignmentId, text });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(language, "roomDown"));
      setPending(false);
    }
  }
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-2 rounded-3xl border border-white/10 bg-[#171a21] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{task.title}</p>
      {task.aside ? <p className="text-sm text-white/55">{task.aside}</p> : null}
      <p className="text-lg leading-snug">{task.prompt}</p>
      <textarea
        value={text}
        maxLength={task.max}
        placeholder={task.placeholder}
        onChange={(event) => setText(event.target.value)}
        className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-base outline-none"
      />
      <div className="flex items-center justify-between text-sm text-white/45">
        <span>{text.trim().length}/{task.max}</span>
        <Button type="submit" disabled={pending || text.trim().length === 0} className="rounded-xl">{t(language, "submit")}</Button>
      </div>
      {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
    </form>
  );
}

function CardBlock({ card, view, send }: { card: FeedCard; view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  const choices = view.you?.choices ?? [];
  return (
    <FeedCardView
      card={card}
      language={language}
      footer={
        <>
          {view.phase === "voting"
            ? [card.entryA, card.entryB].filter((id) => id && choices.includes(id)).map((id) => {
                const line = id === card.entryA ? card.textA : card.textB;
                const picked = view.you?.votedEntry === id;
                return (
                  <Button key={id} type="button" variant={picked ? "default" : "outline"} className="h-auto max-w-full whitespace-normal rounded-2xl px-3 py-2 text-left" onClick={() => void send({ type: "vote", entryId: id })}>
                    {picked ? t(language, "liked") : t(language, "like")}
                    {line ? ` · ${line.slice(0, 80)}` : ""}
                  </Button>
                );
              })
            : null}
          {view.phase === "favorites" ? (
            <Button type="button" variant={view.you?.favorite === card.id ? "default" : "outline"} className="rounded-full" onClick={() => void send({ type: "favorite", entryId: card.id })}>
              {view.you?.favorite === card.id ? t(language, "favorited") : t(language, "favorite")}
              {card.favoriteVotes ? ` ${card.favoriteVotes}` : ""}
            </Button>
          ) : null}
          {view.isHost && (card.submissionA || card.submissionB) && view.phase !== "writing" && view.phase !== "lobby" ? (
            <>
              {card.submissionA ? <HostButton label={hostLabel(view)} onClick={() => void send({ type: "remove", submissionId: card.submissionA })} /> : null}
              {card.submissionB ? <HostButton label={hostLabel(view)} onClick={() => void send({ type: "remove", submissionId: card.submissionB })} /> : null}
            </>
          ) : null}
        </>
      }
    />
  );
}

function Scores({ view, send }: { view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const language = view.config.language;
  return (
    <section className="space-y-3">
      {view.phase === "game_over" ? (
        <h2 className="text-3xl font-semibold">{view.winners.length > 1 ? t(language, "winners") : t(language, "winner")}: {view.winners.join(", ") || t(language, "noWinner")}</h2>
      ) : null}
      {view.phase === "game_over" ? <p className="text-sm uppercase tracking-[0.16em] text-white/40">{t(language, "fiction")}</p> : null}
      <ol className="space-y-2">
        {view.scoreboard.map((player) => (
          <li key={player.id} className="rounded-2xl bg-white/5 px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold" style={{ color: player.color }}>{player.name}</span>
              <span className="tabular-nums">{player.total}{player.delta ? ` (+${player.delta})` : ""}</span>
            </div>
            {player.reason ? <p className="text-sm text-white/55">{player.reason}</p> : null}
            <div className="mt-2"><BadgeList kinds={player.badges} language={language} /></div>
          </li>
        ))}
      </ol>
      {view.phase === "game_over" && (view.isHost || view.demo) ? (
        <Button type="button" className="rounded-xl" onClick={() => void send({ type: "again" })}>{t(language, "nextMatch")}</Button>
      ) : null}
    </section>
  );
}

function Roster({ view }: { view: ClientView }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {view.players.map((player) => (
        <li key={player.id} className="rounded-full bg-white/10 px-3 py-1 text-sm" style={{ color: player.color }}>
          {player.name}
          {player.score ? ` · ${player.score}` : ""}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-white/50">{label}</p>
      {children}
    </div>
  );
}

function Choice<T extends string | number>({ values, current, label, onPick }: { values: readonly T[]; current: T; label: (value: T) => string; onPick: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button key={String(value)} type="button" onClick={() => onPick(value)} className={`rounded-full px-3 py-2 text-sm ${value === current ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
          {label(value)}
        </button>
      ))}
    </div>
  );
}

function Tiny({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full bg-white/10 px-2 py-1 text-sm">{children}</button>;
}

function HostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/70">{label}</button>;
}

function hostLabel(view: ClientView): string {
  const late = view.phase === "results" || view.phase === "leaderboard" || view.phase === "favorites" || view.phase === "game_over";
  return t(view.config.language, late ? "hide" : "remove");
}

function move(playlist: Mode[], index: number, direction: number): Mode[] {
  const next = [...playlist];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}

function PhoneShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">{children}</main>;
}
