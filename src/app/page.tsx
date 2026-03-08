"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getReviewList } from "@/lib/reviewStorage";

export default function Home() {
  const pathname = usePathname();
  const [hasReview, setHasReview] = useState(false);
  const [isAllCleared, setIsAllCleared] = useState(false);

  useEffect(() => {
    setHasReview(getReviewList().length > 0);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/test-clears")
      .then((res) => res.json())
      .then((data) => {
        const typedData = data as { clears?: { test_type: string; range: string }[] };
        setIsAllCleared(
          typedData.clears?.some((c) => c.test_type === "100首" && c.range === "all") ?? false
        );
      })
      .catch(() => {});
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-center mb-8 leading-tight">
        百人一首
        <br />
        -ゴロでマル覚え-
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/learn" className="btn btn-primary btn-lg">
          学習スタート
        </Link>
        {hasReview ? (
          <Link href="/review" className="btn btn-outline btn-lg">
            復習
          </Link>
        ) : (
          <button type="button" className="btn btn-outline btn-lg" disabled>
            復習
          </button>
        )}
        <hr className="border-base-300" />
        <p className="text-center text-xs text-base-content/40">
          以下は「100首ぜんぶテスト」をノーミスでクリアすると解放されます
        </p>
        {isAllCleared ? (
          <Link href="/jissen" className="btn btn-outline btn-lg">
            実践問題
          </Link>
        ) : (
          <button type="button" className="btn btn-outline btn-lg" disabled>
            実践問題
          </button>
        )}
        {isAllCleared ? (
          <Link href="/battle" className="btn btn-outline btn-lg">
            コンピューター対戦
          </Link>
        ) : (
          <button type="button" className="btn btn-outline btn-lg" disabled>
            コンピューター対戦
          </button>
        )}
      </div>
      <footer className="mt-auto py-6 text-sm text-base-content/60">
        All Rights Reserved 2026 © Hiroaki Ito
      </footer>
    </main>
  );
}
