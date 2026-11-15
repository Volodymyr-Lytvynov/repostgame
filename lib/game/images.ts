export function capQueries(queries: readonly string[], budget: number): string[] {
  const unique: string[] = [];
  for (const query of queries) {
    const clean = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!clean || unique.includes(clean)) continue;
    unique.push(clean);
    if (unique.length >= budget) break;
  }
  return unique;
}
