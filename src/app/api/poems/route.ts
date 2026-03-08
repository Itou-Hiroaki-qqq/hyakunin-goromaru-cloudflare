import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Poem } from "@/types/poem";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const fromNum = from != null ? parseInt(from, 10) : NaN;
    const toNum = to != null ? parseInt(to, 10) : NaN;
    const hasRange = !Number.isNaN(fromNum) && !Number.isNaN(toNum);

    let results: Poem[];

    if (hasRange) {
      const { results: rows } = await db
        .prepare(
          `SELECT id, kami, shimo, kami_hiragana, shimo_hiragana,
                  kami_tts, shimo_tts, kami_goro_tts, shimo_goro_tts,
                  kami_goro, shimo_goro, goro_kaisetsu,
                  kami_audio_url, shimo_audio_url,
                  kami_goro_audio_url, shimo_goro_audio_url
           FROM poems
           WHERE id >= ? AND id <= ?
           ORDER BY id ASC`
        )
        .bind(fromNum, toNum)
        .all<Poem>();
      results = rows;
    } else {
      const { results: rows } = await db
        .prepare(
          `SELECT id, kami, shimo, kami_hiragana, shimo_hiragana,
                  kami_tts, shimo_tts, kami_goro_tts, shimo_goro_tts,
                  kami_goro, shimo_goro, goro_kaisetsu,
                  kami_audio_url, shimo_audio_url,
                  kami_goro_audio_url, shimo_goro_audio_url
           FROM poems
           ORDER BY id ASC`
        )
        .all<Poem>();
      results = rows;
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("poems API error:", err);
    return NextResponse.json(
      { error: "句の取得に失敗しました" },
      { status: 500 }
    );
  }
}
