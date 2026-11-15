"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LINEUP_COPY, roundTitle, twistCopy, writeCopy } from "@/lib/game/content";
import { phaseLabel } from "@/lib/game/view";
import type { ClientView, LineupId, PlayerTask } from "@/lib/game/types";
import { DebugBar } from "./debug-bar";
import { SiteCard } from "./site-card";
import { QrImage } from "./qr-image";
import { readSession, useRoom, writeSession } from "./use-room";

export function PhoneApp({ code }: { code: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const session = readSession(code);
    setToken(session.playerToken ?? session.hostToken ?? null);
    setReady(true);
  }, [code]);
  const room = useRoom(code, ready ? token : null);
  if (!ready || !room.view && !room.error) {
    return <PhoneShell><p>Подключаемся…</p></PhoneShell>;
  }
  if (room.error && !room.view) {
    return <PhoneShell><p className="text-xl">{room.error}</p><Link className="mt-4 underline" href="/">На главную</Link></PhoneShell>;
  }
  if (!room.view) return <PhoneShell><p>Подключаемся…</p></PhoneShell>;
  if (!room.view.you) {
    return <Join code={code} view={room.view} token={token} onJoined={(playerToken) => {
      const session = { ...readSession(code), playerToken };
      writeSession(code, session);
      setToken(playerToken);
    }} send={room.send} />;
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
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <PhoneShell>
      <p className="text-sm uppercase tracking-[0.16em] text-white/50">Комната {code}</p>
      <h1 className="mt-2 text-3xl font-semibold">Как тебя записать?</h1>
      <p className="mt-2 text-white/65">Имя увидят на экране. От 2 до 16 символов.</p>
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
            setError(caught instanceof Error ? caught.message : "Не вышло войти");
          } finally {
            setPending(false);
          }
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Оля" maxLength={16} className="h-12 bg-white/5 px-3 text-base text-white md:text-base" />
        {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
        <Button type="submit" disabled={pending || name.trim().length < 2} className="h-12 w-full rounded-xl text-base">
          {pending ? "Входим…" : "Войти"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-white/50">{view.players.length} из {view.cap} уже внутри</p>
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
  const now = useClock(view.serverNow);
  const left = view.deadline ? Math.max(0, Math.ceil((view.deadline - now) / 1000)) : null;
  const finale = view.kind === "instagram" && view.round === view.roundCount - 1;
  return (
    <PhoneShell>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">{view.phase === "lobby" ? `Комната ${code}` : `${roundTitle(view.kind ?? "thread", view.skins)} · ${view.round + 1}/${view.roundCount}`}</p>
          <h1 className="text-2xl font-semibold">{view.phase === "lobby" ? "Ждём игроков" : phaseLabel(view.phase)}</h1>
          {finale && view.phase !== "done" ? <p className="text-sm text-[#ffb020]">Финал, очки ×2</p> : null}
        </div>
        {view.paused ? <div className="text-3xl font-semibold text-[#ffb020]">Пауза</div> : null}
        {!view.paused && left !== null && view.phase !== "lobby" && view.phase !== "done" ? <div className="text-3xl font-semibold tabular-nums">{left}</div> : null}
      </header>
      {offline ? <p className="mt-3 text-sm text-[#ffb020]">Нет связи. Пробуем ещё.</p> : null}
      <div className="mt-6">
        {view.phase === "lobby" ? <LobbyPhone code={code} view={view} send={send} /> : null}
        {view.you?.task?.phase === "write" ? <WriteForm task={view.you.task} send={send} /> : null}
        {view.you?.task?.phase === "twist" ? <TwistForm task={view.you.task} send={send} /> : null}
        {view.you?.task?.phase === "vote" ? <VoteForm task={view.you.task} skins={view.skins} send={send} /> : null}
        {view.phase !== "lobby" && !view.you?.task ? <Waiting view={view} /> : null}
        {view.phase === "done" ? <Done view={view} /> : null}
      </div>
      {view.isHost || view.you?.host ? <div className="mt-8"><DebugBar view={view} send={send} /></div> : null}
    </PhoneShell>
  );
}

function LobbyPhone({ code, view, send }: { code: string; view: ClientView; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const host = view.isHost || view.you?.host;
  const startReason = !view.deck.ready ? view.deck.label : view.players.length < 3 ? "Нужно минимум три игрока" : "";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-5xl font-semibold tracking-[0.14em]">{view.code}</p>
        <p className="mt-2 text-white/65">Общий экран открывается отдельно. Эту страницу оставьте себе: с неё вы пишете и голосуете.</p>
        <a href={`/tv/${code}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white text-base font-medium text-[#14110e]">
          Открыть общий экран
        </a>
      </div>
      {origin ? <QrImage value={`${origin}/play/${code}`} className="size-40" /> : null}
      <ul className="space-y-2">
        {view.players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 text-lg">
            <i className="size-3 rounded-full" style={{ background: player.color }} />
            {player.name}{player.host ? " · создатель" : ""}{player.bot ? " · бот" : ""}
          </li>
        ))}
      </ul>
      {host ? (
        <div className="space-y-4 rounded-3xl bg-white/5 p-4">
          <div>
            <p className="text-sm text-white/55">Сколько мест в колоде</p>
            <div className="mt-2 flex gap-2">
              {[3, 4, 5, 6, 7, 8].map((cap) => (
                <button key={cap} type="button" onClick={() => void send({ type: "cap", cap }).catch((caught: Error) => setError(caught.message))} className={`grid size-10 place-items-center rounded-full ${view.cap === cap ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>{cap}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            {(Object.keys(LINEUP_COPY) as LineupId[]).map((id) => (
              <button key={id} type="button" onClick={() => void send({ type: "lineup", lineup: id })} className={`rounded-2xl px-3 py-3 text-left ${view.lineup === id ? "bg-white text-[#14110e]" : "bg-white/10"}`}>
                <b>{LINEUP_COPY[id].title}</b>
                <span className="mt-1 block text-sm opacity-70">{LINEUP_COPY[id].detail}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-white/60">{view.deck.label}</p>
          {view.deck.source === "backup" ? <p className="text-sm text-white/70">Заходы из запасного набора. С ключом модели темы будут новыми в каждой комнате. Фото всё равно ищутся в интернете.</p> : null}
          {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
          <Button type="button" disabled={Boolean(startReason)} className="h-12 w-full rounded-xl text-base" onClick={() => void send({ type: "start" }).catch((caught: Error) => setError(caught.message))}>
            {startReason || "Начать"}
          </Button>
        </div>
      ) : (
        <p className="text-white/60">{view.deck.ready ? "Создатель может начинать." : view.deck.label}</p>
      )}
    </div>
  );
}

function WriteForm({ task, send }: { task: Extract<PlayerTask, { phase: "write" }>; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const copy = writeCopy(task.kind, task.topic);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(photo: number | null, value = text) {
    setPending(true);
    setError(null);
    try {
      await send({ type: "write", text: value, photo });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не отправилось");
      setPending(false);
    }
  }
  if (task.kind === "instagram") {
    return (
      <div>
        <h2 className="text-2xl font-semibold">{copy.title}</h2>
        <p className="mt-2 text-lg text-white/75">{copy.hint}</p>
        {task.photos.length === 0 ? (
          <Button type="button" className="mt-6 h-12 w-full rounded-xl" disabled={pending} onClick={() => void submit(null)}>Кадр не нашёлся, идём дальше</Button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {task.photos.map((photo, index) => (
              <button key={photo.url} type="button" disabled={pending} onClick={() => void submit(index)} className="overflow-hidden rounded-2xl">
                {/* Remote photo URLs come from search and are not known at build time. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumb || photo.url} alt={copy.hint} className="aspect-[4/5] w-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-[#ff8d72]">{error}</p> : null}
      </div>
    );
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(null); }}>
      <h2 className="text-2xl font-semibold">{copy.title}</h2>
      <p className="mt-2 text-lg text-white/75">{copy.hint}</p>
      <Input value={text} maxLength={task.max} onChange={(event) => setText(event.target.value)} placeholder={copy.placeholder} className="mt-4 h-12 bg-white/5 px-3 text-base text-white md:text-base" />
      <div className="mt-2 flex justify-between text-sm text-white/45">
        <span>{text.length}/{task.max}</span>
      </div>
      {error ? <p className="mt-2 text-sm text-[#ff8d72]">{error}</p> : null}
      <Button type="submit" disabled={pending || text.trim().length === 0} className="mt-3 h-12 w-full rounded-xl text-base">Отправить</Button>
    </form>
  );
}

function TwistForm({ task, send }: { task: Extract<PlayerTask, { phase: "twist" }>; send: (action: Record<string, unknown>) => Promise<unknown> }) {
  const copy = twistCopy(task.kind);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          await send({ type: "twist", text });
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Не отправилось");
          setPending(false);
        }
      }}
    >
      <p className="text-sm text-white/50">Фраза {task.sourceName}</p>
      {task.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={task.photo.url} alt="" className="mt-3 aspect-[4/5] w-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
      ) : <p className="mt-2 text-2xl font-semibold">«{task.sourceText}»</p>}
      <h2 className="mt-5 text-2xl font-semibold">{copy.title}</h2>
      <Input value={text} maxLength={task.max} onChange={(event) => setText(event.target.value)} placeholder={copy.placeholder} className="mt-4 h-12 bg-white/5 px-3 text-base text-white md:text-base" />
      <div className="mt-2 text-sm text-white/45">{text.length}/{task.max}</div>
      {error ? <p className="mt-2 text-sm text-[#ff8d72]">{error}</p> : null}
      <Button type="submit" disabled={pending || text.trim().length === 0} className="mt-3 h-12 w-full rounded-xl text-base">Вывернуть</Button>
    </form>
  );
}

function VoteForm({
  task,
  skins,
  send,
}: {
  task: Extract<PlayerTask, { phase: "vote" }>;
  skins: ClientView["skins"];
  send: (action: Record<string, unknown>) => Promise<unknown>;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Что стыднее?</h2>
      <p className="text-white/60">Свой подкол выбрать нельзя. Голос можно сменить, пока идёт таймер.</p>
      {task.options.map((card) => (
        <button
          key={card.seat}
          type="button"
          disabled={card.mine}
          onClick={() => void send({ type: "vote", seat: card.seat }).catch((caught: Error) => setError(caught.message))}
          className={`block w-full rounded-2xl text-left ${card.selected ? "ring-2 ring-[#ff5a36]" : ""} ${card.mine ? "opacity-50" : ""}`}
        >
          <SiteCard kind={card.kind} skins={skins} mode="show" compact write={card.write} twist={card.twist} photo={card.photo} author={card.authorName} topic={card.topic} />
          {card.mine ? <span className="mt-1 block text-sm text-white/50">Это твой подкол</span> : null}
        </button>
      ))}
      {error ? <p className="text-sm text-[#ff8d72]">{error}</p> : null}
    </div>
  );
}

function Waiting({ view }: { view: ClientView }) {
  if (view.phase === "scores") {
    const mine = view.scoreboard.find((row) => row.id === view.you?.id);
    return (
      <div>
        <p className="text-lg text-white/70">Счёт на экране.</p>
        {mine ? <p className="mt-3 text-3xl font-semibold">{mine.total} {mine.delta ? <span className="text-[#9be7b8]">+{mine.delta}</span> : null}</p> : null}
        {mine?.reason ? <p className="mt-2 text-white/60">{mine.reason}</p> : <p className="mt-2 text-white/45">В этом раунде очков нет.</p>}
      </div>
    );
  }
  return <p className="text-lg text-white/70">Ответ ушёл. Смотри на общий экран: {phaseLabel(view.phase).toLowerCase()}.</p>;
}

function Done({ view }: { view: ClientView }) {
  const mine = view.scoreboard.find((row) => row.id === view.you?.id);
  const won = view.winners.includes(view.you?.name ?? "");
  return (
    <div>
      <h2 className="text-3xl font-semibold">{won ? "Ты выжил" : view.winners.length ? `Выжил ${view.winners.join(", ")}` : "Партия закрыта"}</h2>
      <p className="mt-3 text-4xl font-semibold tabular-nums">{mine?.total ?? 0}</p>
      <Link href="/" className="mt-6 inline-block underline">Ещё одна комната</Link>
    </div>
  );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#14110e] px-4 py-6 text-[#f6f1e8]">{children}</main>;
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
