"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Poem } from "@/types/poem";
import { stopAll } from "@/lib/audio";
import { findGoroRange } from "@/lib/goro";
import { useGoroPlayback } from "@/lib/useGoroPlayback";
import {
  getReviewList,
  removeFromReviewList,
  type ReviewItem,
} from "@/lib/reviewStorage";
import { PoemCard, ChoiceCard } from "@/components/QuizCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewPage() {
  const [list, setList] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setList(getReviewList());
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  const currentItem = list[currentIndex];

  const handleRemoveAndNext = (id: string) => {
    removeFromReviewList(id);
    const nextList = getReviewList();
    setList(nextList);
    if (nextList.length === 0) return;
    setCurrentIndex((i) => Math.min(i, nextList.length - 1));
  };

  const handleNextOnly = () => {
    setCurrentIndex((i) => (i + 1) % list.length);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-6 flex justify-center items-center min-h-[40vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">復習ページ</h1>
        <p className="text-base-content/80 mb-4">
          復習する問題はありません。テストで間違えるとここに追加されます。
        </p>
        <Link href="/" className="btn btn-outline">
          トップページへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">復習ページ</h1>
      <p className="text-sm text-base-content/70 mb-4">
        「学習リスト」や「間違えやすい問題」の各テストで間違えた問題が表示されます
      </p>
      <p className="text-sm text-base-content/60 mb-4">
        問題 {currentIndex + 1} / {list.length}
      </p>
      <ReviewQuestion
        key={currentItem.id}
        item={currentItem}
        onRemove={() => handleRemoveAndNext(currentItem.id)}
        onNext={handleNextOnly}
      />
      <div className="mt-6">
        <Link href="/" className="btn btn-outline">
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}

function ReviewQuestion({
  item,
  onRemove,
  onNext,
}: {
  item: ReviewItem;
  onRemove: () => void;
  onNext: () => void;
}) {
  if (item.type === "range" || item.type === "all") {
    return (
      <ReviewRangeOrAll type={item.type} poemId={item.poemId} range={item.type === "range" ? item.range : undefined} onRemove={onRemove} onNext={onNext} />
    );
  }
  return (
    <ReviewTricky
      type={item.type}
      poemId={item.poemId}
      choicePoemIds={item.choicePoemIds}
      onRemove={onRemove}
      onNext={onNext}
    />
  );
}

function ReviewRangeOrAll({
  type,
  poemId,
  range,
  onRemove,
  onNext,
}: {
  type: "range" | "all";
  poemId: number;
  range?: string;
  onRemove: () => void;
  onNext: () => void;
}) {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [choices, setChoices] = useState<{ text: string; poemId: number }[]>([]);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const [clickedWrong, setClickedWrong] = useState<string[]>([]);
  const [showGoro, setShowGoro] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0);

  const current = poems.find((p) => p.id === poemId) ?? null;

  const { goroHighlightPhase } = useGoroPlayback({
    current,
    showGoro,
    goroPlayKey,
    selectedCorrect,
  });

  useEffect(() => {
    const url =
      type === "all"
        ? "/api/poems?from=1&to=100"
        : range
          ? `/api/poems?from=${range.split("-")[0]}&to=${range.split("-")[1]}`
          : null;
    if (!url) return;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("取得に失敗しました");
        return r.json() as Promise<Poem[]>;
      })
      .then((data) => setPoems(data))
      .catch(() => setFetchError(true));
  }, [type, range]);

  useEffect(() => {
    if (poems.length === 0) return;
    const poem = poems.find((p) => p.id === poemId);
    if (!poem) return;
    const others = poems.filter((p) => p.id !== poem.id);
    const wrong = shuffle(others).slice(0, 3).map((p) => ({ text: p.shimo_hiragana, poemId: p.id }));
    setChoices(shuffle([{ text: poem.shimo_hiragana, poemId: poem.id }, ...wrong]));
  }, [poems, poemId]);

  const showKamiHighlight = selectedCorrect && (goroHighlightPhase === "kami" || goroHighlightPhase === "shimo");
  const showShimoHighlight = selectedCorrect && goroHighlightPhase === "shimo";

  const handleAnswer = (answer: string) => {
    if (selectedCorrect) return;
    if (answer === current?.shimo_hiragana) {
      setSelectedCorrect(true);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
    } else if (!clickedWrong.includes(answer)) {
      setClickedWrong((prev) => [...prev, answer]);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
    }
  };

  if (fetchError) {
    return (
      <div className="p-6 rounded-xl bg-base-200">
        <p className="text-error mb-4">問題データの取得に失敗しました</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={onNext}>
          次の問題へ
        </button>
      </div>
    );
  }

  if (!current || choices.length === 0) {
    return <span className="loading loading-spinner" />;
  }

  const kamiGoroRange = findGoroRange(current.kami_hiragana, current.kami_goro);
  const shimoGoroRange = findGoroRange(current.shimo_hiragana, current.shimo_goro);

  return (
    <div className="min-h-[40vh] p-6 bg-tatami rounded-xl">
      <p className="text-center text-lg mb-4">上の句（ひらがな）の続きはどれ？</p>
      <div className="mb-6 flex justify-center">
        <PoemCard
          text={current.kami_hiragana}
          variant="kami"
          highlightRange={showKamiHighlight && kamiGoroRange.length > 0 ? kamiGoroRange : undefined}
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
      {(selectedCorrect || clickedWrong.length > 0) && (
        <div className="flex justify-center gap-4">
          <button type="button" className="btn btn-outline" onClick={onRemove}>
            復習からはずす
          </button>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            次へ
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewTricky({
  type,
  poemId,
  choicePoemIds,
  onRemove,
  onNext,
}: {
  type: "kami_tricky" | "shimo_tricky";
  poemId: number;
  choicePoemIds: number[];
  onRemove: () => void;
  onNext: () => void;
}) {
  const [poemMap, setPoemMap] = useState<Map<number, Poem>>(new Map());
  const [fetchError, setFetchError] = useState(false);
  const [fixedChoices, setFixedChoices] = useState<{ id: number; text: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasShownCorrect, setHasShownCorrect] = useState(false);
  const [clickedWrongIds, setClickedWrongIds] = useState<number[]>([]);
  const [showGoro, setShowGoro] = useState(false);
  const [goroPlayKey, setGoroPlayKey] = useState(0);

  const currentPoem = poemMap.get(poemId) ?? null;
  const selectedCorrect = isCorrect === true || hasShownCorrect;

  const { goroHighlightPhase } = useGoroPlayback({
    current: currentPoem,
    showGoro,
    goroPlayKey,
    selectedCorrect,
  });

  useEffect(() => {
    Promise.all(
      choicePoemIds.map((id) =>
        fetch(`/api/poems?from=${id}&to=${id}`)
          .then((r) => {
            if (!r.ok) throw new Error("取得に失敗しました");
            return r.json() as Promise<Poem[]>;
          })
          .then((data) => data[0])
      )
    )
      .then((poems) => {
        const map = new Map<number, Poem>();
        poems.filter(Boolean).forEach((p) => map.set(p.id, p));
        setPoemMap(map);
        setFixedChoices(
          shuffle(
            poems
              .filter(Boolean)
              .map((p) => ({
                id: p.id,
                text: type === "kami_tricky" ? p.kami_hiragana : p.shimo_hiragana,
              }))
          )
        );
      })
      .catch(() => setFetchError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choicePoemIds.join(","), type]);

  const choices = fixedChoices;
  const showKamiHighlight =
    selectedCorrect && (goroHighlightPhase === "kami" || goroHighlightPhase === "shimo");
  const showShimoHighlight = selectedCorrect && goroHighlightPhase === "shimo";

  const handleAnswer = (id: number) => {
    const correct = id === poemId;
    if (isCorrect === null) {
      setSelectedId(id);
      setIsCorrect(correct);
      if (correct) {
        setHasShownCorrect(true);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      } else {
        setClickedWrongIds((prev) => [...prev, id]);
        setShowGoro(true);
        setGoroPlayKey((k) => k + 1);
      }
    } else if (!isCorrect && correct) {
      setHasShownCorrect(true);
      setShowGoro(true);
      setGoroPlayKey((k) => k + 1);
    } else if (!isCorrect && !correct && !clickedWrongIds.includes(id)) {
      setClickedWrongIds((prev) => [...prev, id]);
    }
  };

  if (fetchError) {
    return (
      <div className="p-6 rounded-xl bg-base-200">
        <p className="text-error mb-4">問題データの取得に失敗しました</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={onNext}>
          次の問題へ
        </button>
      </div>
    );
  }

  if (!currentPoem || choices.length === 0) {
    return <span className="loading loading-spinner" />;
  }

  const isKami = type === "kami_tricky";
  const kamiGoroRange = findGoroRange(currentPoem.kami_hiragana, currentPoem.kami_goro);
  const shimoGoroRange = findGoroRange(currentPoem.shimo_hiragana, currentPoem.shimo_goro);

  return (
    <div className="min-h-[40vh] p-6 bg-tatami rounded-xl">
      <p className="text-center text-lg mb-4">
        {isKami ? "上の句はどちら？" : "下の句はどちら？"}
      </p>
      {isKami ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {choices.map((choice) => {
              const showKamiGoro = showKamiHighlight && choice.id === poemId;
              const choiceKamiGoroRange = showKamiGoro
                ? findGoroRange(choice.text, currentPoem.kami_goro)
                : undefined;
              return (
                <ChoiceCard
                  key={choice.id}
                  text={choice.text}
                  onClick={() => handleAnswer(choice.id)}
                  disabled={selectedCorrect}
                  result={
                    selectedCorrect && choice.id === poemId
                      ? "correct"
                      : clickedWrongIds.includes(choice.id)
                        ? "wrong"
                        : null
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
                showShimoHighlight && shimoGoroRange.length > 0 ? shimoGoroRange : undefined
              }
            />
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex justify-center">
            <PoemCard
              text={currentPoem.kami_hiragana}
              variant="kami"
              highlightRange={
                showKamiHighlight && kamiGoroRange.length > 0 ? kamiGoroRange : undefined
              }
            />
          </div>
          <div
            className={`grid ${choices.length >= 3 ? "grid-cols-3" : "grid-cols-2"} gap-4 mb-6`}
          >
            {choices.map((choice) => {
              const showShimoGoro = showShimoHighlight && choice.id === poemId;
              const choiceShimoGoroRange = showShimoGoro
                ? findGoroRange(choice.text, currentPoem.shimo_goro)
                : undefined;
              return (
                <ChoiceCard
                  key={choice.id}
                  text={choice.text}
                  onClick={() => handleAnswer(choice.id)}
                  disabled={selectedCorrect}
                  result={
                    selectedCorrect && choice.id === poemId
                      ? "correct"
                      : clickedWrongIds.includes(choice.id)
                        ? "wrong"
                        : null
                  }
                  highlightRange={choiceShimoGoroRange}
                />
              );
            })}
          </div>
        </>
      )}
      {showGoro && currentPoem.goro_kaisetsu && (
        <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
          <p className="text-xs font-medium text-base-content/60 mb-1">語呂の意味</p>
          <p className="text-xl font-bold text-base-content">
            {currentPoem.goro_kaisetsu}
          </p>
        </div>
      )}
      {(selectedCorrect || isCorrect === false) && (
        <div className="flex justify-center gap-4">
          <button type="button" className="btn btn-outline" onClick={onRemove}>
            復習からはずす
          </button>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
