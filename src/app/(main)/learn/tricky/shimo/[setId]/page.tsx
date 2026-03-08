"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Poem } from "@/types/poem";
import { playOnce, playSequence, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { SHIMO_TRICKY_SETS } from "@/data/tricky-questions";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ShimoTrickyQuestionPage() {
  const params = useParams();
  const setId = params.setId as string;
  const set = SHIMO_TRICKY_SETS.find((s) => s.id === setId);

  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedShimoId, setSelectedShimoId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showGoro, setShowGoro] = useState(false);
  const [hasShownCorrect, setHasShownCorrect] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0); // 音声再生のトリガー
  const [showResult, setShowResult] = useState(false); // 結果画面を表示するか
  const [fixedChoices, setFixedChoices] = useState<{ id: number; text: string }[]>([]); // 固定された選択肢
  const [clickedWrongIds, setClickedWrongIds] = useState<number[]>([]); // クリックした間違え選択肢のID
  const [goroHighlightPhase, setGoroHighlightPhase] = useState<"none" | "kami" | "shimo">("none"); // 正解時のみ、上の句→下の句の順で赤表示
  const currentGoroPoemIdRef = useRef<number | null>(null); // 次の問題に進んだら前問の語呂再生を打ち切り

  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  useEffect(() => {
    if (!set) {
      setLoading(false);
      setError("問題セットが見つかりません");
      return;
    }

    Promise.all(
      set.poemIds.map((id) =>
        fetch(`/api/poems?from=${id}&to=${id}`)
          .then((res) => res.json() as Promise<Poem[]>)
          .then((data) => data[0])
      )
    )
      .then((data) => {
        setPoems(data.filter(Boolean));
        setError("");
      })
      .catch((err) => setError(err.message || "エラー"))
      .finally(() => setLoading(false));
  }, [set]);

  // 問題が変わった時に選択肢をシャッフルして固定
  useEffect(() => {
    if (poems.length > 0) {
      setFixedChoices(shuffle(
        poems.map((p) => ({ id: p.id, text: p.shimo_hiragana }))
      ));
      setClickedWrongIds([]);
    }
  }, [currentQ, poems.length]);

  // 現在の問題: 各poemについて、そのpoemの上の句を表示し、下の句を選択肢にする
  // 選択肢は常にそのセットのすべてのpoemの下の句から選ぶ
  const currentPoem = poems[currentQ];
  const isLastQuestion = currentQ >= poems.length - 1;
  const finished = showResult;
  const allChoices = fixedChoices;

  useEffect(() => {
    if (currentPoem) currentGoroPoemIdRef.current = currentPoem.id;
  }, [currentQ, currentPoem?.id]);

  // 正解時のみ：上の句語呂の赤→下の句語呂の赤の順で表示し、音声も上の句→下の句の順で再生
  useEffect(() => {
    if (!showGoro || !currentPoem || goroPlayKey <= 0) return;
    const isCorrectState = isCorrect === true || hasShownCorrect;
    if (!isCorrectState) return;

    setGoroHighlightPhase("kami");
    const poemId = currentPoem.id;
    const run = async () => {
      if (currentGoroPoemIdRef.current !== poemId) return;
      if (currentPoem.kami_goro_audio_url) {
        await playOnce(currentPoem.kami_goro_audio_url);
      }
      if (currentGoroPoemIdRef.current !== poemId) return;
      setGoroHighlightPhase("shimo");
      if (currentPoem.shimo_goro_audio_url) {
        await playOnce(currentPoem.shimo_goro_audio_url);
      }
    };
    run();
  }, [goroPlayKey, showGoro, currentPoem?.id]);

  // 不正解時は語呂音声のみ再生（赤表示は出さない）
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
      // 初回回答
      setSelectedShimoId(poemId);
      if (correct) {
        // 正解
        setIsCorrect(true);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      } else {
        // 不正解
        setIsCorrect(false);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
        setClickedWrongIds((prev) => [...prev, poemId]);
      }
    } else if (isCorrect === false) {
      if (correct) {
        // 間違えた後、正解の札をクリック
        setHasShownCorrect(true);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      } else if (!clickedWrongIds.includes(poemId)) {
        // 間違えた後、別の間違え選択肢をクリック
        setClickedWrongIds((prev) => [...prev, poemId]);
      }
    }
  };

  const handleNext = () => {
    stopAll();
    if (isLastQuestion) {
      currentGoroPoemIdRef.current = null;
      setShowResult(true);
    } else {
      const nextPoem = poems[currentQ + 1];
      if (nextPoem) currentGoroPoemIdRef.current = nextPoem.id;
      setCurrentQ((q) => q + 1);
      setSelectedShimoId(null);
      setIsCorrect(null);
      setShowGoro(false);
      setHasShownCorrect(false);
      setGoroPlayKey(0);
      setFixedChoices([]); // 選択肢をリセット（次の問題で再シャッフル）
      setClickedWrongIds([]);
      setGoroHighlightPhase("none");
    }
  };

  if (!set) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">問題セットが見つかりません</p>
        <Link href="/learn/tricky/shimo" className="btn btn-outline">
          戻る
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
        <Link href="/learn/tricky/shimo" className="btn btn-outline">
          戻る
        </Link>
      </div>
    );
  }

  if (finished) {
    const currentIndex = SHIMO_TRICKY_SETS.findIndex((s) => s.id === setId);
    const isLastSet = currentIndex >= 0 && currentIndex === SHIMO_TRICKY_SETS.length - 1;
    const nextSet = currentIndex >= 0 && currentIndex < SHIMO_TRICKY_SETS.length - 1
      ? SHIMO_TRICKY_SETS[currentIndex + 1]
      : null;

    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">結果</h2>
        <p className="text-lg mb-6">すべて正解しました！</p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => {
              setCurrentQ(0);
              setSelectedShimoId(null);
              setIsCorrect(null);
              setShowGoro(false);
              setHasShownCorrect(false);
              setGoroPlayKey(0);
              setShowResult(false);
              setClickedWrongIds([]);
              setGoroHighlightPhase("none");
            }}
            className="btn btn-outline"
          >
            もう一度学習する
          </button>
          {nextSet ? (
            <Link href={`/learn/tricky/shimo/${nextSet.id}`} className="btn btn-primary">
              次へ
            </Link>
          ) : isLastSet ? (
            <Link href="/learn/tricky/shimo/test" className="btn btn-primary">
              まとめテストへ進む
            </Link>
          ) : null}
          <Link href="/learn/tricky/shimo" className="btn btn-outline">
            戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!currentPoem) return null;

  const kamiGoroRange = findGoroRange(currentPoem.kami_hiragana, currentPoem.kami_goro);
  const shimoGoroRange = findGoroRange(currentPoem.shimo_hiragana, currentPoem.shimo_goro);
  const showKamiHighlight = (isCorrect === true || hasShownCorrect) && (goroHighlightPhase === "kami" || goroHighlightPhase === "shimo");
  const showShimoHighlight = (isCorrect === true || hasShownCorrect) && goroHighlightPhase === "shimo";

  return (
    <div className="min-h-[60vh] p-6 bg-tatami">
      <p className="text-sm text-base-content/60 mb-2">
        その{setId} 問題 {currentQ + 1} / {poems.length}
      </p>
      <div className="max-w-2xl mx-auto">
        <p className="text-center text-lg mb-4">下の句はどちら？</p>

        {/* 上の句の表示 */}
        <div className="mb-6 flex justify-center">
          <PoemCard
            text={currentPoem.kami_hiragana}
            variant="kami"
            highlightRange={showKamiHighlight && kamiGoroRange.length > 0 ? kamiGoroRange : undefined}
          />
        </div>

        {/* 語呂解説（間違えた時または正解した時） */}
        {showGoro && currentPoem.goro_kaisetsu && (
          <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/30">
            <p className="text-xs font-medium text-base-content/60 mb-1">語呂の意味</p>
            <p className="text-xl font-bold text-base-content">
              {currentPoem.goro_kaisetsu}
            </p>
          </div>
        )}

        {/* 選択肢（下の句） */}
        <div className={`grid ${poems.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
          {allChoices.map((choice) => {
            const isSelected = selectedShimoId === choice.id;
            const isCorrectChoice = choice.id === currentPoem.id;
            const showCorrect = (isCorrect === true || hasShownCorrect) && isCorrectChoice;
            const showWrong = isCorrect === false && (clickedWrongIds.includes(choice.id) || (isSelected && !isCorrectChoice));
            const showShimoGoro = showShimoHighlight && choice.id === currentPoem.id;
            const choiceShimoGoroRange = showShimoGoro ? findGoroRange(choice.text, currentPoem.shimo_goro) : undefined;
            
            return (
              <ChoiceCard
                key={choice.id}
                text={choice.text}
                onClick={() => handleAnswer(choice.id)}
                disabled={isCorrect === true || hasShownCorrect}
                result={
                  showCorrect
                    ? "correct"
                    : showWrong
                      ? "wrong"
                      : null
                }
                highlightRange={choiceShimoGoroRange}
              />
            );
          })}
        </div>

        {/* 次の問題ボタン（正解した時、または間違えた後正解の札をクリックした時） */}
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
