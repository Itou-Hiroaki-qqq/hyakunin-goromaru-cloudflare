/** 半角・全角スペースなどで分割する正規表現 */
const SPACE_REGEX = /[\s\u3000]+/;

/**
 * スペースで区切り、指定行数に分割（上の句3行・下の句2行用）
 * 半角・全角スペースの両方に対応。スペースがない場合は文字数で折り返す（下の句2行用）
 */
export function splitToLines(text: string, maxLines: number): string[] {
  const parts = text.split(SPACE_REGEX).filter(Boolean);
  if (parts.length === 0 && text) return [text];
  if (parts.length >= maxLines) return parts.slice(0, maxLines);
  if (maxLines === 2 && parts.length === 1 && text.length > 7) {
    const half = Math.ceil(text.length / 2);
    return [text.slice(0, half), text.slice(half)];
  }
  return parts.slice(0, maxLines);
}
