/**
 * 間違えやすい問題のデータ定義
 */

export type TrickyQuestionSet = {
  id: string;
  poemIds: number[]; // 問題に使う句のID配列
};

// 上の句がまぎらわしい問題
export const KAMI_TRICKY_SETS: TrickyQuestionSet[] = [
  { id: "1", poemIds: [22, 20] },
  { id: "2", poemIds: [24, 25] },
  { id: "3", poemIds: [23, 21] },
  { id: "4", poemIds: [27, 28] },
  { id: "5", poemIds: [38, 31] },
  { id: "6", poemIds: [32, 37] },
  { id: "7", poemIds: [41, 33] },
  { id: "8", poemIds: [42, 43] },
  { id: "9", poemIds: [35, 44] },
  { id: "10", poemIds: [45, 30] },
  { id: "11", poemIds: [49, 50] },
  { id: "12", poemIds: [54, 55] },
  { id: "13", poemIds: [64, 67] },
  { id: "14", poemIds: [70, 71] },
  { id: "15", poemIds: [72, 73] },
  { id: "16", poemIds: [74, 75] },
  { id: "17", poemIds: [79, 80] },
  { id: "18", poemIds: [77, 78] },
  { id: "19", poemIds: [83, 84] },
  { id: "20", poemIds: [85, 66] },
  { id: "21", poemIds: [90, 91] },
  { id: "22", poemIds: [94, 95] },
  { id: "23", poemIds: [87, 96] },
  { id: "24", poemIds: [97, 88] },
  { id: "25", poemIds: [98, 99] },
];

// 下の句がまぎらわしい問題
export const SHIMO_TRICKY_SETS: TrickyQuestionSet[] = [
  { id: "1", poemIds: [13, 14] },
  { id: "2", poemIds: [84, 24] },
  { id: "3", poemIds: [5, 50] },
  { id: "4", poemIds: [97, 67] },
  { id: "5", poemIds: [69, 80] },
  { id: "6", poemIds: [2, 81, 74] }, // 3問構成
  { id: "7", poemIds: [18, 73] },
  { id: "8", poemIds: [55, 14, 13] }, // 3問構成
  { id: "9", poemIds: [29, 32] },
  { id: "10", poemIds: [62, 36] },
  { id: "11", poemIds: [27, 86, 41] }, // 3問構成
  { id: "12", poemIds: [10, 92] },
  { id: "13", poemIds: [23, 16] },
  { id: "14", poemIds: [71, 39, 75] }, // 3問構成
  { id: "15", poemIds: [52, 72, 82] }, // 3問構成
  { id: "16", poemIds: [20, 33, 66] }, // 3問構成
  { id: "17", poemIds: [59, 38] },
  { id: "18", poemIds: [60, 61] },
  { id: "19", poemIds: [96, 45] },
  { id: "20", poemIds: [48, 79] },
  { id: "21", poemIds: [76, 83] },
  { id: "22", poemIds: [35, 21, 70] }, // 3問構成
  { id: "23", poemIds: [28, 91] },
  { id: "24", poemIds: [17, 31] },
];
