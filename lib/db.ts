import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const globalForDb = globalThis as unknown as { pgPool?: pg.Pool; pglite?: Promise<PGlite> };
let pool = globalForDb.pgPool;
let local = globalForDb.pglite;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    globalForDb.pgPool = pool;
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    globalForDb.pglite = undefined;
    throw error;
  });
  globalForDb.pglite = local;
  return (await (await local).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
