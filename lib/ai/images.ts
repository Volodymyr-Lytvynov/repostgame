import { capQueries } from "../game/images";
import { shuffle } from "../game/random";
import type { ImageGroup, ResolvedImage } from "../game/types";

export { capQueries };

export async function searchOpenverse(query: string): Promise<ResolvedImage[]> {
  const key = query.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!key) return [];
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", key);
  url.searchParams.set("page_size", "12");
  url.searchParams.set("mature", "false");
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "DigitalFootprint/0.3 (party game; image search)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      results?: Array<{
        url?: string;
        thumbnail?: string;
        creator?: string;
        license?: string;
        foreign_landing_url?: string;
        mature?: boolean;
      }>;
    };
    return (body.results ?? []).flatMap((item) => {
      if (item.mature || !item.license?.trim()) return [];
      const photo = toImage(item.url, item.thumbnail, item.creator, item.license, item.foreign_landing_url);
      return photo ? [photo] : [];
    });
  } catch {
    return [];
  }
}

export async function fillImageGroups(groups: readonly ImageGroup[], budget: number, random: () => number): Promise<ImageGroup[]> {
  const found = await resolveImageGroups(
    groups.map((group) => group.query),
    budget,
  );
  return groups.map((group) => {
    const key = group.query.toLowerCase().replace(/\s+/g, " ").trim();
    return { ...group, images: shuffle(found.get(key) ?? [], random).slice(0, 8) };
  });
}

async function resolveImageGroups(queries: readonly string[], budget: number): Promise<Map<string, ResolvedImage[]>> {
  const capped = capQueries(queries, budget);
  const found = new Map<string, ResolvedImage[]>();
  await Promise.all(
    capped.map(async (query) => {
      found.set(query, await searchOpenverse(query));
    }),
  );
  return found;
}

function toImage(url: string | undefined, thumb: string | undefined, author: string | undefined, license: string | undefined, page: string | undefined): ResolvedImage | null {
  if (!publicHttps(url) || !license?.trim()) return null;
  const safeThumb = publicHttps(thumb) ? thumb : url;
  if (!safeThumb) return null;
  return {
    url: url ?? safeThumb,
    thumb: safeThumb,
    author: (author || "unknown").replace(/\s+/g, " ").trim().slice(0, 80),
    license: license.replace(/\s+/g, " ").trim().slice(0, 40),
    source: page && publicHttps(page) ? page : "",
  };
}

function publicHttps(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (/\.svg($|\?)/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}
