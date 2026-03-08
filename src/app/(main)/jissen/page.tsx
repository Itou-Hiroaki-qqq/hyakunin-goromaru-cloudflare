"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Poem } from "@/types/poem";
import { playOnce, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function JissenPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [choices, setChoices] = useState<{ text: string; poemId: number }[]>([]);
  const [clickedWrong, setClickedWrong] = useState<string[]>([]);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const lastPlayedQRef = useRef<number | null>(null);

  // ページ離脱時に音声を停止
  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  // キャンセルパターン付きfetch（StrictMode二重実行対策）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/poems?from=1&to=100")
      .then((res) => {
        if (!res.ok) throw new Error("取得に失敗しました");
        return res.json() as Promise<Poem[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setPoems(shuffle(data));
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || "エラー");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const current = poems[currentQ] ?? null;

  // 問題切り替え時に選択肢・状態をリセット
  useEffect(() => {
    if (!current || poems.length === 0) return;
    const others = poems.filter((p) => p.id !== current.id);
    const wrong = shuffle(others).slice(0, 3).map((p) => ({ text: p.shimo_hiragana, poemId: p.id }));
    const four = shuffle([{ text: current.shimo_hiragana, poemId: current.id }, ...wrong]);
    setChoices(four);
    setClickedWrong([]);
    setSelectedCorrect(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, poems.length, current?.id]);

  // 問題切り替え時に上の句音声を自動再生
  useEffect(() => {
    if (!current?.kami_audio_url || poems.length === 0) return;
    if (lastPlayedQRef.current === currentQ) return; // 同じ問題の二重再生を防止
    if (lastPlayedQRef.current != null) stopAll();
    lastPlayedQRef.current = currentQ;
    playOnce(current.kami_audio_url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, poems.length, current?.id, current?.kami_audio_url]);

  const handleReplayAudio = () => {
    if (!current?.kami_audio_url) return;
    stopAll();
    playOnce(current.kami_audio_url);
  };

  const handleAnswer = (answer: string) => {
    if (selectedCorrect) return;
    if (answer === current?.shimo_hiragana) {
      // stopAll() は呼ばない：上の句音声がロード中・再生中でも継続させる
      // （正解を押す速さによっては音声がまだロード中のため、ここで止めると無音になる）
      // handleNext() の stopAll() で次問移行時に停止する
      setSelectedCorrect(true);
    } else if (!clickedWrong.includes(answer)) {
      setClickedWrong((prev) => [...prev, answer]);
    }
  };

  const handleNext = () => {
    stopAll();
    if (currentQ >= poems.length - 1) {
      setShowResult(true);
      return;
    }
    setSelectedCorrect(false);
    setClickedWrong([]);
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
        <Link href="/" className="btn btn-outline">
          トップに戻る
        </Link>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">実践問題 完了</h2>
        <p className="text-lg mb-6">100問すべて終了しました。</p>
        <Link href="/" className="btn btn-primary">
          トップに戻る
        </Link>
      </div>
    );
  }

  if (!current) return null;

  const kamiGoroRange = findGoroRange(current.kami_hiragana, current.kami_goro);
  const shimoGoroRange = findGoroRange(current.shimo_hiragana, current.shimo_goro);

  return (
    <div className="min-h-[60vh] p-6 bg-tatami">
      <p className="text-sm text-base-content/60 mb-2">
        問題 {currentQ + 1} / {poems.length}
      </p>
      <div className="max-w-2xl mx-auto">
        <p className="text-center text-lg mb-3">上の句の音声を聞いて下の句を答えてください</p>

        {/* 音声再生ボタン */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={handleReplayAudio}
            className="btn btn-circle btn-outline"
            aria-label="上の句の音声を再生"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>

        {/* 正解後：上の句カードを語呂ハイライト付きで表示 */}
        {selectedCorrect && (
          <div className="mb-6 flex justify-center">
            <PoemCard
              text={current.kami_hiragana}
              variant="kami"
              highlightRange={kamiGoroRange.length > 0 ? kamiGoroRange : undefined}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {choices.map((item) => {
            const isCorrectChoice = item.text === current.shimo_hiragana;
            const choiceShimoRange =
              selectedCorrect && isCorrectChoice && shimoGoroRange.length > 0
                ? shimoGoroRange
                : undefined;
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

        {selectedCorrect && (
          <div className="flex justify-center gap-4">
            <Link href="/" className="btn btn-ghost">
              トップに戻る
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {currentQ >= poems.length - 1 ? "終了" : "次の問題"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
