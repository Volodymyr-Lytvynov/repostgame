"use client";

import { useState, type ReactNode } from "react";
import { t } from "@/lib/game/i18n";
import type { ClientView } from "@/lib/game/types";

export function DebugBar({
  view,
  send,
}: {
  view: ClientView;
  send: (action: Record<string, unknown>) => Promise<unknown>;
}) {
  const [error, setError] = useState<string | null>(null);
  const language = view.config.language;
  const playing = view.phase !== "lobby" && view.phase !== "game_over";

  async function run(action: Record<string, unknown>) {
    setError(null);
    try {
      await send(action);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(language, "roomDown"));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Control on={!view.debug} onClick={() => void run({ type: "debug", on: !view.debug })}>
          {view.debug ? t(language, "checkOff") : t(language, "check")}
        </Control>
        {view.debug && view.phase === "lobby" ? <Control onClick={() => void run({ type: "bot" })}>{t(language, "addBot")}</Control> : null}
        {playing ? (
          <Control onClick={() => void run({ type: view.paused ? "resume" : "pause" })}>
            {view.paused ? t(language, "resume") : t(language, "pause")}
          </Control>
        ) : null}
        {playing ? <Control onClick={() => void run({ type: "skip" })}>{t(language, "skip")}</Control> : null}
      </div>
      {view.debug ? <p className="text-center text-sm text-white/55">{view.paused ? t(language, "pausedHint") : t(language, "checkHint")}</p> : null}
      {error ? <p className="text-center text-sm text-[#ff8d72]">{error}</p> : null}
    </div>
  );
}

function Control({ children, onClick, on = false }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-2 text-sm ${on ? "bg-[#ff5a36] text-[#1a100c]" : "bg-white/10 text-white"}`}>
      {children}
    </button>
  );
}
