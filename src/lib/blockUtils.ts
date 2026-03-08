/** 4首ブロック1つ分の情報 */
export type BlockInfo = {
  from: number;
  to: number;
  key: string;
  blockIndex: number;
  has8Test: boolean;
  from8: number;
  to8: number;
  has20Test: boolean;
  from20: number;
  to20: number;
  twentyTestLabel: string;
};

/** インデックス（0始まり）からブロック情報を生成 */
function buildBlockInfo(i: number): BlockInfo {
  const from = i * 4 + 1;
  const to = (i + 1) * 4;
  const key = `${from}-${to}`;
  const blockIndex = Math.ceil(from / 4); // 1-based: 1～25

  // 8首テスト: 2番目・4番目・…・24番目・25番目のブロック
  const has8Test = (blockIndex >= 2 && blockIndex % 2 === 0) || blockIndex === 25;
  // 20首テスト: 5・10・15・20・25番目のブロック
  const has20Test = blockIndex % 5 === 0 && blockIndex >= 5;

  const from8 = has8Test ? (blockIndex === 25 ? 93 : 4 * blockIndex - 7) : 0;
  const to8 = has8Test ? (blockIndex === 25 ? 100 : 4 * blockIndex) : 0;

  const group20 = has20Test ? blockIndex / 5 : 0;
  const from20 = has20Test ? (group20 - 1) * 20 + 1 : 0;
  const to20 = has20Test ? group20 * 20 : 0;

  const twentyTestLabel =
    blockIndex === 5
      ? "1～20首テスト"
      : blockIndex === 10
        ? "21～40首テスト"
        : blockIndex === 15
          ? "41～60首テスト"
          : blockIndex === 20
            ? "61～80首テスト"
            : "81～100首テスト";

  return { from, to, key, blockIndex, has8Test, from8, to8, has20Test, from20, to20, twentyTestLabel };
}

/** 25ブロック分の情報（1～4首, 5～8首, …, 97～100首） */
export const BLOCKS: BlockInfo[] = Array.from({ length: 25 }, (_, i) => buildBlockInfo(i));

/** ブロックのクリア状態を判定する */
export function getBlockClearStatus(
  block: BlockInfo,
  isCleared: (testType: string, range: string) => boolean
): boolean {
  if (block.has20Test) return isCleared("20首", `${block.from20}-${block.to20}`);
  if (block.has8Test) return isCleared("8首", `${block.from8}-${block.to8}`);
  return isCleared("4首", `${block.from}-${block.to}`);
}
