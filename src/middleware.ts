import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, COOKIE_NAME } from "./lib/auth";

// 認証なしでアクセス可能なパス
const PUBLIC_PATHS = ["/login", "/register"];

// CORSヘッダーを付与するヘルパー
function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS プリフライト (OPTIONS) は即座にOKを返す
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return withCors(new NextResponse(null, { status: 204 }));
  }

  // 公開パスはスルー
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 認証系 API はスルー（CORSヘッダー付き）
  if (pathname.startsWith("/api/auth")) {
    return withCors(NextResponse.next());
  }

  // poems API は未ログインでもアクセス可能
  if (pathname.startsWith("/api/poems")) {
    return withCors(NextResponse.next());
  }

  // GET の test-clears / test-best-scores は未ログインでもアクセス可能（空データを返す）
  if (
    (pathname.startsWith("/api/test-clears") || pathname.startsWith("/api/test-best-scores")) &&
    request.method === "GET"
  ) {
    return withCors(NextResponse.next());
  }

  // Cookie または Authorization ヘッダーからトークンを取得
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || cookieToken;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    // ページアクセスは未ログインでも許可（学習機能は使える）
    return NextResponse.next();
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const response = NextResponse.next();
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return withCors(NextResponse.next());
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|hand.png).*)",
  ],
};
