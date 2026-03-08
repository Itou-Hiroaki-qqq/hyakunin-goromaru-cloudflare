const STORAGE_KEY_PREFIX = "test-best:";

export function getTestBestScore(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

/** 今回のスコアがこれまでの最高を上回る場合のみ保存する */
export function setTestBestScore(key: string, score: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getTestBestScore(key);
    if (current != null && score <= current) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + key, String(score));
  } catch {
    // ignore
  }
}
