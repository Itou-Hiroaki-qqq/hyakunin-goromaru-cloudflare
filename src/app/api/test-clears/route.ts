import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthUser } from "@/lib/auth";

interface ClearRow {
  test_type: string;
  range_key: string;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ clears: [] }, { status: 200 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const { results: rows } = await db
      .prepare(
        `SELECT test_type, range_key
         FROM user_test_clears
         WHERE user_id = ?
         ORDER BY range_key, test_type`
      )
      .bind(payload.uid)
      .all<ClearRow>();

    // フロントエンドとの互換性のため range_key → range に変換
    const clears = rows.map((r) => ({
      test_type: r.test_type,
      range: r.range_key,
    }));

    return NextResponse.json({ clears });
  } catch (err) {
    console.error("test-clears API error:", err);
    return NextResponse.json(
      { error: "クリア状態の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = (await request.json()) as { testType?: string; range?: string };
    const { testType, range: testRange } = body;

    if (!testType || !testRange) {
      return NextResponse.json(
        { error: "testType と range が必要です" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    await db
      .prepare(
        `INSERT INTO user_test_clears (user_id, test_type, range_key)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id, test_type, range_key)
         DO UPDATE SET cleared_at = datetime('now')`
      )
      .bind(payload.uid, testType, testRange)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("test-clears POST error:", err);
    return NextResponse.json(
      { error: "クリア状態の保存に失敗しました" },
      { status: 500 }
    );
  }
}
