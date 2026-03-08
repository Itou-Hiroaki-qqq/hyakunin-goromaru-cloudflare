/**
 * 復習リスト（テストで間違えた問題）の localStorage 管理
 */

export type ReviewItem =
  | { id: string; type: "range"; poemId: number; range: string }
  | { id: string; type: "all"; poemId: number }
  | { id: string; type: "kami_tricky"; poemId: number; choicePoemIds: number[] }
  | { id: string; type: "shimo_tricky"; poemId: number; choicePoemIds: number[] };

/**
 * Omit を discriminated union で正しく機能させるための分散版
 * 通常の Omit<Union, K> はユニオンに分配されないため各メンバーに適用する
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type ReviewItemInput = DistributiveOmit<ReviewItem, "id">;

const STORAGE_KEY = "hyakunin_review_list";

function getStored(): ReviewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReviewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(items: ReviewItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/** 同一問題のキー（重複追加防止用） */
function itemKey(item: ReviewItemInput): string {
  switch (item.type) {
    case "range":
      return `range:${item.poemId}:${item.range}`;
    case "all":
      return `all:${item.poemId}`;
    case "kami_tricky":
    case "shimo_tricky":
      return `${item.type}:${item.poemId}:${item.choicePoemIds.join(",")}`;
  }
}

export function getReviewList(): ReviewItem[] {
  return getStored();
}

export function addToReviewList(
  item: ReviewItemInput
): void {
  const list = getStored();
  const key = itemKey(item);
  if (list.some((x) => itemKey(x) === key)) return;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  list.push({ ...item, id } as ReviewItem);
  setStored(list);
}

export function removeFromReviewList(id: string): void {
  const list = getStored().filter((x) => x.id !== id);
  setStored(list);
}
