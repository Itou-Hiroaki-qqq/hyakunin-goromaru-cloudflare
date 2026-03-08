"use client";

import { useCallback, useEffect, useState } from "react";
import { getTestBestScore, setTestBestScore } from "./testBestScore";

type BestScoresState = {
  scores: Record<string, number>;
  loggedIn: boolean;
  loaded: boolean;
};

export function useTestBestScores() {
  const [state, setState] = useState<BestScoresState>({
    scores: {},
    loggedIn: false,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/test-best-scores")
      .then((res) => res.json() as Promise<{ scores?: Record<string, number>; loggedIn?: boolean }>)
      .then((data) => {
        if (cancelled) return;
        setState({
          scores: data.scores ?? {},
          loggedIn: data.loggedIn === true,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({ ...s, loaded: true }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 表示用：キーに対応する保存済み最高スコア（ログイン時はAPI、未ログイン時はlocalStorage） */
  const getStoredBest = useCallback(
    (key: string): number => {
      if (!state.loaded) return getTestBestScore(key) ?? 0;
      if (state.loggedIn) return state.scores[key] ?? 0;
      return getTestBestScore(key) ?? 0;
    },
    [state.loaded, state.loggedIn, state.scores]
  );

  /** 今回のスコアを保存（ログイン時はNeon、未ログイン時はlocalStorage） */
  const saveBestScore = useCallback(
    async (key: string, score: number) => {
      if (state.loggedIn) {
        const res = await fetch("/api/test-best-scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testKey: key, score }),
        });
        const data = (await res.json()) as { saved?: boolean };
        if (data.saved === true) {
          setState((prev) => ({
            ...prev,
            scores: {
              ...prev.scores,
              [key]: Math.max(prev.scores[key] ?? 0, score),
            },
          }));
        }
      } else {
        setTestBestScore(key, score);
      }
    },
    [state.loggedIn]
  );

  return { getStoredBest, saveBestScore, loggedIn: state.loggedIn, loaded: state.loaded };
}
