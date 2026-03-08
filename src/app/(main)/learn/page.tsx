"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BLOCKS, getBlockClearStatus } from "@/lib/blockUtils";

type ClearStatus = {
  test_type: string;
  range: string;
};

export default function LearnListPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [clears, setClears] = useState<ClearStatus[]>([]);

  useEffect(() => {
    fetch("/api/test-clears")
      .then((res) => res.json() as Promise<{ clears: ClearStatus[] }>)
      .then((data) => {
        setClears(data.clears || []);
      })
      .catch((err) => console.error("クリア状態の取得に失敗:", err));
  }, []);

  const isCleared = (testType: string, range: string): boolean => {
    return clears.some((c) => c.test_type === testType && c.range === range);
  };

  const isTrickyFullyCleared =
    isCleared("tricky_kami", "summary") && isCleared("tricky_shimo", "summary");

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">学習リスト</h1>

      <div className="flex flex-col gap-3">
        {BLOCKS.map((block) => {
          const { from, to, key, has8Test, from8, to8, has20Test, from20, to20, twentyTestLabel } = block;
          const isOpen = openKey === key;
          const isBlockCleared = getBlockClearStatus(block, isCleared);

          return (
            <div key={key} className="border border-base-300 rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-base-200 hover:bg-base-300 text-left font-medium"
                onClick={() => setOpenKey((k) => (k === key ? null : key))}
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2">
                  {isBlockCleared && (
                    <span className="text-yellow-500 text-xl">★</span>
                  )}
                  <span>{from}～{to}首</span>
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="p-4 bg-base-100 border-t border-base-300 flex flex-col gap-2">
                  <Link
                    href={`/learn/${from}-${to}/study`}
                    className="btn btn-primary btn-block btn-sm sm:btn-md"
                  >
                    学習
                  </Link>
                  <Link
                    href={`/learn/${from}-${to}/test`}
                    className="btn btn-outline btn-block btn-sm sm:btn-md"
                  >
                    4首でテスト
                  </Link>
                  {has8Test && (
                    <Link
                      href={`/learn/${from8}-${to8}/test`}
                      className="btn btn-outline btn-block btn-sm sm:btn-md"
                    >
                      前回も入れて8首でテスト
                    </Link>
                  )}
                  {has20Test && (
                    <Link
                      href={`/learn/${from20}-${to20}/test`}
                      className="btn btn-outline btn-block btn-sm sm:btn-md"
                    >
                      {twentyTestLabel}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 100首ぜんぶテスト */}
        <div className="border border-base-300 rounded-xl overflow-hidden mt-2">
          <Link
            href="/learn/all/test"
            className="w-full flex items-center justify-between p-4 bg-base-200 hover:bg-base-300 text-left font-medium"
          >
            <span className="flex items-center gap-2">
              {isCleared("100首", "all") && (
                <span className="text-yellow-500 text-xl">★</span>
              )}
              <span>100首ぜんぶテスト</span>
            </span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 境界線 */}
        <div className="divider my-4" />

        {/* 間違えやすい問題 */}
        <div className="border border-base-300 rounded-xl overflow-hidden">
          <Link
            href="/learn/tricky"
            className="w-full flex items-center justify-between p-4 bg-base-200 hover:bg-base-300 text-left font-medium"
          >
            <span className="flex items-center gap-2">
              {isTrickyFullyCleared && (
                <span className="text-yellow-500 text-xl">★</span>
              )}
              <span>間違えやすい問題</span>
            </span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
