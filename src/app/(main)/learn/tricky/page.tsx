"use client";

import Link from "next/link";

export default function TrickyQuestionsPage() {
  return (
    <div className="container max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">間違えやすい問題</h1>

      <div className="flex flex-col gap-4">
        <Link
          href="/learn/tricky/kami"
          className="btn btn-primary btn-block btn-lg"
        >
          上の句がまぎらわしい問題
        </Link>
        <Link
          href="/learn/tricky/shimo"
          className="btn btn-primary btn-block btn-lg"
        >
          下の句がまぎらわしい問題
        </Link>
        <Link
          href="/learn"
          className="btn btn-outline btn-block"
        >
          学習リストへ戻る
        </Link>
      </div>
    </div>
  );
}
