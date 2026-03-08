import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthUser } from "@/lib/auth";

interface ScoreRow {
  test_key: string;
  best_score: number;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ scores: {}, loggedIn: false }, { status: 200 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const { results: rows } = await db
      .prepare(
        `SELECT test_key, best_score
         FROM user_test_best_scores
         WHERE user_id = ?`
      )
      .bind(payload.uid)
      .all<ScoreRow>();

    const scores: Record<string, number> = {};
    rows.forEach((r) => {
      scores[r.test_key] = r.best_score;
    });

    return NextResponse.json({ scores, loggedIn: true });
  } catch (err) {
    console.error("test-best-scores GET error:", err);
    return NextResponse.json(
      { error: "最高一発正解数の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ saved: false, loggedIn: false }, { status: 200 });
    }

    const body = (await request.json()) as { testKey?: string; score?: number };
    const { testKey, score } = body;

    if (typeof testKey !== "string" || typeof score !== "number") {
      return NextResponse.json(
        { error: "testKey (string) と score (number) が必要です" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    // SQLite には GREATEST 関数がないため MAX + サブクエリで代替
    await db
      .prepare(
        `INSERT INTO user_test_best_scores (user_id, test_key, best_score)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id, test_key)
         DO UPDATE SET
           best_score = MAX(user_test_best_scores.best_score, excluded.best_score),
           updated_at = datetime('now')`
      )
      .bind(payload.uid, testKey, score)
      .run();

    return NextResponse.json({ saved: true, loggedIn: true });
  } catch (err) {
    console.error("test-best-scores POST error:", err);
    return NextResponse.json(
      { error: "最高一発正解数の保存に失敗しました" },
      { status: 500 }
    );
  }
}
