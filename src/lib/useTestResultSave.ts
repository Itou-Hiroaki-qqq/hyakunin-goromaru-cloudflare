import { useEffect } from "react";
import type { Poem } from "@/types/poem";
import { stopAll } from "@/lib/audio";
import { addToReviewList } from "@/lib/reviewStorage";

interface UseTestResultSaveOptions {
  finished: boolean;
  poems: Poem[];
  range: { from: number; to: number } | null;
  current: Poem | null;
  clickedWrong: string[];
  perfectScore: number;
  rangeLabel: string;
  saveBestScore: (key: string, score: number) => void;
}

/** テスト終了時にクリア状態・復習リスト・最高スコアを保存するフック */
export function useTestResultSave({
  finished,
  poems,
  range,
  current,
  clickedWrong,
  perfectScore,
  rangeLabel,
  saveBestScore,
}: UseTestResultSaveOptions): void {
  // 最後の1問で間違えていたら復習に追加 & 全問一発正解ならクリア状態を保存
  useEffect(() => {
    if (!finished || poems.length === 0 || !range || !current) return;
    stopAll();
    if (clickedWrong.length > 0) {
      addToReviewList({
        type: "range",
        poemId: current.id,
        range: `${range.from}-${range.to}`,
      });
    }
    if (perfectScore === poems.length) {
      const { from, to } = range;
      const testSize = to - from + 1;
      const testType =
        testSize === 20 ? "20首" : testSize === 8 ? "8首" : testSize === 4 ? "4首" : "";
      if (testType) {
        fetch("/api/test-clears", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testType, range: `${from}-${to}` }),
        }).catch((err) => console.error("クリア状態の保存に失敗:", err));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, poems.length, perfectScore, range, current?.id, clickedWrong.length, current]);

  // 最高スコアを保存
  useEffect(() => {
    if (!finished || !rangeLabel || poems.length === 0) return;
    saveBestScore(`range:${rangeLabel}`, perfectScore);
  }, [finished, rangeLabel, poems.length, perfectScore, saveBestScore]);
}
