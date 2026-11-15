"use client";

import { useState, type ReactNode } from "react";
import { handleOf, hashString, PALETTE, roundTitle } from "@/lib/game/content";
import type { Photo, RoundKind } from "@/lib/game/types";

export type StageProps = {
  kind: RoundKind;
  mode: "wait" | "show";
  write?: string;
  twist?: string;
  photo?: Photo | null;
  author?: string;
  poster?: string;
  likes?: number;
  topic?: string;
  compact?: boolean;
};

export function SiteCard(props: StageProps) {
  const body = renderKind(props);
  const canvas = props.kind === "thread" ? "bg-[#14120f]" : "bg-white text-black";
  if (props.compact) return <div className={`overflow-hidden rounded-2xl ${canvas}`}>{body}</div>;
  return (
    <div className="mx-auto w-[min(440px,94vw)] rounded-[2.2rem] border-8 border-[#1c1c1e] bg-black shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
      <div className={`overflow-hidden rounded-[1.55rem] ${canvas}`}>{body}</div>
    </div>
  );
}

function renderKind(props: StageProps) {
  if (props.kind === "messenger") return <Messenger {...props} />;
  if (props.kind === "thread") return <ThreadCard {...props} />;
  if (props.kind === "job") return <JobCard {...props} />;
  if (props.kind === "market") return <MarketCard {...props} />;
  if (props.kind === "search") return <SearchCard {...props} />;
  if (props.kind === "review") return <ReviewCard {...props} />;
  if (props.kind === "video") return <VideoCard {...props} />;
  if (props.kind === "ai") return <AiCard {...props} />;
  return <FeedCard {...props} />;
}

function Brand({ kind }: { kind: RoundKind }) {
  return <span className="text-[13px] font-semibold tracking-wide text-[#8a8178]">{roundTitle(kind)}</span>;
}

function Messenger({ mode, write, twist, author, compact }: StageProps) {
  const title = mode === "show" ? twist || "Чат" : "Новый чат";
  return (
    <div className={`flex flex-col ${compact ? "" : "min-h-[520px]"}`}>
      <header className="flex items-center gap-3 bg-[#3f342c] px-4 py-3 text-[#f6f1ea]">
        <span className="text-lg">‹</span>
        <Avatar name={author || "?"} light />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{title}</div>
          <div className="text-[11px] text-[#f6f1ea]/70">{mode === "show" ? "Весточка · был(а) недавно" : "Весточка · печатает…"}</div>
        </div>
      </header>
      <div className={`flex-1 bg-[#f3eadf] px-3 py-4 ${compact ? "min-h-28" : ""}`}>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-[#e4d8c8] bg-[#fffaf4] px-3 py-2 text-[15px] leading-snug text-[#1c1916]">
          {mode === "show" ? write : <Dots />}
          <div className="mt-1 text-right text-[10px] text-[#1c1916]/45">21:41</div>
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ mode, write, twist, author, poster, likes, compact }: StageProps) {
  const showing = mode === "show";
  const posterName = poster || "лента";
  const replyName = author || "Игрок";
  const postText = showing ? twist || "Пост" : "";
  const size = compact ? "size-8" : "size-10";
  return (
    <EchoShell compact={compact} tall={!compact}>
      <div className="flex gap-3">
        <div className={`flex ${compact ? "w-8" : "w-10"} flex-col items-center`}>
          <EchoAvatar name={posterName} className={size} />
          <span className="mt-1 min-h-4 w-0.5 flex-1 rounded-full bg-[#f6f1ea]/20" />
        </div>
        <div className="min-w-0 flex-1 pb-3">
          {showing ? <EchoName name={posterName} /> : null}
          <p className={`mt-1 leading-snug ${compact ? "text-[15px]" : "text-[17px]"}`}>
            {showing ? postText : <span className="text-[#f6f1ea]/55">Пост ещё пишут <Dots /></span>}
          </p>
          {showing ? <EchoBar text={postText} likes={likes} /> : null}
        </div>
      </div>
      <div className="flex gap-3">
        <div className={`flex ${compact ? "w-8" : "w-10"} justify-center`}>
          <EchoAvatar name={showing ? replyName : "?"} className={size} />
        </div>
        <div className="min-w-0 flex-1">
          {showing ? <EchoName name={replyName} /> : null}
          {showing ? <p className="text-[13px] text-[#f6f1ea]/45">В ответ {handleOf(posterName)}</p> : null}
          <p className={`mt-1 leading-snug ${compact ? "text-[15px]" : "text-[17px]"}`}>{showing ? write || "…" : <Dots />}</p>
          {showing ? <p className={`mt-2 ${likes ? "text-[#9a4632]" : "text-[#f6f1ea]/45"}`}><HeartIcon /></p> : null}
        </div>
      </div>
    </EchoShell>
  );
}

export function EchoShell({ children, compact, tall }: { children: ReactNode; compact?: boolean; tall?: boolean }) {
  return (
    <article className={`bg-[#14120f] text-[#f6f1ea] ${compact ? "p-3" : "px-4 py-4"} ${tall ? "min-h-[480px]" : ""}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <span className={`font-semibold ${compact ? "text-[16px]" : "text-[18px]"}`}>Эхо</span>
        <nav className="flex gap-3 text-[12px]">
          <span className="border-b-2 border-[#9a4632] pb-0.5">Лента</span>
          <span className="text-[#f6f1ea]/35">Рядом</span>
          <span className="text-[#f6f1ea]/35">Ответы</span>
        </nav>
      </header>
      {children}
    </article>
  );
}

export function EchoAvatar({ name, className = "size-10" }: { name: string; className?: string }) {
  const color = PALETTE[hashString(name) % PALETTE.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-[13px] font-bold text-[#14120f] ${className}`} style={{ background: color }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function EchoName({ name }: { name: string }) {
  return (
    <p className="truncate text-[14px] leading-tight">
      <b>{name}</b> <span className="font-normal text-[#f6f1ea]/45">{handleOf(name)} · 2ч</span>
    </p>
  );
}

function EchoBar({ text, likes }: { text: string; likes?: number }) {
  const replies = (hashString(text || "eho") % 17) + 1;
  const reposts = (hashString(`${text}:repost`) % 8) + 1;
  return (
    <div className="mt-3 flex max-w-[260px] justify-between text-[13px] text-[#f6f1ea]/45">
      <span className="inline-flex items-center gap-1"><ReplyIcon /> {replies}</span>
      <span className="inline-flex items-center gap-1"><RepostIcon /> {reposts}</span>
      <span className="inline-flex items-center gap-1" style={likes ? { color: "#9a4632" } : undefined}><HeartIcon /> {likes || ""}</span>
      <ShareIcon />
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M6 4.5 3 7.5l3 3" />
      <path d="M3.5 7.5h6.2a3.3 3.3 0 0 1 0 6.6H8" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4 6h8l-2.2-2.2" />
      <path d="M12 10H4l2.2 2.2" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M8 13.2 3.4 8.7a2.6 2.6 0 0 1 3.7-3.7L8 6.1l.9-1.1a2.6 2.6 0 0 1 3.7 3.7L8 13.2Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 11.5V3.5" />
      <path d="M5 6.2 8 3.2l3 3" />
      <path d="M3.5 9.5v3h9v-3" />
    </svg>
  );
}

function JobCard({ mode, write, twist, author }: StageProps) {
  return (
    <article className="bg-[#f7f4ef]">
      <div className="border-b border-[#e4d8c8] px-4 py-3">
        <div className="text-[22px] font-semibold text-[#1c1916]">Смена</div>
      </div>
      <div className="px-4 py-4">
        <h3 className="text-[22px] font-semibold leading-tight text-[#1c1916]">{mode === "show" ? twist || "Должность" : "Новая вакансия"}</h3>
        <p className="mt-1 text-[13px] text-[#5c564f]">{author || "Соискатель"} · Киев · полная занятость</p>
        <div className="mt-4 rounded-xl bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Сопроводительное</div>
          <p className="mt-1 text-[15px] leading-snug text-[#1c1916]">{mode === "show" ? write : <Dots />}</p>
        </div>
        <div className="mt-4 rounded-full bg-[#9a4632] px-4 py-2 text-center text-[14px] font-semibold text-[#f6f1ea]">
          Откликнуться
        </div>
      </div>
    </article>
  );
}

function MarketCard({ mode, write, twist }: StageProps) {
  const offer = splitOffer(twist || "");
  return (
    <article className="bg-[#f7f4ef]">
      <header className="flex items-center justify-between bg-[#2c3330] px-4 py-3 text-[#f6f1ea]">
        <b className="text-[22px] tracking-tight">Лавка</b>
        <span className="rounded-full bg-[#e7d7a8] px-3 py-1 text-[12px] font-semibold text-[#2c3330]">Забрать</span>
      </header>
      <div className="px-4 py-4">
        <div className="text-[13px] text-[#5c564f]">Киев · сегодня 18:40</div>
        <h3 className="mt-1 text-[22px] font-semibold leading-tight">{mode === "show" ? offer.title || "Товар" : "Объявление"}</h3>
        <div className="mt-2 text-[28px] font-bold">{mode === "show" ? offer.price : "—"}</div>
        <p className="mt-3 text-[15px] leading-snug text-[#1c1916]">{mode === "show" ? write : <Dots />}</p>
      </div>
    </article>
  );
}

function SearchCard({ mode, write, twist, compact }: StageProps) {
  return (
    <article className={`bg-[#f7f4ef] ${compact ? "p-3" : "px-5 py-6"}`}>
      <div className="text-center text-[32px] font-semibold tracking-tight text-[#1c1916]">Находка</div>
      <div className="mx-auto mt-4 flex items-center rounded-full border border-[#e4d8c8] bg-white px-4 py-2 text-[15px]">
        <span className="truncate">{mode === "show" ? twist || "запрос" : "поиск"}</span>
      </div>
      <div className="mt-5">
        <div className="text-[12px] text-[#3d6b58]">nahodka.example › совет</div>
        <h3 className="text-[18px] text-[#1c1916]">{mode === "show" ? "Результат, который лучше не открывать" : "Ищем…"}</h3>
        <p className="mt-1 text-[14px] leading-snug text-[#3f3a34]">{mode === "show" ? write : <Dots />}</p>
      </div>
    </article>
  );
}

function ReviewCard({ mode, write, twist, author }: StageProps) {
  return (
    <article className="bg-[#f7f4ef]">
      <div className="relative h-28 bg-[#d5dfd2]">
        <div className="absolute left-[18%] top-6 h-px w-[64%] bg-[#b7c3b2]" />
        <div className="absolute left-[42%] top-0 h-full w-px bg-[#b7c3b2]" />
        <div className="absolute left-1/2 top-8 grid size-8 -translate-x-1/2 place-items-center">
          <span className="size-4 rotate-45 bg-[#9a4632]" />
        </div>
      </div>
      <div className="px-4 pb-5 pt-4">
        <Brand kind="review" />
        <h3 className="text-[22px] font-semibold leading-tight">{mode === "show" ? twist || "Место" : "Новый отзыв"}</h3>
        <div className="mt-1 text-[14px] text-[#9a4632]">★ 1.6 · 3 отзыва</div>
        <div className="mt-4 border-t border-[#e4d8c8] pt-3">
          <div className="text-[13px] font-semibold">{author || "Гость"}</div>
          <p className="mt-1 text-[15px] leading-snug">{mode === "show" ? write : <Dots />}</p>
        </div>
      </div>
    </article>
  );
}

function VideoCard({ mode, write, twist, author, compact }: StageProps) {
  return (
    <article className="bg-[#f7f4ef]">
      <div className={`grid place-items-center bg-[#241c18] text-[#f6f1ea] ${compact ? "h-24" : "h-52"}`}>
        <span className="grid size-14 place-items-center rounded-full border border-[#f6f1ea]/40 text-2xl">▶</span>
      </div>
      <div className="px-4 py-3">
        <Brand kind="video" />
        <h3 className="text-[18px] font-semibold leading-snug">{mode === "show" ? twist || "Без названия" : "Ролик ещё грузится"}</h3>
        <p className="mt-1 text-[12px] text-[#5c564f]">Показ · 12 просмотров · только что</p>
        <div className="mt-3 flex gap-2 border-t border-[#e4d8c8] pt-3">
          <Avatar name={author || "?"} />
          <p className="text-[14px] leading-snug"><b>{author || "Зритель"}</b> {mode === "show" ? write : <Dots />}</p>
        </div>
      </div>
    </article>
  );
}

function AiCard({ mode, write, twist, compact }: StageProps) {
  return (
    <article className={`bg-[#f7f4ef] ${compact ? "p-3" : "px-4 py-5"}`}>
      <div className="mb-4 text-center text-[18px] font-semibold text-[#1c1916]">Подсказка</div>
      <div className="ml-auto max-w-[90%] rounded-3xl bg-[#efe6da] px-4 py-3 text-[15px] leading-snug">
        {mode === "show" ? twist || "…" : "Человек пишет"}
      </div>
      <div className="mt-4 flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#3f342c] text-[12px] text-[#f6f1ea]">П</span>
        <p className="pt-1 text-[15px] leading-relaxed text-[#1c1916]">{mode === "show" ? write : <Dots />}</p>
      </div>
      {!compact && mode === "show" ? <p className="mt-8 text-center text-[11px] text-[#8a8178]">Подсказка отвечает уверенно. Это ничего не гарантирует.</p> : null}
    </article>
  );
}

function FeedCard({ mode, write, twist, photo, author, topic, compact }: StageProps) {
  return (
    <article className="bg-[#f7f4ef]">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-[22px] font-semibold tracking-tight">Витрина</span>
        <span className="text-xl">♡</span>
      </header>
      <div className="flex items-center gap-2 px-3 pb-2">
        <Avatar name={author || "?"} />
        <div>
          <div className="text-[13px] font-semibold">{handleOf(author || "user").slice(1)}</div>
          <div className="text-[11px] text-black/50">{topic || "лента"}</div>
        </div>
      </div>
      <PhotoFrame photo={mode === "show" ? photo : null} tall={!compact} label={topic} />
      <div className="flex justify-between px-3 py-2 text-[20px]">
        <span className="flex gap-3">♡ 💬 ↗</span>
        <span>▢</span>
      </div>
      <div className="px-3 pb-4 text-[14px] leading-snug">
        <b>Нравится: 482</b>
        <p className="mt-1">
          <b>{handleOf(author || "user").slice(1)} </b>
          {mode === "show" ? twist || write : <Dots />}
        </p>
        {photo && mode === "show" && !compact ? (
          <p className="mt-2 text-[10px] text-black/40">{photo.author} · {photo.license}</p>
        ) : null}
      </div>
    </article>
  );
}

function PhotoFrame({ photo, tall, label }: { photo?: Photo | null; tall?: boolean; label?: string }) {
  const [failed, setFailed] = useState(false);
  const className = tall ? "aspect-[4/5] max-h-[52vh] w-full object-cover" : "h-36 w-full object-cover";
  if (!photo || failed) {
    return <div className={`grid place-items-center bg-[#ece7df] px-6 text-center text-[15px] text-[#666] ${tall ? "aspect-[4/5] max-h-[52vh]" : "h-36"}`}>{label || "Кадр не загрузился"}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={label || ""} className={className} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

function Avatar({ name, light }: { name: string; light?: boolean }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${light ? "bg-white/20 text-white" : "bg-[#e4d8c8] text-[#3f342c]"}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <i className="size-1.5 animate-pulse rounded-full bg-current" />
      <i className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:140ms]" />
      <i className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:280ms]" />
    </span>
  );
}

function splitOffer(twist: string): { title: string; price: string } {
  const match = /^(.*?)(?:,|\s[-–])\s*(\d[\d\s]*\s*(?:грн|₴|\$|€))$/i.exec(twist.trim());
  if (!match) return { title: twist || "Товар", price: "договорная" };
  return { title: match[1].trim(), price: match[2].trim() };
}
