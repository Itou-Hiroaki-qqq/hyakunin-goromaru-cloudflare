import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { Poem } from "@/types/poem";
import { playOnce, playSequence, stopAll } from "@/lib/audio";

type GoroHighlightPhase = "none" | "kami" | "shimo";

interface UseGoroPlaybackOptions {
  current: Poem | null;
  showGoro: boolean;
  goroPlayKey: number;
  selectedCorrect: boolean;
  /** 複数問を同一コンポーネントで扱う場合に渡す（省略時はロック不要） */
  goroRunInProgressRef?: MutableRefObject<boolean>;
  currentGoroPoemIdRef?: MutableRefObject<number | null>;
  lastGoroPlayKeyRef?: MutableRefObject<number>;
}

export function useGoroPlayback({
  current,
  showGoro,
  goroPlayKey,
  selectedCorrect,
  goroRunInProgressRef,
  currentGoroPoemIdRef,
  lastGoroPlayKeyRef,
}: UseGoroPlaybackOptions): {
  goroHighlightPhase: GoroHighlightPhase;
  resetGoroHighlight: () => void;
} {
  const [goroHighlightPhase, setGoroHighlightPhase] = useState<GoroHighlightPhase>("none");

  // 正解後の語呂シーケンス再生（上の句→下の句）
  useEffect(() => {
    if (!showGoro || !current || goroPlayKey <= 0) return;
    if (!selectedCorrect) return;
    if (goroRunInProgressRef?.current) return;
    if (lastGoroPlayKeyRef && lastGoroPlayKeyRef.current === goroPlayKey) return;
    if (lastGoroPlayKeyRef) lastGoroPlayKeyRef.current = goroPlayKey;
    if (goroRunInProgressRef) goroRunInProgressRef.current = true;
    const poemId = current.id;
    setGoroHighlightPhase("kami");
    const run = async () => {
      try {
        // 上の句音声が再生中・ロード中の場合にここで止める
        // （handleAnswer では止めないことで、音声ロード中クリックによる無音を防ぐ）
        stopAll();
        if (currentGoroPoemIdRef && currentGoroPoemIdRef.current !== poemId) return;
        if (current.kami_goro_audio_url) await playOnce(current.kami_goro_audio_url);
        if (currentGoroPoemIdRef && currentGoroPoemIdRef.current !== poemId) return;
        setGoroHighlightPhase("shimo");
        if (current.shimo_goro_audio_url) await playOnce(current.shimo_goro_audio_url);
      } finally {
        if (goroRunInProgressRef) goroRunInProgressRef.current = false;
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goroPlayKey, showGoro, current?.id, selectedCorrect]);

  // 不正解時の語呂一括再生
  useEffect(() => {
    if (!showGoro || !current || goroPlayKey <= 0) return;
    if (selectedCorrect) return;
    const urls: string[] = [];
    if (current.kami_goro_audio_url) urls.push(current.kami_goro_audio_url);
    if (current.shimo_goro_audio_url) urls.push(current.shimo_goro_audio_url);
    if (urls.length > 0) {
      stopAll(); // 上の句音声が再生中・ロード中の場合にここで止める
      playSequence(urls);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goroPlayKey, showGoro, current, selectedCorrect]);

  const resetGoroHighlight = () => setGoroHighlightPhase("none");

  return { goroHighlightPhase, resetGoroHighlight };
}
