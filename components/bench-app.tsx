"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { benchScores } from "@/lib/game/bench";

export function BenchApp() {
  const [votes, setVotes] = useState("3,1");
  const [finale, setFinale] = useState(false);
  const shares = useMemo(() => {
    const counts = votes.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item));
    if (counts.length < 2) return [];
    return benchScores(counts, finale);
  }, [finale, votes]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 py-10">
      <Link href="/" className="text-sm text-white/50 underline">Digital Footprint</Link>
      <h1 className="text-3xl font-semibold">Likes bench</h1>
      <p className="text-white/65">Comma-separated ballots. A duel pool is 1,000 likes. The finale switch is the optional last-round multiplier.</p>
      <input value={votes} onChange={(event) => setVotes(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-white/5 px-3" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={finale} onChange={(event) => setFinale(event.target.checked)} />
        Finale ×2
      </label>
      <ol className="space-y-2">
        {shares.map((share, index) => (
          <li key={index} className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
            <span>Entry {index + 1}</span>
            <span className="tabular-nums">{share}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
