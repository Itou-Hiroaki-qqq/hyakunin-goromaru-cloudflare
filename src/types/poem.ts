export interface Poem {
  id: number;
  kami: string;
  shimo: string;
  kami_hiragana: string;
  shimo_hiragana: string;
  kami_tts: string;
  shimo_tts: string;
  kami_goro_tts: string;
  shimo_goro_tts: string;
  kami_goro: string;
  shimo_goro: string;
  goro_kaisetsu: string;
  kami_audio_url: string;
  shimo_audio_url: string;
  kami_goro_audio_url?: string;
  shimo_goro_audio_url?: string;
}
