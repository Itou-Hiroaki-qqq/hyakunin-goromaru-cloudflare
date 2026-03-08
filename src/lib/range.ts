/**
 * URL の range 文字列（例: "1-4", "9-16"）をパースして from, to を返す。
 * 不正な場合は null。
 */
export function parseRange(range: string | undefined): { from: number; to: number } | null {
  if (!range || typeof range !== "string") return null;
  const m = range.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const from = parseInt(m[1], 10);
  const to = parseInt(m[2], 10);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 100 || from > to)
    return null;
  return { from, to };
}
