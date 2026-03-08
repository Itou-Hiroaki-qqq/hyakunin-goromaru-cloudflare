"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KAMI_TRICKY_SETS } from "@/data/tricky-questions";

type ClearStatus = { test_type: string; range: string };

export default function KamiTrickyPage() {
  const [clears, setClears] = useState<ClearStatus[]>([]);

  useEffect(() => {
    fetch("/api/test-clears")
      .then((res) => res.json() as Promise<{ clears: ClearStatus[] }>)
      .then((data) => setClears(data.clears || []))
      .catch((err) => console.error("クリア状態の取得に失敗:", err));
  }, []);

  const isSummaryCleared = clears.some(
    (c) => c.test_type === "tricky_kami" && c.range === "summary"
  );

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">上の句がまぎらわしい問題</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {KAMI_TRICKY_SETS.map((set) => (
          <Link
            key={set.id}
            href={`/learn/tricky/kami/${set.id}`}
            className="btn btn-outline btn-sm"
          >
            その{set.id}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Link href="/learn/tricky/kami/test" className="btn btn-primary flex items-center gap-2">
          {isSummaryCleared && <span className="text-yellow-500 text-xl">★</span>}
          まとめてテスト
        </Link>
      </div>

      <Link href="/learn/tricky" className="btn btn-outline">
        戻る
      </Link>
    </div>
  );
}
