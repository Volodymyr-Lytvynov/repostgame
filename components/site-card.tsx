"use client";

import { useState } from "react";
import { handleOf, roundTitle } from "@/lib/game/content";
import type { Photo, RoundKind } from "@/lib/game/types";

export type StageProps = {
  kind: RoundKind;
  mode: "wait" | "show";
  write?: string;
  twist?: string;
  photo?: Photo | null;
  author?: string;
  topic?: string;
  compact?: boolean;
};

export function SiteCard(props: StageProps) {
  const body = renderKind(props);
  if (props.compact) return <div className="overflow-hidden rounded-2xl bg-white text-black">{body}</div>;
  return (
    <div className="mx-auto w-[min(440px,94vw)] rounded-[2.2rem] border-8 border-[#1c1c1e] bg-black shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
      <div className="overflow-hidden rounded-[1.55rem] bg-white text-black">{body}</div>
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

function ThreadCard({ mode, write, twist, author, compact }: StageProps) {
  const tag = twist ? (twist.startsWith("#") ? twist : `#${twist.replace(/\s+/g, "")}`) : "#…";
  return (
    <article className={`bg-[#f7f4ef] text-[#1c1916] ${compact ? "p-3" : "p-5"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[18px] font-semibold">Эхо</span>
        <span className="text-[13px] text-[#1c1916]/45">Рядом</span>
      </div>
      <div className="flex gap-3">
        <Avatar name={author || "?"} />
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 text-[14px]">
            <b>{author || "Игрок"}</b>
            <span className="text-[#1c1916]/45">{handleOf(author || "user")}</span>
          </div>
          <p className="mt-1 text-[17px] leading-snug">{mode === "show" ? write : <Dots />}</p>
          {mode === "show" ? <p className="mt-2 text-[16px] font-semibold text-[#9a4632]">{tag}</p> : null}
          <div className="mt-4 flex justify-between text-[13px] text-[#1c1916]/45">
            <span>↩ 12</span><span>↻ 48</span><span>♥ 320</span><span>↗</span>
          </div>
        </div>
      </div>
    </article>
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
