/**
 * 語呂文字列から「ひらがな部分」を抽出（～などを除く）
 */
export function goroToSearch(goro: string): string {
  return goro.replace(/～/g, "").trim();
}

/**
 * 検索用に正規化（歴史的仮名・表記ゆれを吸収）
 * が↔か、べ↔へ など、ひらがなテキストと語呂で表記が違う場合に一致させる
 */
function normalizeForMatch(s: string): string {
  return s
    .replace(/が/g, "か")
    .replace(/べ/g, "へ")
    .replace(/ゐ/g, "い")
    .replace(/ゑ/g, "え");
}

/**
 * スペースを除去した文字列と、元の文字列での位置マッピングを作成
 */
function removeSpacesWithMapping(text: string): { text: string; mapping: number[] } {
  const textNoSpaces = text.replace(/\s+/g, "");
  const mapping: number[] = [];
  let originalIdx = 0;
  for (let i = 0; i < textNoSpaces.length; i++) {
    while (originalIdx < text.length && /\s/.test(text[originalIdx])) {
      originalIdx++;
    }
    mapping.push(originalIdx);
    originalIdx++;
  }
  return { text: textNoSpaces, mapping };
}

/**
 * ひらがなテキスト内で語呂に相当する部分の開始位置と長さを返す
 * 語呂が部分一致しない場合は正規化して検索（が→か、べ→へ 等）
 * スペースは無視して検索し、元のテキストの位置にマッピング
 */
export function findGoroRange(hiragana: string, goro: string): { start: number; length: number } {
  const search = goroToSearch(goro);
  if (!search || !hiragana) return { start: 0, length: 0 };

  // スペースを除去したバージョンで検索
  const searchNoSpaces = search.replace(/\s+/g, "");
  const hiraganaMapping = removeSpacesWithMapping(hiragana);
  const hiraganaNoSpaces = hiraganaMapping.text;

  // まず通常の検索
  let idx = hiraganaNoSpaces.indexOf(searchNoSpaces);
  if (idx >= 0) {
    const start = hiraganaMapping.mapping[idx];
    const endIdx = idx + searchNoSpaces.length - 1;
    const end = endIdx < hiraganaMapping.mapping.length
      ? hiraganaMapping.mapping[endIdx] + 1
      : hiragana.length;
    return { start, length: end - start };
  }

  // 正規化して再検索
  const normHiraganaNoSpaces = normalizeForMatch(hiraganaNoSpaces);
  const normSearchNoSpaces = normalizeForMatch(searchNoSpaces);
  idx = normHiraganaNoSpaces.indexOf(normSearchNoSpaces);
  if (idx >= 0) {
    const start = hiraganaMapping.mapping[idx];
    const endIdx = idx + normSearchNoSpaces.length - 1;
    const end = endIdx < hiraganaMapping.mapping.length
      ? hiraganaMapping.mapping[endIdx] + 1
      : hiragana.length;
    return { start, length: end - start };
  }

  // マッチしない場合は最初の1文字のみ（フォールバック）
  if (hiragana.length > 0) return { start: 0, length: 1 };
  return { start: 0, length: 0 };
}
