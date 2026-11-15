import type { ReactNode } from "react";
import { t } from "@/lib/game/i18n";
import type { BadgeKind, FeedCard, Language } from "@/lib/game/types";

export function FeedCardView({ card, language, footer }: { card: FeedCard; language: Language; footer?: ReactNode }) {
  return (
    <article className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#171a21] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,.28)]">
      {card.mode === "dms" ? <Dm card={card} language={language} /> : null}
      {card.mode === "explain" ? <Statement card={card} language={language} /> : null}
      {card.mode === "sabotage" ? <Poster card={card} language={language} /> : null}
      {card.mode === "ratio" ? <Post card={card} language={language} /> : null}
      {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
    </article>
  );
}

export function BadgeList({ kinds, language }: { kinds: BadgeKind[]; language: Language }) {
  const unique = [...new Set(kinds)];
  if (unique.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((kind) => (
        <span key={kind} className="rounded-full bg-white/10 px-2 py-1 text-[11px] tracking-wide text-white/80">
          {t(language, `badge_${kind}`)}
        </span>
      ))}
    </div>
  );
}

function Post({ card, language }: { card: FeedCard; language: Language }) {
  return (
    <div>
      <Account card={card} language={language} />
      <p className="mt-4 whitespace-pre-wrap text-xl leading-snug">{card.promptText}</p>
      <Fiction card={card} language={language} />
      <div className="mt-4 space-y-3">
        <Reply card={card} slot="A" language={language} />
        <Reply card={card} slot="B" language={language} />
      </div>
      {card.skipped ? <p className="mt-3 text-sm text-[#ffb020]">{t(language, "skipped")}</p> : null}
    </div>
  );
}

function Statement({ card, language }: { card: FeedCard; language: Language }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{t(language, "mode_explain")}</p>
      <p className="mt-3 whitespace-pre-wrap text-xl leading-snug">{card.promptText}</p>
      <div className="mt-4 space-y-3">
        <Reply card={card} slot="A" language={language} />
        <Reply card={card} slot="B" language={language} />
      </div>
      {card.skipped ? <p className="mt-3 text-sm text-[#ffb020]">{t(language, "skipped")}</p> : null}
    </div>
  );
}

function Dm({ card, language }: { card: FeedCard; language: Language }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{t(language, "mode_dms")}</p>
      {card.questionRevealed ? (
        <p className="mt-3 text-sm text-white/60">
          {t(language, "questionWas")}: {card.promptText}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <Bubble who={card.sender} text={card.textB} side="them" author={card.showAuthors ? card.authorB : ""} likes={card.showAuthors ? card.likesB : 0} language={language} />
        <Bubble who={t(language, "you")} text={card.textA} side="you" author={card.showAuthors ? card.authorA : ""} likes={card.showAuthors ? card.likesA : 0} language={language} />
      </div>
    </div>
  );
}

function Poster({ card, language }: { card: FeedCard; language: Language }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#243044] to-[#12151c] px-4 py-8 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t(language, "mode_sabotage")}</p>
      <p className="mt-4 text-2xl font-semibold leading-snug">{card.combined}</p>
      {card.showAuthors ? (
        <p className="mt-4 text-sm text-white/70">
          {card.authorA} · {card.likesA} / {card.authorB} · {card.likesB}
        </p>
      ) : null}
    </div>
  );
}

function Account({ card, language }: { card: FeedCard; language: Language }) {
  const account = card.account;
  if (!account) return null;
  return (
    <div className="flex items-center gap-3">
      <Avatar account={account} />
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {account.name} {account.verified ? <span title={t(language, "verified")}>✓</span> : null}
        </p>
        <p className="truncate text-sm text-white/50">
          @{account.handle} · {card.ago}
        </p>
      </div>
    </div>
  );
}

function Avatar({ account }: { account: NonNullable<FeedCard["account"]> }) {
  if (account.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.image} alt="" className="size-12 rounded-full object-cover" />
    );
  }
  return (
    <div className="grid size-12 place-items-center rounded-full text-sm font-semibold text-[#14110e]" style={{ background: account.color }}>
      {account.initials}
    </div>
  );
}

function Reply({ card, slot, language }: { card: FeedCard; slot: "A" | "B"; language: Language }) {
  const text = slot === "A" ? card.textA : card.textB;
  const author = slot === "A" ? card.authorA : card.authorB;
  const likes = slot === "A" ? card.likesA : card.likesB;
  return (
    <div className="rounded-2xl bg-black/25 px-3 py-3">
      <p className="whitespace-pre-wrap text-lg leading-snug">{text || "—"}</p>
      {card.showAuthors ? (
        <p className="mt-2 text-sm text-[#ffb020]">
          {author} · {t(language, "earned")} {likes}
        </p>
      ) : null}
    </div>
  );
}

function Bubble({ who, text, side, author, likes, language }: { who: string; text: string; side: "you" | "them"; author: string; likes: number; language: Language }) {
  const mine = side === "you";
  return (
    <div className={mine ? "ml-8" : "mr-8"}>
      <p className="mb-1 text-xs text-white/45">{who}</p>
      <div className={`rounded-2xl px-3 py-2 ${mine ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10"}`}>
        <p className="whitespace-pre-wrap">{text || "—"}</p>
      </div>
      {author ? (
        <p className="mt-1 text-xs text-[#ffb020]">
          {author} · {t(language, "earned")} {likes}
        </p>
      ) : null}
    </div>
  );
}

function Fiction({ card, language }: { card: FeedCard; language: Language }) {
  if (!card.fictionLikes) return null;
  return (
    <p className="mt-3 text-sm text-white/35">
      {t(language, "decorative")} · {compact(card.fictionLikes, language)} · {compact(card.fictionViews, language)}
    </p>
  );
}

function compact(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "ru" ? "ru" : "en", { notation: "compact" }).format(value);
}

export function ModeIntro({ mode, language }: { mode: FeedCard["mode"]; language: Language }) {
  return (
    <div className="max-w-xl text-center">
      <p className="text-sm uppercase tracking-[0.18em] text-white/45">{t(language, "fiction")}</p>
      <h2 className="mt-2 text-4xl font-semibold">{t(language, `mode_${mode}`)}</h2>
      <p className="mt-3 text-lg text-white/70">{t(language, `tag_${mode}`)}</p>
    </div>
  );
}
