import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword } from "@/lib/password";
import { signJWT, COOKIE_NAME, EXPIRES_IN } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "全ての項目を入力してください" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    // メール重複チェック
    const existing = await db
      .prepare("SELECT uid FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const uid = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await db
      .prepare(
        "INSERT INTO users (uid, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(uid, name, email, passwordHash, now)
      .run();

    const token = await signJWT(uid);
    const response = NextResponse.json({ user: { uid, name, email }, token }, { status: 201 });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: EXPIRES_IN,
    });
    return response;
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
