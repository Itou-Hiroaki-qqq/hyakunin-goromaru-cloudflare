"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Poem } from "@/types/poem";
import { playOnce, playSequence, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { addToReviewList } from "@/lib/reviewStorage";
import { useTestBestScores } from "@/lib/useTestBestScores";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 語呂再生の二重実行防止（setGoroHighlightPhase による再レンダーで effect が再実行されるため）
let goroRunInProgress = false;

export default function AllTestPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [choices, setChoices] = useState<{ text: string; poemId: number }[]>([]);
  const [clickedWrong, setClickedWrong] = useState<string[]>([]);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [perfectScore, setPerfectScore] = useState(0); // 一発正解数
  const lastPlayedQRef = useRef<number | null>(null);
  const [showGoro, setShowGoro] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0);
  const [goroHighlightPhase, setGoroHighlightPhase] = useState<"none" | "kami" | "shimo">("none");
  const currentGoroPoemIdRef = useRef<number | null>(null);
  const lastGoroPlayKeyRef = useRef<number>(-1);
  const [showResult, setShowResult] = useState(false);
  const { getStoredBest, saveBestScore } = useTestBestScores();

  useEffect(() => {
    return () => {
      stopAll();
      goroRunInProgress = false;
    };
  }, []);

  useEffect(() => {
    fetch("/api/poems?from=1&to=100")
      .then((res) => {
        if (!res.ok) throw new Error("取得に失敗しました");
        return res.json() as Promise<Poem[]>;
      })
      .then((data) => {
        setPoems(data);
        setError("");
      })
      .catch((err) => setError(err.message || "エラー"))
      .finally(() => setLoading(false));
  }, []);

  const current = poems[currentQ] || null;
  const finished = showResult;

  useEffect(() => {
    if (finished && poems.length > 0) {
      stopAll();
      // 全問一発正解ならクリア状態を保存
      if (perfectScore === poems.length) {
        fetch("/api/test-clears", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testType: "100首",
            range: "all",
          }),
        }).catch((err) => console.error("クリア状態の保存に失敗:", err));
      }
    }
  }, [finished, poems.length, perfectScore]);

  useEffect(() => {
    if (finished && poems.length > 0) {
      saveBestScore("100首:all", perfectScore);
    }
  }, [finished, poems.length, perfectScore, saveBestScore]);

  useEffect(() => {
    if (!current || poems.length === 0) return;
    currentGoroPoemIdRef.current = current.id;
    goroRunInProgress = false;
    lastGoroPlayKeyRef.current = -1;
    // 残り99首からランダム3つを選ぶ
    const others = poems.filter((p) => p.id !== current.id);
    const wrong = shuffle(others).slice(0, 3).map((p) => ({ text: p.shimo_hiragana, poemId: p.id }));
    const four = shuffle([
      { text: current.shimo_hiragana, poemId: current.id },
      ...wrong,
    ]);
    setChoices(four);
    setClickedWrong([]);
    setSelectedCorrect(false);
    setShowGoro(false);
    setGoroPlayKey(0);
    setGoroHighlightPhase("none");
  }, [currentQ, poems.length, current?.id]);

  // 正解時のみ：上の句語呂の赤→下の句語呂の赤の順で表示し、音声も上の句→下の句の順で再生
  useEffect(() => {
    if (!showGoro || !current || goroPlayKey <= 0) return;
    if (!selectedCorrect) return;
    if (goroRunInProgress) return;
    if (lastGoroPlayKeyRef.current === goroPlayKey) return;
    lastGoroPlayKeyRef.current = goroPlayKey;
    goroRunInProgress = true;
    const poemId = current.id;
    setGoroHighlightPhase("kami");
    const run = async () => {
      try {
        if (currentGoroPoemIdRef.current !== poemId) return;
        if (current.kami_goro_audio_url) await playOnce(current.kami_goro_audio_url);
        if (currentGoroPoemIdRef.current !== poemId) return;
        setGoroHighlightPhase("shimo");
        if (current.shimo_goro_audio_url) await playOnce(current.shimo_goro_audio_url);
      } finally {
        goroRunInProgress = false;
      }
    };
    run();
  }, [goroPlayKey, showGoro, current?.id, selectedCorrect]);

  // 不正解時は語呂音声のみ再生（赤表示は出さない）
  useEffect(() => {
    if (!showGoro || !current || goroPlayKey <= 0) return;
    if (selectedCorrect) return;
    const urls: string[] = [];
    if (current.kami_goro_audio_url) urls.push(current.kami_goro_audio_url);
    if (current.shimo_goro_audio_url) urls.push(current.shimo_goro_audio_url);
    if (urls.length > 0) playSequence(urls);
  }, [goroPlayKey, showGoro, current, selectedCorrect]);

  useEffect(() => {
    if (!current?.kami_audio_url || poems.length === 0) return;
    if (lastPlayedQRef.current === currentQ) return;
    if (lastPlayedQRef.current != null) stopAll();
    lastPlayedQRef.current = currentQ;
    playOnce(current.kami_audio_url);
  }, [currentQ, poems.length, current?.id, current?.kami_audio_url]);

  const handleAnswer = (answer: string) => {
    if (selectedCorrect) return;
    // stopAll() はここでは呼ばない。音声ロード中にクリックすると無音になるため。
    // 語呂音声の再生直前（useGoroPlayback 内）で stopAll() を呼ぶ。
    if (answer === current?.shimo_hiragana) {
      setSelectedCorrect(true);
      setScore((s) => s + 1);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
      // 一発正解（×がついていない）ならカウント
      if (clickedWrong.length === 0) {
        setPerfectScore((s) => s + 1);
      }
    } else if (!clickedWrong.includes(answer)) {
      setClickedWrong((prev) => [...prev, answer]);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
    }
  };

  const handleNext = () => {
    stopAll();
    goroRunInProgress = false;
    if (current && clickedWrong.length > 0) {
      addToReviewList({ type: "all", poemId: current.id });
    }
    if (currentQ >= poems.length - 1) {
      setShowResult(true);
      return;
    }
    const nextQ = currentQ + 1;
    const nextPoem = poems[nextQ];
    if (nextPoem) currentGoroPoemIdRef.current = nextPoem.id;
    setSelectedCorrect(false);
    setClickedWrong([]);
    setShowGoro(false);
    setGoroPlayKey(0);
    setGoroHighlightPhase("none");
    setCurrentQ((q) => q + 1);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-6 flex justify-center items-center min-h-[40vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || poems.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">{error || "データがありません"}</p>
        <Link href="/learn" className="btn btn-outline">
          学習リストへ戻る
        </Link>
      </div>
    );
  }

  if (finished) {
    const bestKey = "100首:all";
    const best = getStoredBest(bestKey);
    const highest = Math.max(best, perfectScore);
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">100首ぜんぶテスト 結果</h2>
        <p className="text-lg mb-2">
          最高一発正解数：{highest} / {poems.length} 首
        </p>
        <p className="text-lg mb-6">
          今回の一発正解数：{perfectScore} / {poems.length} 首
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/learn" className="btn btn-primary">
            学習リストへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const kamiGoroRange = findGoroRange(current.kami_hiragana, current.kami_goro);
  const shimoGoroRange = findGoroRange(current.shimo_hiragana, current.shimo_goro);
  const showKamiHighlight =
    selectedCorrect && (goroHighlightPhase === "kami" || goroHighlightPhase === "shimo");
  const showShimoHighlight = selectedCorrect && goroHighlightPhase === "shimo";

  return (
    <div className="min-h-[60vh] p-6 bg-tatami">
      <p className="text-sm text-base-content/60 mb-2">
        問題 {currentQ + 1} / {poems.length}
      </p>
      <div className="max-w-2xl mx-auto">
        <p className="text-center text-lg mb-4">上の句（ひらがな）の続きはどれ？</p>
        <div className="mb-6 flex justify-center">
          <PoemCard
            text={current.kami_hiragana}
            variant="kami"
            highlightRange={
              showKamiHighlight && kamiGoroRange.length > 0 ? kamiGoroRange : undefined
            }
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {choices.map((item) => {
            const isCorrectChoice = item.text === current.shimo_hiragana;
            const showShimoGoro = showShimoHighlight && isCorrectChoice;
            const choiceShimoRange = showShimoGoro ? shimoGoroRange : undefined;
            return (
              <ChoiceCard
                key={`${item.poemId}-${item.text.slice(0, 8)}`}
                text={item.text}
                onClick={() => handleAnswer(item.text)}
                disabled={selectedCorrect}
                result={
                  selectedCorrect && isCorrectChoice
                    ? "correct"
                    : clickedWrong.includes(item.text)
                      ? "wrong"
                      : null
                }
                highlightRange={choiceShimoRange}
              />
            );
          })}
        </div>
        {showGoro && current.goro_kaisetsu && (
          <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
            <p className="text-xs font-medium text-base-content/60 mb-1">語呂の意味</p>
            <p className="text-xl font-bold text-base-content">
              {current.goro_kaisetsu}
            </p>
          </div>
        )}
        {showGoro && (
          <div className="flex justify-center gap-4">
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {currentQ >= poems.length - 1 ? "結果を見る" : "次の問題"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
