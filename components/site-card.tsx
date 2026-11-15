"use client";

import { useState } from "react";
import { handleOf, roundTitle } from "@/lib/game/content";
import type { Photo, RoundKind, Skins } from "@/lib/game/types";

export type StageProps = {
  kind: RoundKind;
  skins: Skins;
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
  return <InstagramCard {...props} />;
}

function Messenger({ skins, mode, write, twist, author, compact }: StageProps) {
  const skin = skins.messenger;
  const header = skin === "whatsapp" ? "bg-[#075e54]" : skin === "viber" ? "bg-[#7360f2]" : "bg-[#3390ec]";
  const wallpaper = skin === "whatsapp" ? "bg-[#efe7de]" : skin === "viber" ? "bg-[#f3f0fa]" : "bg-[#dbe7f2]";
  const bubble = skin === "viber" ? "bg-[#7360f2] text-white" : "bg-[#d9fdd3] text-[#111]";
  const title = mode === "show" ? twist || "Чат" : roundTitle("messenger", skins);
  return (
    <div className={`flex flex-col ${compact ? "" : "min-h-[520px]"}`}>
      <header className={`flex items-center gap-3 px-4 py-3 text-white ${header}`}>
        <span className="text-lg">‹</span>
        <Avatar name={author || "?"} light />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{title}</div>
          <div className="text-[11px] text-white/80">{mode === "show" ? "был(а) недавно" : "печатает…"}</div>
        </div>
      </header>
      <div className={`flex-1 px-3 py-4 ${wallpaper} ${compact ? "min-h-28" : ""}`} style={{ backgroundImage: "radial-gradient(rgba(0,0,0,.08) .7px, transparent .7px)", backgroundSize: "14px 14px" }}>
        <div className={`ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-[15px] leading-snug shadow-sm ${bubble}`}>
          {mode === "show" ? write : <Dots />}
          <div className={`mt-1 text-right text-[10px] ${skin === "viber" ? "text-white/70" : "text-black/45"}`}>21:41 ✓✓</div>
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ skins, mode, write, twist, author, compact }: StageProps) {
  const dark = skins.thread === "x";
  const tag = twist ? (twist.startsWith("#") ? twist : `#${twist.replace(/\s+/g, "")}`) : "#…";
  return (
    <article className={`${dark ? "bg-black text-white" : "bg-white text-[#111]"} ${compact ? "p-3" : "p-5"}`}>
      <div className="mb-3 flex items-center justify-between text-[13px] font-bold">
        <span>{dark ? "X" : "threads"}</span>
        <span className={dark ? "text-white/50" : "text-black/40"}>{dark ? "Для вас" : "Для вас"}</span>
      </div>
      <div className="flex gap-3">
        <Avatar name={author || "?"} />
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 text-[14px]">
            <b>{author || "Игрок"}</b>
            <span className={dark ? "text-white/50" : "text-black/45"}>{handleOf(author || "user")}</span>
          </div>
          <p className={`mt-1 text-[17px] leading-snug ${dark ? "text-white" : ""}`}>{mode === "show" ? write : <Dots />}</p>
          {mode === "show" ? <p className="mt-2 text-[16px] font-semibold text-[#1d9bf0]">{tag}</p> : null}
          <div className={`mt-4 flex justify-between text-[13px] ${dark ? "text-white/50" : "text-black/40"}`}>
            <span>↩ 12</span><span>↻ 48</span><span>♥ 320</span><span>↗</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function JobCard({ skins, mode, write, twist, author }: StageProps) {
  const skin = skins.job;
  return (
    <article className="bg-white">
      {skin === "linkedin" ? (
        <div className="h-16 bg-[#0a66c2]" />
      ) : skin === "indeed" ? (
        <div className="bg-[#2164f3] px-4 py-3 text-[22px] font-bold text-white">indeed</div>
      ) : (
        <div className="border-b px-4 py-3 text-[22px] font-black text-[#222]">
          work<span className="text-[#00a046]">.ua</span>
        </div>
      )}
      <div className={`px-4 py-4 ${skin === "linkedin" ? "-mt-6" : ""}`}>
        {skin === "linkedin" ? <Avatar name={author || "?"} /> : null}
        <h3 className="mt-2 text-[22px] font-semibold leading-tight text-[#111]">{mode === "show" ? twist || "Должность" : "Новая вакансия"}</h3>
        <p className="mt-1 text-[13px] text-[#555]">{author || "Соискатель"} · Киев · полная занятость</p>
        <div className="mt-4 rounded-xl bg-[#f4f6f8] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#667]">Сопроводительное</div>
          <p className="mt-1 text-[15px] leading-snug text-[#222]">{mode === "show" ? write : <Dots />}</p>
        </div>
        <div className={`mt-4 rounded-full px-4 py-2 text-center text-[14px] font-semibold text-white ${skin === "workua" ? "bg-[#00a046]" : "bg-[#0a66c2]"}`}>
          Откликнуться
        </div>
      </div>
    </article>
  );
}

function MarketCard({ skins, mode, write, twist }: StageProps) {
  const offer = splitOffer(twist || "");
  const olx = skins.market === "olx";
  return (
    <article className="bg-white">
      <header className={`flex items-center justify-between px-4 py-3 ${olx ? "bg-[#002f34] text-white" : "bg-[#131921] text-white"}`}>
        <b className="text-[22px] tracking-tight">{olx ? "OLX" : "amazon"}</b>
        <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${olx ? "bg-[#23e5db] text-[#002f34]" : "bg-[#ff9900] text-black"}`}>
          {olx ? "Написать" : "В корзину"}
        </span>
      </header>
      <div className="px-4 py-4">
        <div className="text-[13px] text-[#666]">{olx ? "Киев · сегодня 18:40" : "★★★★☆  214 оценок"}</div>
        <h3 className="mt-1 text-[22px] font-semibold leading-tight">{mode === "show" ? offer.title || "Товар" : "Объявление"}</h3>
        <div className="mt-2 text-[28px] font-bold">{mode === "show" ? offer.price : "—"}</div>
        <p className="mt-3 text-[15px] leading-snug text-[#333]">{mode === "show" ? write : <Dots />}</p>
      </div>
    </article>
  );
}

function SearchCard({ mode, write, twist, compact }: StageProps) {
  return (
    <article className={`bg-white ${compact ? "p-3" : "px-5 py-6"}`}>
      <div className="text-center text-[32px] font-medium tracking-tight">
        <span className="text-[#4285f4]">G</span>
        <span className="text-[#ea4335]">o</span>
        <span className="text-[#fbbc05]">o</span>
        <span className="text-[#4285f4]">g</span>
        <span className="text-[#34a853]">l</span>
        <span className="text-[#ea4335]">e</span>
      </div>
      <div className="mx-auto mt-4 flex items-center rounded-full border px-4 py-2 text-[15px] shadow-sm">
        <span className="truncate">{mode === "show" ? twist || "запрос" : "поиск"}</span>
      </div>
      <div className="mt-5">
        <div className="text-[12px] text-[#188038]">https://answer.example › совет</div>
        <h3 className="text-[18px] text-[#1a0dab]">{mode === "show" ? "Результат, который лучше не открывать" : "Ищем…"}</h3>
        <p className="mt-1 text-[14px] leading-snug text-[#444]">{mode === "show" ? write : <Dots />}</p>
      </div>
    </article>
  );
}

function ReviewCard({ mode, write, twist, author }: StageProps) {
  return (
    <article className="bg-white">
      <div className="relative h-28 bg-[linear-gradient(160deg,#b7e4c7,#74c0fc_40%,#d8f3dc)]">
        <div className="absolute left-1/2 top-8 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-[#ea4335] text-white shadow">●</div>
      </div>
      <div className="-mt-4 rounded-t-3xl bg-white px-4 pb-5 pt-4">
        <h3 className="text-[22px] font-semibold leading-tight">{mode === "show" ? twist || "Место" : "Новый отзыв"}</h3>
        <div className="mt-1 text-[14px] text-[#e37400]">★ 1.6 · 3 отзыва</div>
        <div className="mt-4 border-t pt-3">
          <div className="text-[13px] font-semibold">{author || "Гость"}</div>
          <p className="mt-1 text-[15px] leading-snug">{mode === "show" ? write : <Dots />}</p>
        </div>
      </div>
    </article>
  );
}

function VideoCard({ mode, write, twist, author, compact }: StageProps) {
  return (
    <article className="bg-white">
      <div className={`grid place-items-center bg-[#111] text-white ${compact ? "h-24" : "h-52"}`}>
        <span className="grid size-14 place-items-center rounded-2xl bg-[#ff0033] text-2xl">▶</span>
      </div>
      <div className="px-4 py-3">
        <h3 className="text-[18px] font-semibold leading-snug">{mode === "show" ? twist || "Без названия" : "Ролик ещё грузится"}</h3>
        <p className="mt-1 text-[12px] text-[#666]">Кривая лента · 12 просмотров · только что</p>
        <div className="mt-3 flex gap-2 border-t pt-3">
          <Avatar name={author || "?"} />
          <p className="text-[14px] leading-snug"><b>{author || "Зритель"}</b> {mode === "show" ? write : <Dots />}</p>
        </div>
      </div>
    </article>
  );
}

function AiCard({ mode, write, twist, compact }: StageProps) {
  return (
    <article className={`bg-[#f7f7f8] ${compact ? "p-3" : "px-4 py-5"}`}>
      <div className="mb-4 text-center text-[13px] font-medium text-[#666]">Новый чат</div>
      <div className="ml-auto max-w-[90%] rounded-3xl bg-[#ececf1] px-4 py-3 text-[15px] leading-snug">
        {mode === "show" ? twist || "…" : "Пользователь пишет"}
      </div>
      <div className="mt-4 flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#111] text-[12px] text-white">✦</span>
        <p className="pt-1 text-[15px] leading-relaxed text-[#222]">{mode === "show" ? write : <Dots />}</p>
      </div>
      {!compact && mode === "show" ? <p className="mt-8 text-center text-[11px] text-[#999]">Модель отвечает уверенно. Это ничего не гарантирует.</p> : null}
    </article>
  );
}

function InstagramCard({ mode, write, twist, photo, author, topic, compact }: StageProps) {
  return (
    <article className="bg-white">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-[family-name:var(--font-script)] text-[34px] leading-none">Instagram</span>
        <span className="text-xl">♡</span>
      </header>
      <div className="flex items-center gap-2 px-3 pb-2">
        <Avatar name={author || "?"} ring />
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

function Avatar({ name, light, ring }: { name: string; light?: boolean; ring?: boolean }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${ring ? "bg-[conic-gradient(from_180deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px]" : ""} ${light ? "bg-white/20 text-white" : "bg-[#dedad3] text-[#333]"}`}>
      <span className={`grid size-full place-items-center rounded-full ${ring ? "bg-white" : ""}`}>{name.slice(0, 1).toUpperCase()}</span>
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
