import { useEffect, useRef } from "react";
import type { Poem } from "@/types/poem";
import { playOnce, stopAll } from "@/lib/audio";

interface UseKamiAudioOptions {
  current: Poem | null;
  currentQ: number;
  poemsLength: number;
}

/** テストページで問題が変わるたびに上の句音声を再生するフック */
export function useKamiAudio({ current, currentQ, poemsLength }: UseKamiAudioOptions): void {
  const lastPlayedQRef = useRef<number | null>(null);

  useEffect(() => {
    if (!current?.kami_audio_url || poemsLength === 0) return;
    if (lastPlayedQRef.current === currentQ) return;
    if (lastPlayedQRef.current != null) stopAll();
    lastPlayedQRef.current = currentQ;
    playOnce(current.kami_audio_url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, poemsLength, current?.id, current?.kami_audio_url]);
}
