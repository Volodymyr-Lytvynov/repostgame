"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientView } from "@/lib/game/types";

export type Session = { hostToken?: string; playerToken?: string };

export function sessionKey(code: string) {
  return `footprint:${code}`;
}

export function readSession(code: string): Session {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(sessionKey(code)) ?? "{}") as Session;
  } catch {
    return {};
  }
}

export function writeSession(code: string, session: Session) {
  localStorage.setItem(sessionKey(code), JSON.stringify(session));
}

export function useRoom(code: string, token: string | null) {
  const [view, setView] = useState<ClientView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        cache: "no-store",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const body = (await response.json()) as ClientView & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Couldn't open the room");
        return;
      }
      setError(null);
      setOffline(false);
      setView((current) => (current && current.version === body.version ? { ...current, serverNow: body.serverNow } : body));
    } catch {
      setOffline(true);
    }
  }, [code, token]);

  useEffect(() => {
    let stop = false;
    async function loop() {
      while (!stop) {
        await refresh();
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
    }
    void loop();
    return () => {
      stop = true;
    };
  }, [refresh]);

  const send = useCallback(
    async (action: Record<string, unknown>, auth = token) => {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(auth ? { authorization: `Bearer ${auth}` } : {}),
        },
        body: JSON.stringify(action),
      });
      const body = (await response.json()) as ClientView & { error?: string; playerToken?: string };
      if (!response.ok) throw new Error(body.error ?? "That didn't work");
      setView(body);
      return body;
    },
    [code, token],
  );

  return { view, error, offline, send, refresh };
}

export function useClock(serverNow: number | undefined) {
  const [now, setNow] = useState(() => serverNow ?? Date.now());
  useEffect(() => {
    if (!serverNow) return;
    const offset = serverNow - Date.now();
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), 250);
    return () => window.clearInterval(id);
  }, [serverNow]);
  return now;
}

export function secondsLeft(deadline: number | null, now: number): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
