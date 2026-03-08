"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stage = "shokyuu" | "chukyu" | "jokyu";

const STAGES: { value: Stage; label: string; desc: string }[] = [
  { value: "shokyuu", label: "初級", desc: "語呂の後 4秒でコンピューターが取ります" },
  { value: "chukyu", label: "中級", desc: "語呂の後 2秒でコンピューターが取ります" },
  { value: "jokyu",  label: "上級", desc: "語呂の後 0.5秒でコンピューターが取ります" },
];

const COUNTS = [20, 40, 60, 80, 100];

export default function BattlePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const canStart = stage !== null && count !== null;

  return (
    <main className="min-h-[60vh] p-6 bg-tatami">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">コンピューター対戦</h1>

        {/* ステージ選択 */}
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">ステージを選んでください</h2>
          <div className="flex gap-3">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStage(s.value)}
                className={`flex-1 btn btn-lg ${stage === s.value ? "btn-primary" : "btn-outline bg-base-100/70"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-base-content/50 mt-3 min-h-[1.5em]">
            {stage ? STAGES.find((s) => s.value === stage)?.desc : ""}
          </p>
        </section>

        {/* 問題数選択 */}
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">問題数を選んでください</h2>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                className={`flex-1 btn ${count === c ? "btn-primary" : "btn-outline bg-base-100/70"}`}
              >
                {c}問
              </button>
            ))}
          </div>
        </section>

        {/* 対戦スタートボタン */}
        {canStart && (
          <div className="flex justify-center mb-6">
            <button
              type="button"
              className="btn btn-primary btn-lg px-10"
              onClick={() => router.push(`/battle/play?stage=${stage}&count=${count}`)}
            >
              対戦スタート
            </button>
          </div>
        )}

        <div className="flex justify-center">
          <Link href="/" className="btn btn-ghost btn-sm">
            トップへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
