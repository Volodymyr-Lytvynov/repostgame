"use client";

import { useState, type ReactNode } from "react";
import type { ClientView } from "@/lib/game/types";

export function DebugBar({
  view,
  send,
}: {
  view: ClientView;
  send: (action: Record<string, unknown>) => Promise<unknown>;
}) {
  const [error, setError] = useState<string | null>(null);
  const playing = view.phase !== "lobby" && view.phase !== "done";

  async function run(action: Record<string, unknown>) {
    setError(null);
    try {
      await send(action);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вышло");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Control on={!view.debug} onClick={() => void run({ type: "debug", on: !view.debug })}>
          {view.debug ? "Выключить проверку" : "Режим проверки"}
        </Control>
        {view.debug && view.phase === "lobby" ? <Control onClick={() => void run({ type: "bot" })}>Добавить бота</Control> : null}
        {playing ? (
          <Control onClick={() => void run({ type: view.paused ? "resume" : "pause" })}>
            {view.paused ? "Продолжить" : "Пауза"}
          </Control>
        ) : null}
        {playing ? <Control onClick={() => void run({ type: "skip" })}>Дальше</Control> : null}
      </div>
      {view.debug ? (
        <p className="text-center text-sm text-white/55">
          {view.paused
            ? "Пауза: таймер и боты стоят. «Дальше» откроет следующий шаг и тоже оставит паузу."
            : "Проверка: фаза сама не сменится. «Дальше» — следующий шаг, «Пауза» останавливает ботов."}
        </p>
      ) : null}
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
