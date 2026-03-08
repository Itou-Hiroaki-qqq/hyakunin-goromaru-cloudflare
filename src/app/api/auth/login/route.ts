import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyPassword } from "@/lib/password";
import { signJWT, COOKIE_NAME, EXPIRES_IN } from "@/lib/auth";

interface UserRow {
  uid: string;
  name: string;
  email: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const user = await db
      .prepare("SELECT uid, name, email, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first<UserRow>();

    // タイミング攻撃対策
    const dummyHash =
      "00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";
    const passwordOk = await verifyPassword(password, user?.password_hash ?? dummyHash);

    if (!user || !passwordOk) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const token = await signJWT(user.uid);
    const response = NextResponse.json({
      uid: user.uid,
      name: user.name,
      email: user.email,
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: EXPIRES_IN,
    });
    return response;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "ログインに失敗しました" }, { status: 500 });
  }
}
