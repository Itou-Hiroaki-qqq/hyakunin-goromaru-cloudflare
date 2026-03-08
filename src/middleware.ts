import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, COOKIE_NAME } from "./lib/auth";

// 認証なしでアクセス可能なパス
const PUBLIC_PATHS = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスルー
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 認証系 API はスルー
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // poems API は未ログインでもアクセス可能
  if (pathname.startsWith("/api/poems")) {
    return NextResponse.next();
  }

  // GET の test-clears / test-best-scores は未ログインでもアクセス可能（空データを返す）
  if (
    (pathname.startsWith("/api/test-clears") || pathname.startsWith("/api/test-best-scores")) &&
    request.method === "GET"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ページアクセスは未ログインでも許可（学習機能は使える）
    return NextResponse.next();
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.next();
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|hand.png).*)",
  ],
};
