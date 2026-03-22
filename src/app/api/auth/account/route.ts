import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthUser, COOKIE_NAME } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const uid = payload.uid;

    // 関連データを全て削除（トランザクション的にバッチ実行）
    await db.batch([
      db.prepare("DELETE FROM user_test_clears WHERE user_id = ?").bind(uid),
      db.prepare("DELETE FROM user_test_best_scores WHERE user_id = ?").bind(uid),
      db.prepare("DELETE FROM users WHERE uid = ?").bind(uid),
    ]);

    // Cookie をクリア
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("account delete error:", err);
    return NextResponse.json(
      { error: "アカウント削除に失敗しました" },
      { status: 500 }
    );
  }
}
