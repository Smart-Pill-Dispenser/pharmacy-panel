export function recordTimeMs(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? 0 : t;
}

export function compareNewestFirst(a: Record<string, unknown>, b: Record<string, unknown>, dateFields: string[]): number {
  for (const field of dateFields) {
    const da = recordTimeMs(a[field]);
    const db = recordTimeMs(b[field]);
    if (da !== db) return db - da;
  }
  const ida = String(a.id ?? "");
  const idb = String(b.id ?? "");
  return idb.localeCompare(ida, undefined, { numeric: true, sensitivity: "base" });
}

export function sortRecordsNewestFirst<T extends Record<string, unknown>>(items: T[], dateFields: string[]): T[] {
  return [...items].sort((a, b) => compareNewestFirst(a, b, dateFields));
}
