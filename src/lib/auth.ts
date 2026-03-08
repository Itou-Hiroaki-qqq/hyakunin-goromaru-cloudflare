// JWT 発行・検証（Web Crypto API / HMAC-SHA256）
// jsonwebtoken は Cloudflare Workers で使用不可のため Web Crypto を使用

export const COOKIE_NAME = "auth-token";
export const EXPIRES_IN = 7 * 24 * 60 * 60; // 7日（秒）

export interface JWTPayload {
  uid: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return secret;
}

function toBase64url(buffer: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(uid: string): Promise<string> {
  const enc = new TextEncoder();
  const header = toBase64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64url(
    enc.encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + EXPIRES_IN }))
  );
  const message = `${header}.${payload}`;
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return `${message}.${toBase64url(sig)}`;
}

export async function getAuthUser(request: Request): Promise<JWTPayload | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifyJWT(match[1]);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const key = await getKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64url(sigB64).buffer as ArrayBuffer,
      new TextEncoder().encode(message).buffer as ArrayBuffer
    );
    if (!valid) return null;
    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(fromBase64url(payloadB64))
    );
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
