"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Poem } from "@/types/poem";
import { playOnce, playSequence, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { KAMI_TRICKY_SETS } from "@/data/tricky-questions";
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

type BatchQuestion = { correctPoemId: number; choicePoemIds: number[] };

export default function KamiTrickyTestPage() {
  const [batchQuestions, setBatchQuestions] = useState<BatchQuestion[]>([]);
  const [poemMap, setPoemMap] = useState<Map<number, Poem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedKamiId, setSelectedKamiId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showGoro, setShowGoro] = useState(false);
  const [hasShownCorrect, setHasShownCorrect] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [fixedChoices, setFixedChoices] = useState<{ id: number; text: string }[]>([]);
  const [clickedWrongIds, setClickedWrongIds] = useState<number[]>([]);
  const [goroHighlightPhase, setGoroHighlightPhase] = useState<"none" | "kami" | "shimo">("none");
  const [firstTryResults, setFirstTryResults] = useState<boolean[]>([]);
  const currentGoroPoemIdRef = useRef<number | null>(null);
  const { getStoredBest, saveBestScore } = useTestBestScores();

  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  // 全セットから問題を集めてシャッフルし、歌データを取得
  useEffect(() => {
    const questions: BatchQuestion[] = KAMI_TRICKY_SETS.flatMap((set) =>
      set.poemIds.map((correctPoemId) => ({
        correctPoemId,
        choicePoemIds: set.poemIds,
      }))
    );
    setBatchQuestions(shuffle(questions));

    const allIds = [...new Set(questions.flatMap((q) => [q.correctPoemId, ...q.choicePoemIds]))];
    Promise.all(
      allIds.map((id) =>
        fetch(`/api/poems?from=${id}&to=${id}`)
          .then((res) => res.json() as Promise<Poem[]>)
          .then((data) => data[0])
      )
    )
      .then((poems) => {
        const map = new Map<number, Poem>();
        poems.filter(Boolean).forEach((p) => map.set(p.id, p));
        setPoemMap(map);
        setError("");
      })
      .catch((err) => setError(err.message || "エラー"))
      .finally(() => setLoading(false));
  }, []);

  const currentQuestion = batchQuestions[currentQ];
  const currentPoem = currentQuestion ? poemMap.get(currentQuestion.correctPoemId) : undefined;
  const isLastQuestion = currentQ >= batchQuestions.length - 1;
  const finished = showResult;
  const choices = fixedChoices;
  const firstTryCount = batchQuestions.length > 0 ? firstTryResults.filter(Boolean).length : 0;
  const perfectClear = finished && batchQuestions.length > 0 && firstTryCount === batchQuestions.length;

  useEffect(() => {
    if (finished && batchQuestions.length > 0) {
      saveBestScore("tricky_kami:summary", firstTryCount);
    }
  }, [finished, batchQuestions.length, firstTryCount, saveBestScore]);

  useEffect(() => {
    if (!perfectClear) return;
    fetch("/api/test-clears", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testType: "tricky_kami", range: "summary" }),
    }).catch((err) => console.error("クリア状態の保存に失敗:", err));
  }, [perfectClear]);

  useEffect(() => {
    if (!currentQuestion || !currentPoem || poemMap.size === 0) return;
    const choicePoems = currentQuestion.choicePoemIds
      .map((id) => poemMap.get(id))
      .filter(Boolean) as Poem[];
    setFixedChoices(
      shuffle(choicePoems.map((p) => ({ id: p.id, text: p.kami_hiragana })))
    );
    setClickedWrongIds([]);
  }, [currentQ, currentQuestion?.correctPoemId, poemMap.size]);

  useEffect(() => {
    if (currentPoem) currentGoroPoemIdRef.current = currentPoem.id;
  }, [currentQ, currentPoem?.id]);

  useEffect(() => {
    if (!showGoro || !currentPoem || goroPlayKey <= 0) return;
    const isCorrectState = isCorrect === true || hasShownCorrect;
    if (!isCorrectState) return;
    setGoroHighlightPhase("kami");
    const poemId = currentPoem.id;
    const run = async () => {
      if (currentGoroPoemIdRef.current !== poemId) return;
      if (currentPoem.kami_goro_audio_url) await playOnce(currentPoem.kami_goro_audio_url);
      if (currentGoroPoemIdRef.current !== poemId) return;
      setGoroHighlightPhase("shimo");
      if (currentPoem.shimo_goro_audio_url) await playOnce(currentPoem.shimo_goro_audio_url);
    };
    run();
  }, [goroPlayKey, showGoro, currentPoem?.id]);

  useEffect(() => {
    if (!showGoro || !currentPoem || goroPlayKey <= 0) return;
    const isCorrectState = isCorrect === true || hasShownCorrect;
    if (isCorrectState) return;
    const urls: string[] = [];
    if (currentPoem.kami_goro_audio_url) urls.push(currentPoem.kami_goro_audio_url);
    if (currentPoem.shimo_goro_audio_url) urls.push(currentPoem.shimo_goro_audio_url);
    if (urls.length > 0) playSequence(urls);
  }, [goroPlayKey, showGoro, currentPoem, isCorrect, hasShownCorrect]);

  const handleAnswer = (poemId: number) => {
    const correct = poemId === currentPoem?.id;
    if (isCorrect === null) {
      setSelectedKamiId(poemId);
      if (correct) {
        setIsCorrect(true);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      } else {
        setIsCorrect(false);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
        setClickedWrongIds((prev) => [...prev, poemId]);
      }
    } else if (isCorrect === false) {
      if (correct) {
        setHasShownCorrect(true);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      } else if (!clickedWrongIds.includes(poemId)) {
        setClickedWrongIds((prev) => [...prev, poemId]);
      }
    }
  };

  const handleNext = () => {
    stopAll();
    const firstTryCorrect = isCorrect === true && !hasShownCorrect;
    if (!firstTryCorrect && currentQuestion && currentPoem) {
      addToReviewList({
        type: "kami_tricky",
        poemId: currentQuestion.correctPoemId,
        choicePoemIds: currentQuestion.choicePoemIds,
      });
    }
    if (isLastQuestion) {
      currentGoroPoemIdRef.current = null;
      setFirstTryResults((prev) => [...prev, firstTryCorrect]);
      setShowResult(true);
    } else {
      const nextQuestion = batchQuestions[currentQ + 1];
      if (nextQuestion) currentGoroPoemIdRef.current = nextQuestion.correctPoemId;
      setFirstTryResults((prev) => [...prev, firstTryCorrect]);
      setCurrentQ((q) => q + 1);
      setSelectedKamiId(null);
      setIsCorrect(null);
      setShowGoro(false);
      setHasShownCorrect(false);
      setGoroPlayKey(0);
      setFixedChoices([]);
      setClickedWrongIds([]);
      setGoroHighlightPhase("none");
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-6 flex justify-center items-center min-h-[40vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || batchQuestions.length === 0 || !currentQuestion) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">{error || "データがありません"}</p>
        <Link href="/learn/tricky/kami" className="btn btn-outline">
          戻る
        </Link>
      </div>
    );
  }

  if (finished) {
    const total = batchQuestions.length;
    const currentCount = firstTryResults.filter(Boolean).length;
    const bestKey = "tricky_kami:summary";
    const best = getStoredBest(bestKey);
    const highest = Math.max(best, currentCount);
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">結果</h2>
        <p className="text-lg mb-2">
          最高一発正解数：<strong>{highest}</strong> / {total} 問
        </p>
        <p className="text-lg mb-2">
          今回の一発正解数：<strong>{currentCount}</strong> / {total} 問
        </p>
        <p className="text-base text-base-content/70 mb-6">
          （最初の回答で正解した問題の数です）
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/learn/tricky/kami/test" className="btn btn-outline">
            もう一度テストする
          </Link>
          <Link href="/learn/tricky/kami" className="btn btn-primary">
            戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!currentPoem) return null;

  const kamiGoroRange = findGoroRange(currentPoem.kami_hiragana, currentPoem.kami_goro);
  const shimoGoroRange = findGoroRange(currentPoem.shimo_hiragana, currentPoem.shimo_goro);
  const showKamiHighlight =
    (isCorrect === true || hasShownCorrect) &&
    (goroHighlightPhase === "kami" || goroHighlightPhase === "shimo");
  const showShimoHighlight =
    (isCorrect === true || hasShownCorrect) && goroHighlightPhase === "shimo";

  return (
    <div className="min-h-[60vh] p-6 bg-tatami">
      <p className="text-sm text-base-content/60 mb-2">
        問題 {currentQ + 1} / {batchQuestions.length}
      </p>
      <div className="max-w-2xl mx-auto">
        <p className="text-center text-lg mb-4">上の句はどちら？</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {choices.map((choice) => {
            const isSelected = selectedKamiId === choice.id;
            const isCorrectChoice = choice.id === currentPoem.id;
            const showCorrect =
              (isCorrect === true || hasShownCorrect) && isCorrectChoice;
            const showWrong =
              isCorrect === false &&
              (clickedWrongIds.includes(choice.id) || (isSelected && !isCorrectChoice));
            const showKamiGoro = showKamiHighlight && choice.id === currentPoem.id;
            const choiceKamiGoroRange = showKamiGoro
              ? findGoroRange(choice.text, currentPoem.kami_goro)
              : undefined;
            return (
              <ChoiceCard
                key={choice.id}
                text={choice.text}
                onClick={() => handleAnswer(choice.id)}
                disabled={isCorrect === true || hasShownCorrect}
                result={
                  showCorrect ? "correct" : showWrong ? "wrong" : null
                }
                highlightRange={choiceKamiGoroRange}
              />
            );
          })}
        </div>

        <div className="mb-6 flex justify-center">
          <PoemCard
            text={currentPoem.shimo_hiragana}
            variant="shimo"
            highlightRange={
              showShimoHighlight && shimoGoroRange.length > 0
                ? shimoGoroRange
                : undefined
            }
          />
        </div>

        {showGoro && currentPoem.goro_kaisetsu && (
          <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
            <p className="text-xs font-medium text-base-content/60 mb-1">語呂の意味</p>
            <p className="text-xl font-bold text-base-content">
              {currentPoem.goro_kaisetsu}
            </p>
          </div>
        )}

        {(isCorrect === true || hasShownCorrect) && !finished && (
          <div className="flex justify-center gap-4">
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {isLastQuestion ? "次へ" : "次の問題へ"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
