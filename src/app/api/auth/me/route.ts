import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthUser } from "@/lib/auth";

interface UserRow {
  uid: string;
  name: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const user = await db
      .prepare("SELECT uid, name, email FROM users WHERE uid = ?")
      .bind(payload.uid)
      .first<UserRow>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: { uid: user.uid, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
