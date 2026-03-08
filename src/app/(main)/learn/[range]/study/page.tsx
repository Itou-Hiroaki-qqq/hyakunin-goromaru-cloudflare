"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Poem } from "@/types/poem";
import { playOnce, playSequence, stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { parseRange } from "@/lib/range";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

const CHAR_DELAY_MS = 120;

type LearnStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudyRangePage() {
  const params = useParams();
  const range = parseRange(params.range as string | undefined);

  const [poems, setPoems] = useState<Poem[]>([]);
  const [allPoems, setAllPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [poemIndex, setPoemIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "practice">("learn");
  const [learnStep, setLearnStep] = useState<LearnStep>(0);
  const [kamiVisibleLen, setKamiVisibleLen] = useState(0);
  const [shimoVisibleLen, setShimoVisibleLen] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [clickedWrong, setClickedWrong] = useState<string[]>([]);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const playingRef = useRef(false);

  const current = poems[poemIndex];
  const isLast = poemIndex === poems.length - 1;
  const rangeLabel = range ? `${range.from}-${range.to}` : "";

  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  const rangeKey = typeof params.range === "string" ? params.range : "";
  useEffect(() => {
    if (!range) {
      setLoading(false);
      setError("範囲が不正です");
      return;
    }
    const { from, to } = range;
    Promise.all([
      fetch(`/api/poems?from=${from}&to=${to}`).then((r) => (r.ok ? r.json() as Promise<Poem[]> : Promise.reject(new Error(`${from}-${to} failed`)))),
      fetch("/api/poems?from=1&to=100").then((r) => (r.ok ? r.json() as Promise<Poem[]> : [] as Poem[])),
    ])
      .then(([section, all]) => {
        setPoems(section);
        setAllPoems(Array.isArray(all) && all.length >= section.length ? all : section);
        setError("");
      })
      .catch((err) => {
        setError(err.message || "取得に失敗しました");
        fetch(`/api/poems?from=${from}&to=${to}`)
          .then((r) => (r.ok ? r.json() as Promise<Poem[]> : [] as Poem[]))
          .then((data) => {
            if (data.length) setPoems(data);
            setAllPoems(data);
          })
          .finally(() => setLoading(false));
      })
      .finally(() => setLoading(false));
  }, [rangeKey]);

  const runLearnSequence = useCallback(async () => {
    if (!current || playingRef.current) return;
    playingRef.current = true;

    try {
      if (learnStep === 1) {
        setKamiVisibleLen(0);
        const kamiLen = current.kami_hiragana.length;
        const audioPromise = playOnce(current.kami_audio_url ?? "");
        const interval = setInterval(() => {
          setKamiVisibleLen((n) => (n >= kamiLen ? kamiLen : n + 1));
        }, CHAR_DELAY_MS);
        await audioPromise;
        clearInterval(interval);
        setKamiVisibleLen(kamiLen);
        setLearnStep(2);
        playingRef.current = false;
        return;
      }
      if (learnStep === 2) {
        setShimoVisibleLen(0);
        const shimoLen = current.shimo_hiragana.length;
        const audioPromise = playOnce(current.shimo_audio_url ?? "");
        const interval = setInterval(() => {
          setShimoVisibleLen((n) => (n >= shimoLen ? shimoLen : n + 1));
        }, CHAR_DELAY_MS);
        await audioPromise;
        clearInterval(interval);
        setShimoVisibleLen(shimoLen);
        setLearnStep(3);
        playingRef.current = false;
        return;
      }
      if (learnStep === 3) {
        await playOnce(current.kami_goro_audio_url ?? "");
        setLearnStep(4);
        playingRef.current = false;
        return;
      }
      if (learnStep === 4) {
        await playOnce(current.shimo_goro_audio_url ?? "");
        setLearnStep(5);
        playingRef.current = false;
        return;
      }
      if (learnStep === 5) {
        await playSequence([
          current.kami_goro_audio_url ?? "",
          current.shimo_goro_audio_url ?? "",
        ]);
        setLearnStep(6);
      }
    } finally {
      playingRef.current = false;
    }
  }, [current, learnStep]);

  useEffect(() => {
    if (learnStep >= 1 && learnStep <= 5 && current && !playingRef.current) {
      runLearnSequence();
    }
  }, [learnStep, current, runLearnSequence]);

  const practiceAudioPlayed = useRef(false);
  const practicePoemIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "practice" || !current || allPoems.length === 0) return;
    if (practicePoemIdRef.current === current.id) return;
    practicePoemIdRef.current = current.id;
    const others = allPoems.filter((p) => p.id !== current.id);
    const wrong = shuffle(others)
      .slice(0, 3)
      .map((p) => p.shimo_hiragana);
    const four = shuffle([current.shimo_hiragana, ...wrong]);
    setChoices(four);
    setClickedWrong([]);
    setSelectedCorrect(false);
    practiceAudioPlayed.current = false;
  }, [phase, poemIndex, current?.id, allPoems.length]);

  useEffect(() => {
    if (phase !== "practice" || !current?.kami_audio_url) return;
    if (practiceAudioPlayed.current) return;
    practiceAudioPlayed.current = true;
    playOnce(current.kami_audio_url);
  }, [phase, current?.id, current?.kami_audio_url]);

  const handleStartLearn = () => {
    setLearnStep(1);
    setKamiVisibleLen(0);
    setShimoVisibleLen(0);
  };

  const handleToPractice = () => {
    setPhase("practice");
  };

  const handleAnswer = (answer: string) => {
    if (selectedCorrect) return;
    if (answer === current?.shimo_hiragana) {
      setSelectedCorrect(true);
    } else if (!clickedWrong.includes(answer)) {
      setClickedWrong((prev) => [...prev, answer]);
    }
  };

  const handleNext = () => {
    if (isLast) return;
    stopAll();
    setPoemIndex((i) => i + 1);
    setPhase("learn");
    setLearnStep(0);
    setKamiVisibleLen(0);
    setShimoVisibleLen(0);
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

  if (error && poems.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-error mb-4">{error}</p>
        <Link href="/learn" className="btn btn-outline">
          学習リストへ戻る
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Link href="/learn" className="btn btn-outline">
          学習リストへ戻る
        </Link>
      </div>
    );
  }

  if (phase === "practice") {
    const kamiGoroRange = findGoroRange(current.kami_hiragana, current.kami_goro);

    return (
      <div className="min-h-[60vh] p-6 bg-tatami">
        <p className="text-sm text-base-content/60 mb-2">
          {current.id}首目（練習）
        </p>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-lg mb-4">上の句（ひらがな）の続きはどれ？</p>
          <div className="mb-6 flex justify-center">
            <PoemCard
              text={current.kami_hiragana}
              variant="kami"
              highlightRange={kamiGoroRange.length > 0 ? kamiGoroRange : undefined}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {choices.map((c) => (
              <ChoiceCard
                key={c}
                text={c}
                onClick={() => handleAnswer(c)}
                disabled={selectedCorrect}
                result={
                  selectedCorrect && c === current.shimo_hiragana
                    ? "correct"
                    : clickedWrong.includes(c)
                      ? "wrong"
                      : null
                }
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPhase("learn");
                setLearnStep(0);
                setKamiVisibleLen(0);
                setShimoVisibleLen(0);
              }}
            >
              学習に戻る
            </button>
            {selectedCorrect &&
              (isLast ? (
                <>
                  <Link href={`/learn/${rangeLabel}/test`} className="btn btn-primary">
                    {poems.length}首でテストへ
                  </Link>
                  <Link href="/learn" className="btn btn-outline">
                    学習リストへ戻る
                  </Link>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  次の首へ
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  const kamiGoroRange = findGoroRange(current.kami_hiragana, current.kami_goro);
  const shimoGoroRange = findGoroRange(current.shimo_hiragana, current.shimo_goro);

  const renderKamiHiragana = () => {
    const s = current.kami_hiragana.slice(0, kamiVisibleLen);
    return Array.from(s).map((ch, i) => {
      const isGoro =
        learnStep >= 3 &&
        i >= kamiGoroRange.start &&
        i < kamiGoroRange.start + kamiGoroRange.length;
      return (
        <span
          key={i}
          className={isGoro ? "text-red-600 underline" : ""}
        >
          {ch}
        </span>
      );
    });
  };

  const renderShimoHiragana = () => {
    const s = current.shimo_hiragana.slice(0, shimoVisibleLen);
    return Array.from(s).map((ch, i) => {
      const isGoro =
        learnStep >= 4 &&
        i >= shimoGoroRange.start &&
        i < shimoGoroRange.start + shimoGoroRange.length;
      return (
        <span
          key={i}
          className={isGoro ? "text-red-600 underline" : ""}
        >
          {ch}
        </span>
      );
    });
  };

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <p className="text-sm text-base-content/60 mb-2">
        {current.id}首目（学習）
      </p>
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-lg font-medium text-base-content/80">上の句</p>
          <p className="text-2xl font-bold">{current.kami}</p>
          {(learnStep >= 1 || kamiVisibleLen > 0) && (
            <p className="text-base text-base-content/80 mt-1 font-serif">
              {renderKamiHiragana()}
            </p>
          )}
          <div className="divider my-2" />
          <p className="text-lg font-medium text-base-content/80">下の句</p>
          <p className="text-2xl font-bold">{current.shimo}</p>
          {(learnStep >= 2 || shimoVisibleLen > 0) && (
            <p className="text-base text-base-content/80 mt-1 font-serif">
              {renderShimoHiragana()}
            </p>
          )}
          {learnStep >= 5 && current.goro_kaisetsu && (
            <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30">
              <p className="text-xs font-medium text-base-content/60 mb-1">語呂の意味</p>
              <p className="text-xl font-bold text-base-content">
                {current.goro_kaisetsu}
              </p>
            </div>
          )}
          <div className="card-actions justify-end mt-6">
            {learnStep === 0 && (
              <button type="button" className="btn btn-primary" onClick={handleStartLearn}>
                始める
              </button>
            )}
            {learnStep === 6 && (
              <button type="button" className="btn btn-primary" onClick={handleToPractice}>
                練習へ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
