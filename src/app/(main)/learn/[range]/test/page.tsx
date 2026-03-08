"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Poem } from "@/types/poem";
import { playOnce, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { parseRange } from "@/lib/range";
import { addToReviewList } from "@/lib/reviewStorage";
import { useTestBestScores } from "@/lib/useTestBestScores";
import { useGoroPlayback } from "@/lib/useGoroPlayback";
import { useKamiAudio } from "@/lib/useKamiAudio";
import { useTestResultSave } from "@/lib/useTestResultSave";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TWENTY_TEST_LABELS: Record<string, string> = {
  "1-20": "1～20首テストへ進む",
  "21-40": "21～40首テストへ進む",
  "41-60": "41～60首テストへ進む",
  "61-80": "61～80首テストへ進む",
  "81-100": "81～100首テストへ進む",
};

function get20TestRange(from: number): string {
  if (from <= 20) return "1-20";
  if (from <= 40) return "21-40";
  if (from <= 60) return "41-60";
  if (from <= 80) return "61-80";
  return "81-100";
}

export default function TestRangePage() {
  const params = useParams();
  const range = parseRange(params.range as string | undefined);

  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [choices, setChoices] = useState<{ text: string; poemId: number }[]>([]);
  const [clickedWrong, setClickedWrong] = useState<string[]>([]);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [perfectScore, setPerfectScore] = useState(0);
  const [showGoro, setShowGoro] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const { getStoredBest, saveBestScore } = useTestBestScores();

  // 語呂再生の多重起動・問題またぎ防止用 Ref
  const goroRunInProgressRef = useRef(false);
  const currentGoroPoemIdRef = useRef<number | null>(null);
  const lastGoroPlayKeyRef = useRef<number>(-1);

  const poemIndex = order[currentQ];
  const current = poemIndex != null ? poems[poemIndex] : null;
  const isLastQuestion = currentQ >= poems.length - 1;
  const finished = showResult;
  const rangeLabel = range ? `${range.from}-${range.to}` : "";
  const is20Test = range ? range.to - range.from + 1 === 20 : false;
  const isSummaryTest = range ? range.from === 1 && range.to > 4 : false;

  // 語呂再生（正解後ハイライト付き・不正解後一括）
  const { goroHighlightPhase, resetGoroHighlight } = useGoroPlayback({
    current,
    showGoro,
    goroPlayKey,
    selectedCorrect,
    goroRunInProgressRef,
    currentGoroPoemIdRef,
    lastGoroPlayKeyRef,
  });

  // 問題ごとに上の句音声を自動再生
  useKamiAudio({ current, currentQ, poemsLength: poems.length });

  // テスト終了時の保存処理
  useTestResultSave({
    finished,
    poems,
    range,
    current,
    clickedWrong,
    perfectScore,
    rangeLabel,
    saveBestScore,
  });

  // ページ離脱時に音声を停止
  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  // 句データ取得
  const rangeKey = typeof params.range === "string" ? params.range : "";
  useEffect(() => {
    if (!range) {
      setLoading(false);
      setError("範囲が不正です");
      return;
    }
    const { from, to } = range;
    fetch(`/api/poems?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error("取得に失敗しました");
        return res.json() as Promise<Poem[]>;
      })
      .then((data) => {
        setPoems(data);
        setOrder(data.map((_, i) => i));
        setError("");
      })
      .catch((err) => setError(err.message || "エラー"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  // 問題切り替え時に選択肢・状態をリセット
  useEffect(() => {
    if (!current || poems.length === 0) return;
    currentGoroPoemIdRef.current = current.id;
    goroRunInProgressRef.current = false;
    lastGoroPlayKeyRef.current = -1;
    const others = poems.filter((p) => p.id !== current.id);
    const wrong = others.map((p) => ({ text: p.shimo_hiragana, poemId: p.id }));
    const four = shuffle([
      { text: current.shimo_hiragana, poemId: current.id },
      ...wrong.slice(0, 3),
    ]);
    setChoices(four);
    setClickedWrong([]);
    setSelectedCorrect(false);
    setShowGoro(false);
    setGoroPlayKey(0);
    resetGoroHighlight();
    setShowResult(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, poems.length, current?.id]);

  const handleAnswer = (answer: string) => {
    if (selectedCorrect) return;
    // stopAll() はここでは呼ばない。音声ロード中にクリックすると無音になるため。
    // 語呂音声の再生直前（useGoroPlayback 内）で stopAll() を呼ぶ。
    if (answer === current?.shimo_hiragana) {
      setSelectedCorrect(true);
      setScore((s) => s + 1);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
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
    goroRunInProgressRef.current = false;
    if (current && clickedWrong.length > 0 && range) {
      addToReviewList({
        type: "range",
        poemId: current.id,
        range: `${range.from}-${range.to}`,
      });
    }
    if (isLastQuestion) {
      currentGoroPoemIdRef.current = null;
      setShowResult(true);
      return;
    }
    const nextIdx = order[currentQ + 1];
    const nextPoem = nextIdx != null ? poems[nextIdx] : null;
    if (nextPoem) currentGoroPoemIdRef.current = nextPoem.id;
    setSelectedCorrect(false);
    setClickedWrong([]);
    setShowGoro(false);
    setGoroPlayKey(0);
    resetGoroHighlight();
    setCurrentQ((q) => q + 1);
  };

  if (!range) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">範囲が不正です</p>
        <Link href="/learn" className="btn btn-outline">
          学習リストへ戻る
        </Link>
      </div>
    );
  }

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
    const resultTitle = is20Test
      ? `${range?.from ?? 0}～${range?.to ?? 0}首テスト 結果`
      : isSummaryTest
        ? "ここまでのまとめテスト 結果"
        : `${poems.length}首でテスト 結果`;

    const from = range?.from ?? 0;
    const to = range?.to ?? 0;
    const is4Test = range && to - from + 1 === 4;
    const blockIndex = from > 0 ? Math.ceil(from / 4) : 0;
    const has8Test = blockIndex >= 2 && blockIndex % 2 === 0;
    const from8 = has8Test ? 4 * blockIndex - 7 : 0;
    const to8 = has8Test ? 4 * blockIndex : 0;
    const show8TestOn4Result = is4Test && has8Test;
    const is8Test = range && to - from + 1 === 8;
    const isFinalResult = is20Test || is8Test || is4Test;
    const nextFourFrom = to < 100 ? to + 1 : 0;
    const nextFourTo = to < 100 ? to + 4 : 0;
    const showNextFour = isFinalResult && to < 100 && !is20Test;

    const show20TestLink =
      !is20Test &&
      ((is4Test && from === 17 && to === 20) ||
        (is8Test && from === 33 && to === 40) ||
        (is4Test && from === 57 && to === 60) ||
        (is8Test && from === 73 && to === 80) ||
        (is8Test && from === 93 && to === 100));
    const twentyTestRange = show20TestLink ? get20TestRange(from) : "";
    const twentyTestLabel = twentyTestRange ? TWENTY_TEST_LABELS[twentyTestRange] ?? "" : "";

    const showAll100Link = is20Test && from === 81 && to === 100;

    const bestScoreKey = `range:${rangeLabel}`;
    const storedBest = getStoredBest(bestScoreKey);
    const highestIppatsu = Math.max(storedBest, perfectScore);

    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">{resultTitle}</h2>
        <p className="text-lg mb-2">
          最高一発正解数：{highestIppatsu} / {poems.length} 首
        </p>
        <p className="text-lg mb-6">
          今回の一発正解数：{perfectScore} / {poems.length} 首
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href={`/learn/${rangeLabel}/study`} className="btn btn-outline">
            もう一度学習する
          </Link>
          {show8TestOn4Result && (
            <Link href={`/learn/${from8}-${to8}/test`} className="btn btn-outline">
              前回も入れて8首でテスト
            </Link>
          )}
          {show20TestLink && twentyTestLabel && (
            <Link href={`/learn/${twentyTestRange}/test`} className="btn btn-outline">
              {twentyTestLabel}
            </Link>
          )}
          {showNextFour && (
            <Link href={`/learn/${nextFourFrom}-${nextFourTo}/study`} className="btn btn-outline">
              次の4首に進む
            </Link>
          )}
          {showAll100Link && (
            <Link href="/learn/all/test" className="btn btn-outline">
              100首ぜんぶテストへ進む
            </Link>
          )}
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
        {selectedCorrect && !finished && (
          <div className="flex justify-center gap-4">
            <Link href={`/learn/${rangeLabel}/study`} className="btn btn-ghost">
              学習に戻る
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {isLastQuestion ? "次へ" : "次の問題"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
