"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Poem } from "@/types/poem";
import { playOnce, stopAll } from "@/lib/audio";
import { ChoiceCard } from "@/components/QuizCard";
import { KAMI_GORO_END_SEC } from "@/data/goro-timings";

type Stage = "shokyuu" | "chukyu" | "jokyu";

const STAGE_DELAY_MS: Record<Stage, number> = {
  shokyuu: 4000,
  chukyu: 2000,
  jokyu: 500,
};

const STAGE_LABELS: Record<Stage, string> = {
  shokyuu: "初級",
  chukyu: "中級",
  jokyu: "上級",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- 結果画面 ----
function ResultScreen({
  computerScore,
  userScore,
  onRestart,
}: {
  computerScore: number;
  userScore: number;
  onRestart: () => void;
}) {
  const [phase, setPhase] = useState(0);

  const winner =
    userScore > computerScore ? "user" : computerScore > userScore ? "computer" : "draw";

  // 自動で順次表示
  useEffect(() => {
    if (phase >= 6) return;
    const delay = phase === 0 ? 700 : 1400;
    const timer = setTimeout(() => setPhase((p) => p + 1), delay);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleClick = () => {
    setPhase((p) => Math.min(p + 1, 6));
  };

  return (
    <div
      className="min-h-[60vh] bg-tatami flex flex-col items-center justify-center p-6 cursor-pointer select-none"
      onClick={handleClick}
    >
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-center mb-10 tracking-widest">結果発表</h2>

        {/* コンピュータースコア */}
        <div
          className={`mb-2 text-center transition-opacity duration-700 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-base text-base-content/60 tracking-wider">コンピューター：</p>
        </div>
        <div
          className={`mb-8 text-center transition-opacity duration-700 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-6xl font-bold">{computerScore}枚</p>
        </div>

        <hr
          className={`border-base-content/20 mb-6 transition-opacity duration-700 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}
        />

        {/* ユーザースコア */}
        <div
          className={`mb-2 text-center transition-opacity duration-700 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-base text-base-content/60 tracking-wider">あなた：</p>
        </div>
        <div
          className={`mb-8 text-center transition-opacity duration-700 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-6xl font-bold">{userScore}枚</p>
        </div>

        <hr
          className={`border-base-content/20 mb-8 transition-opacity duration-700 ${phase >= 5 ? "opacity-100" : "opacity-0"}`}
        />

        {/* 勝者発表 */}
        <div
          className={`text-center mb-10 transition-opacity duration-700 ${phase >= 5 ? "opacity-100" : "opacity-0"}`}
        >
          {winner === "draw" ? (
            <p className="text-4xl font-bold text-amber-700">同点！</p>
          ) : winner === "user" ? (
            <p className="text-4xl font-bold text-green-700">あなたの勝ち！</p>
          ) : (
            <p className="text-4xl font-bold text-base-content/70">コンピューターの勝ち！</p>
          )}
        </div>

        {/* ボタン */}
        <div
          className={`flex flex-col gap-3 transition-opacity duration-700 ${phase >= 6 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
            もう一度挑戦する
          </button>
          <Link href="/battle" className="btn btn-outline btn-lg">
            ステージ選択へ戻る
          </Link>
          <Link href="/" className="btn btn-ghost">
            トップへ戻る
          </Link>
        </div>

        {phase < 6 && (
          <p className="text-center text-xs text-base-content/40 mt-6">タップして進む</p>
        )}
      </div>
    </div>
  );
}

// ---- 対戦画面 ----
function BattlePlayContent() {
  const searchParams = useSearchParams();

  const stageParam = searchParams.get("stage") ?? "shokyuu";
  const stage: Stage = (["shokyuu", "chukyu", "jokyu"] as const).includes(stageParam as Stage)
    ? (stageParam as Stage)
    : "shokyuu";
  const count = Math.max(20, Math.min(100, parseInt(searchParams.get("count") ?? "20", 10)));

  const [allPoems, setAllPoems] = useState<Poem[]>([]);
  const [questionPoems, setQuestionPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentQ, setCurrentQ] = useState(0);
  const [choices, setChoices] = useState<{ text: string; poemId: number }[]>([]);
  const [takenBy, setTakenBy] = useState<"user" | "computer" | null>(null);
  const [clickedWrong, setClickedWrong] = useState<string | null>(null);
  const [isOtetsuki, setIsOtetsuki] = useState(false);
  const [computerAnimating, setComputerAnimating] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // refs（クロージャのstale参照を避けるため）
  const takenRef = useRef<"user" | "computer" | null>(null);
  const lastPlayedQRef = useRef<number | null>(null);
  const computerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computerTakeActionRef = useRef<() => void>(() => {});

  // 全句をfetch（1回のみ）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/poems?from=1&to=100")
      .then((res) => {
        if (!res.ok) throw new Error("取得に失敗しました");
        return res.json() as Promise<Poem[]>;
      })
      .then((data) => {
        const poems = data as Poem[];
        if (!cancelled) {
          setAllPoems(poems);
          setQuestionPoems(shuffle(poems).slice(0, count));
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || "エラー");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ページ離脱時クリーンアップ
  useEffect(() => {
    return () => {
      stopAll();
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  }, []);

  const current = questionPoems[currentQ] ?? null;

  // 問題切替時：選択肢生成・状態リセット
  useEffect(() => {
    if (!current || questionPoems.length === 0 || allPoems.length === 0) return;
    takenRef.current = null;
    const others = allPoems.filter((p) => p.id !== current.id);
    const wrong = shuffle(others)
      .slice(0, 3)
      .map((p) => ({ text: p.shimo_hiragana, poemId: p.id }));
    const four = shuffle([{ text: current.shimo_hiragana, poemId: current.id }, ...wrong]);
    setChoices(four);
    setTakenBy(null);
    setClickedWrong(null);
    setIsOtetsuki(false);
    setComputerAnimating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, questionPoems.length, current?.id, allPoems.length]);

  // 問題切替時：上の句音声再生（2問目以降は1秒後）
  useEffect(() => {
    if (!current?.kami_audio_url || questionPoems.length === 0) return;
    if (lastPlayedQRef.current === currentQ) return;
    if (lastPlayedQRef.current != null) stopAll();
    lastPlayedQRef.current = currentQ;

    const audioDelay = currentQ === 0 ? 0 : 1000;
    const timer = setTimeout(() => {
      playOnce(current.kami_audio_url);
    }, audioDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, questionPoems.length, current?.id, current?.kami_audio_url]);

  // コンピューターが札を取るアクション（常に最新のstateを参照）
  computerTakeActionRef.current = () => {
    if (takenRef.current !== null) return;
    takenRef.current = "computer";
    setTakenBy("computer");
    setComputerScore((s) => s + 1);
    setComputerAnimating(true);
  };

  // 問題切替時：コンピュータータイマーをセット
  useEffect(() => {
    if (!current || questionPoems.length === 0) return;
    const audioDelay = currentQ === 0 ? 0 : 1000;
    const goroEndMs = (KAMI_GORO_END_SEC[current.id] ?? 2.0) * 1000;
    const totalDelay = audioDelay + goroEndMs + STAGE_DELAY_MS[stage];
    const timer = setTimeout(() => computerTakeActionRef.current(), totalDelay);
    computerTimerRef.current = timer;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, questionPoems.length, current?.id, stage]);

  // ---- ハンドラ ----
  const handleAnswer = (text: string) => {
    if (takenRef.current !== null || isOtetsuki) return;
    if (text === current?.shimo_hiragana) {
      // 正解
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
      takenRef.current = "user";
      setTakenBy("user");
      setUserScore((s) => s + 1);
    } else {
      // お手付き
      setClickedWrong(text);
      setIsOtetsuki(true);
    }
  };

  const handleNext = () => {
    stopAll();
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    if (currentQ >= questionPoems.length - 1) {
      setShowResult(true);
      return;
    }
    setCurrentQ((q) => q + 1);
  };

  const startNewGame = () => {
    if (allPoems.length === 0) return;
    stopAll();
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    setQuestionPoems(shuffle(allPoems).slice(0, count));
    setCurrentQ(0);
    setUserScore(0);
    setComputerScore(0);
    setTakenBy(null);
    setClickedWrong(null);
    setIsOtetsuki(false);
    setComputerAnimating(false);
    setChoices([]);
    setShowResult(false);
    lastPlayedQRef.current = null;
    takenRef.current = null;
  };

  // ---- 画面分岐 ----
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || questionPoems.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">{error || "データがありません"}</p>
        <Link href="/" className="btn btn-outline">
          トップへ戻る
        </Link>
      </div>
    );
  }

  if (showResult) {
    return (
      <ResultScreen
        computerScore={computerScore}
        userScore={userScore}
        onRestart={startNewGame}
      />
    );
  }

  if (!current) return null;

  const correctIdx = choices.findIndex((c) => c.poemId === current.id);
  const isCardTaken = takenBy !== null;
  const showNext = isCardTaken && !computerAnimating;

  return (
    <div className="min-h-[60vh] p-4 bg-tatami">
      {/* ヘッダー */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between text-sm text-base-content/70">
        <span>
          問題 {currentQ + 1} / {questionPoems.length}
        </span>
        <span>{STAGE_LABELS[stage]}</span>
      </div>

      {/* スコアバー */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center bg-base-100/60 rounded-xl px-6 py-3">
        <div className="text-center">
          <p className="text-xs text-base-content/60 mb-0.5">コンピューター</p>
          <p className="text-2xl font-bold">{computerScore}</p>
        </div>
        <p className="text-base-content/30 text-lg font-bold">vs</p>
        <div className="text-center">
          <p className="text-xs text-base-content/60 mb-0.5">あなた</p>
          <p className="text-2xl font-bold">{userScore}</p>
        </div>
      </div>

      <p className="text-center text-sm text-base-content/70 mb-6">
        上の句の音声を聞いて下の句の札を取ってください
      </p>

      {/* 選択肢グリッド */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {choices.map((item, idx) => {
          const isCorrectCard = item.poemId === current.id;
          return (
            <div key={`${item.poemId}-${item.text.slice(0, 8)}`} className="relative">
              <ChoiceCard
                text={item.text}
                onClick={() => handleAnswer(item.text)}
                disabled={isCardTaken || isOtetsuki}
                result={
                  isCardTaken && isCorrectCard
                    ? "correct"
                    : clickedWrong === item.text
                      ? "wrong"
                      : null
                }
              />
              {/* コンピューター手アニメーション */}
              {computerAnimating && idx === correctIdx && (
                <Image
                  src="/hand.png"
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="absolute left-1/2 pointer-events-none z-10"
                  style={{
                    top: "-80px",
                    animation: "hand-take 1.2s ease-in-out forwards",
                  }}
                  onAnimationEnd={() => setComputerAnimating(false)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* お手付きメッセージ */}
      {isOtetsuki && !isCardTaken && (
        <p className="text-center text-sm text-red-600 font-semibold mb-4">
          お手付き！コンピューターが取ります…
        </p>
      )}

      {/* 次へボタン */}
      {showNext && (
        <div className="flex justify-center">
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            {currentQ >= questionPoems.length - 1 ? "結果へ" : "次へ"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BattlePlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[40vh]">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <BattlePlayContent />
    </Suspense>
  );
}
