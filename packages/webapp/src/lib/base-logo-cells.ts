// ============================================
// BASE ロゴ初期状態生成
// ============================================
//
// 64x64ボードの中央に36x36の青い四角を配置し、
// 上部に「♥ BASE ♥」、下部に「LIFE OF GAME」をロゴとして配置

import { Cell, BOARD_SIZE } from '@/types';

// 文字のピクセルパターン（5x7ピクセルフォント）
// 1 = 文字セル, 0 = 空白

const LETTER_A = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
];

const LETTER_B = [
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
];

const LETTER_E = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
];

const LETTER_F = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
];

const LETTER_G = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

const LETTER_I = [
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
];

const LETTER_L = [
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
];

const LETTER_M = [
  [1, 0, 0, 0, 1],
  [1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
];

const LETTER_O = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

const LETTER_S = [
  [0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
];

// ハートマーク（7x7ピクセル）
// 各セルに異なる色を割り当てるため、数値は色インデックスを直接指定
// 0 = 空白、1以上 = 色インデックス
const HEART_PATTERN = [
  [0, 1, 1, 0, 2, 2, 0],
  [1, 1, 1, 2, 2, 2, 2],
  [3, 3, 3, 3, 4, 4, 4],
  [0, 5, 5, 5, 5, 6, 0],
  [0, 0, 7, 7, 7, 0, 0],
  [0, 0, 0, 8, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

// ハートの色マッピング（カラフルに）
const HEART_COLORS: Record<number, number> = {
  1: 1,   // 赤
  2: 12,  // ピンク
  3: 2,   // オレンジ
  4: 3,   // 黄色
  5: 5,   // 緑
  6: 7,   // シアン
  7: 9,   // 青
  8: 11,  // マゼンタ
};

// BASE用の文字配列
const BASE_LETTERS = [LETTER_B, LETTER_A, LETTER_S, LETTER_E];
const BASE_COLORS = [1, 2, 3, 5]; // 赤, オレンジ, 黄, 緑

// LIFE OF GAME用の文字配列（スペースはnullで表現）
const BOTTOM_LETTERS: (number[][] | null)[] = [
  LETTER_L, LETTER_I, LETTER_F, LETTER_E, // LIFE
  null, // スペース
  LETTER_O, LETTER_F, // OF
  null, // スペース
  LETTER_G, LETTER_A, LETTER_M, LETTER_E, // GAME
];

// LIFE OF GAMEの各文字色（11文字それぞれ異なる色）
const BOTTOM_COLORS = [
  1,   // L: 赤
  2,   // I: オレンジ
  3,   // F: 黄色
  4,   // E: 黄緑
  0,   // スペース（使わない）
  5,   // O: 緑
  6,   // F: エメラルド
  0,   // スペース（使わない）
  7,   // G: シアン
  8,   // A: スカイブルー
  10,  // M: 紫
  12,  // E: ピンク
];

const LETTER_WIDTH = 5;
const LETTER_HEIGHT = 7;
const LETTER_SPACING = 1; // 文字間スペース
const WORD_SPACING = 2;   // 単語間スペース（スペース用）
const HEART_SIZE = 7;
const HEART_SPACING = 2; // ハートと文字の間隔

// 色インデックス
const BLUE_COLOR_INDEX = 9; // 青（パレットインデックス9）

/**
 * BASE ロゴの初期セル配置を生成
 * - 中央に36x36の青い四角
 * - 上部に「♥ BASE ♥」（ハートはカラフル、文字は1文字ずつ異なる色）
 * - 下部に「LIFE OF GAME」（各文字異なる色）
 */
export function generateBaseLogoCells(): Cell[] {
  const cells: Cell[] = [];

  // 青い四角のサイズと位置
  const squareSize = 36;
  const squareX = Math.floor((BOARD_SIZE - squareSize) / 2); // 中央配置
  const squareY = Math.floor((BOARD_SIZE - squareSize) / 2);

  // 1. 青い四角を生成
  for (let dy = 0; dy < squareSize; dy++) {
    for (let dx = 0; dx < squareSize; dx++) {
      cells.push({
        x: squareX + dx,
        y: squareY + dy,
        colorIndex: BLUE_COLOR_INDEX,
      });
    }
  }

  // ===== 上部ロゴ「♥ BASE ♥」=====
  // 全体幅 = ハート + 間隔 + BASE文字 + 間隔 + ハート
  const topTextWidth = BASE_LETTERS.length * LETTER_WIDTH + (BASE_LETTERS.length - 1) * LETTER_SPACING;
  const topLogoWidth = HEART_SIZE + HEART_SPACING + topTextWidth + HEART_SPACING + HEART_SIZE;
  const topLogoStartX = squareX + Math.floor((squareSize - topLogoWidth) / 2);
  // 四角の上端から2ピクセル上に配置
  const topLogoStartY = squareY - LETTER_HEIGHT - 2;

  // 2. 左側のハートを描画
  const leftHeartX = topLogoStartX;
  const leftHeartY = topLogoStartY;
  for (let row = 0; row < HEART_SIZE; row++) {
    for (let col = 0; col < HEART_SIZE; col++) {
      const colorKey = HEART_PATTERN[row][col];
      if (colorKey > 0) {
        const x = leftHeartX + col;
        const y = leftHeartY + row;
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
          cells.push({
            x,
            y,
            colorIndex: HEART_COLORS[colorKey],
          });
        }
      }
    }
  }

  // 3. BASE文字を描画
  const topTextStartX = topLogoStartX + HEART_SIZE + HEART_SPACING;
  const topTextStartY = topLogoStartY;

  for (let letterIndex = 0; letterIndex < BASE_LETTERS.length; letterIndex++) {
    const letter = BASE_LETTERS[letterIndex];
    const letterX = topTextStartX + letterIndex * (LETTER_WIDTH + LETTER_SPACING);
    const letterColor = BASE_COLORS[letterIndex];

    for (let row = 0; row < LETTER_HEIGHT; row++) {
      for (let col = 0; col < LETTER_WIDTH; col++) {
        if (letter[row][col] === 1) {
          const x = letterX + col;
          const y = topTextStartY + row;

          if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
            cells.push({
              x,
              y,
              colorIndex: letterColor,
            });
          }
        }
      }
    }
  }

  // 4. 右側のハートを描画
  const rightHeartX = topTextStartX + topTextWidth + HEART_SPACING;
  const rightHeartY = topLogoStartY;
  for (let row = 0; row < HEART_SIZE; row++) {
    for (let col = 0; col < HEART_SIZE; col++) {
      const colorKey = HEART_PATTERN[row][col];
      if (colorKey > 0) {
        const x = rightHeartX + col;
        const y = rightHeartY + row;
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
          cells.push({
            x,
            y,
            colorIndex: HEART_COLORS[colorKey],
          });
        }
      }
    }
  }

  // ===== 下部ロゴ「LIFE OF GAME」=====
  // 全体幅を計算（文字11個 + スペース2個）
  // LIFE(4文字) + スペース + OF(2文字) + スペース + GAME(4文字) = 10文字分 + スペース2個分
  const letterCount = 10; // 実際の文字数
  const spaceCount = 2;   // スペース数
  const bottomTextWidth = letterCount * LETTER_WIDTH + (letterCount - 1 + spaceCount) * LETTER_SPACING + spaceCount * (WORD_SPACING - LETTER_SPACING);
  const bottomLogoStartX = Math.floor((BOARD_SIZE - bottomTextWidth) / 2);
  // 四角の下端から2ピクセル下に配置
  const bottomLogoStartY = squareY + squareSize + 2;

  // 5. LIFE OF GAME文字を描画
  let currentX = bottomLogoStartX;
  for (let i = 0; i < BOTTOM_LETTERS.length; i++) {
    const letter = BOTTOM_LETTERS[i];

    if (letter === null) {
      // スペース
      currentX += WORD_SPACING;
    } else {
      const letterColor = BOTTOM_COLORS[i];

      for (let row = 0; row < LETTER_HEIGHT; row++) {
        for (let col = 0; col < LETTER_WIDTH; col++) {
          if (letter[row][col] === 1) {
            const x = currentX + col;
            const y = bottomLogoStartY + row;

            if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
              cells.push({
                x,
                y,
                colorIndex: letterColor,
              });
            }
          }
        }
      }
      currentX += LETTER_WIDTH + LETTER_SPACING;
    }
  }

  return cells;
}
