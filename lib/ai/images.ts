import { sql } from "../db";
import type { Photo } from "../game/types";

type CacheRow = { photos: Photo[] | string };

export async function searchPhotos(query: string): Promise<Photo[]> {
  const key = query.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  if (!key) return [];
  const cached = await sql<CacheRow>("select photos from image_cache where query = $1", [key]);
  const hit = cached[0]?.photos;
  if (hit) return typeof hit === "string" ? (JSON.parse(hit) as Photo[]) : hit;

  const direct = await searchAnywhere(key);
  const photos =
    direct.length >= 2
      ? direct.slice(0, 2)
      : dedupe([...direct, ...(await searchAnywhere(key.split(" ").slice(0, 2).join(" ")))]).slice(0, 2);
  if (photos.length > 0) {
    await sql("insert into image_cache (query, photos) values ($1, $2::jsonb) on conflict (query) do nothing", [
      key,
      JSON.stringify(photos),
    ]);
  }
  return photos;
}

async function searchAnywhere(query: string): Promise<Photo[]> {
  if (!query.trim()) return [];
  const openverse = await searchOpenverse(query);
  if (openverse.length >= 2) return openverse;
  const commons = await searchCommons(query);
  return dedupe([...openverse, ...commons]);
}

async function searchOpenverse(query: string): Promise<Photo[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "10");
  url.searchParams.set("mature", "false");
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "KrivoyRepost/1.0 (party game)",
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
      if (item.mature || !item.url?.startsWith("https://")) return [];
      const photo = toPhoto(item.url, item.thumbnail, item.creator, item.license, item.foreign_landing_url);
      return photo ? [photo] : [];
    });
  } catch {
    return [];
  }
}

async function searchCommons(query: string): Promise<Photo[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", "960");
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "KrivoyRepost/1.0 (party game; image search)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            imageinfo?: Array<{
              thumburl?: string;
              descriptionshorturl?: string;
              extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
            }>;
          }
        >;
      };
    };
    return Object.values(body.query?.pages ?? {}).flatMap((page) => {
      const info = page.imageinfo?.[0];
      const photo = toPhoto(
        info?.thumburl,
        info?.thumburl,
        stripTags(info?.extmetadata?.Artist?.value),
        info?.extmetadata?.LicenseShortName?.value,
        info?.descriptionshorturl,
      );
      return photo ? [photo] : [];
    });
  } catch {
    return [];
  }
}

function toPhoto(
  url: string | undefined,
  thumb: string | undefined,
  author: string | undefined,
  license: string | undefined,
  page: string | undefined,
): Photo | null {
  if (!url?.startsWith("https://")) return null;
  if (/\.(svg|gif)(\?|$)/i.test(url)) return null;
  const safeThumb = thumb?.startsWith("https://") ? thumb : url;
  return {
    url,
    thumb: safeThumb,
    author: (author || "неизвестен").replace(/\s+/g, " ").trim().slice(0, 80),
    license: (license || "CC").replace(/\s+/g, " ").trim().slice(0, 40),
    page: page?.startsWith("https://") ? page : "",
  };
}

function dedupe(photos: Photo[]): Photo[] {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    if (seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });
}

function stripTags(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]+>/g, " ");
}
