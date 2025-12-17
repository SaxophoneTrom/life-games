// ============================================
// スタンプデータ - 16×16 ドット絵テンプレート
// ============================================

/**
 * スタンプテンプレート型
 * 色は含まず、形状（相対座標）のみを定義
 */
export interface StampTemplate {
  id: string;
  name: string;
  icon: string;
  width: number;
  height: number;
  pixels: { dx: number; dy: number }[];
}

/**
 * スタンプを適用してセル配列を生成
 */
export function applyStamp(
  template: StampTemplate,
  x: number,
  y: number,
  colorIndex: number
): { x: number; y: number; colorIndex: number }[] {
  return template.pixels.map((p) => ({
    x: x + p.dx,
    y: y + p.dy,
    colorIndex,
  }));
}

// ============================================
// スタンプテンプレート定義（16×16）
// ============================================

/**
 * ハート ❤️
 */
const heartStamp: StampTemplate = {
  id: 'heart',
  name: 'Heart',
  icon: '❤️',
  width: 14,
  height: 12,
  pixels: [
    // Row 0
    { dx: 2, dy: 0 }, { dx: 3, dy: 0 }, { dx: 4, dy: 0 },
    { dx: 9, dy: 0 }, { dx: 10, dy: 0 }, { dx: 11, dy: 0 },
    // Row 1
    { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 3, dy: 1 }, { dx: 4, dy: 1 }, { dx: 5, dy: 1 },
    { dx: 8, dy: 1 }, { dx: 9, dy: 1 }, { dx: 10, dy: 1 }, { dx: 11, dy: 1 }, { dx: 12, dy: 1 },
    // Row 2
    { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 }, { dx: 3, dy: 2 }, { dx: 4, dy: 2 }, { dx: 5, dy: 2 }, { dx: 6, dy: 2 },
    { dx: 7, dy: 2 }, { dx: 8, dy: 2 }, { dx: 9, dy: 2 }, { dx: 10, dy: 2 }, { dx: 11, dy: 2 }, { dx: 12, dy: 2 }, { dx: 13, dy: 2 },
    // Row 3
    { dx: 0, dy: 3 }, { dx: 1, dy: 3 }, { dx: 2, dy: 3 }, { dx: 3, dy: 3 }, { dx: 4, dy: 3 }, { dx: 5, dy: 3 }, { dx: 6, dy: 3 },
    { dx: 7, dy: 3 }, { dx: 8, dy: 3 }, { dx: 9, dy: 3 }, { dx: 10, dy: 3 }, { dx: 11, dy: 3 }, { dx: 12, dy: 3 }, { dx: 13, dy: 3 },
    // Row 4
    { dx: 0, dy: 4 }, { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: 3, dy: 4 }, { dx: 4, dy: 4 }, { dx: 5, dy: 4 }, { dx: 6, dy: 4 },
    { dx: 7, dy: 4 }, { dx: 8, dy: 4 }, { dx: 9, dy: 4 }, { dx: 10, dy: 4 }, { dx: 11, dy: 4 }, { dx: 12, dy: 4 }, { dx: 13, dy: 4 },
    // Row 5
    { dx: 1, dy: 5 }, { dx: 2, dy: 5 }, { dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }, { dx: 6, dy: 5 },
    { dx: 7, dy: 5 }, { dx: 8, dy: 5 }, { dx: 9, dy: 5 }, { dx: 10, dy: 5 }, { dx: 11, dy: 5 }, { dx: 12, dy: 5 },
    // Row 6
    { dx: 2, dy: 6 }, { dx: 3, dy: 6 }, { dx: 4, dy: 6 }, { dx: 5, dy: 6 }, { dx: 6, dy: 6 },
    { dx: 7, dy: 6 }, { dx: 8, dy: 6 }, { dx: 9, dy: 6 }, { dx: 10, dy: 6 }, { dx: 11, dy: 6 },
    // Row 7
    { dx: 3, dy: 7 }, { dx: 4, dy: 7 }, { dx: 5, dy: 7 }, { dx: 6, dy: 7 },
    { dx: 7, dy: 7 }, { dx: 8, dy: 7 }, { dx: 9, dy: 7 }, { dx: 10, dy: 7 },
    // Row 8
    { dx: 4, dy: 8 }, { dx: 5, dy: 8 }, { dx: 6, dy: 8 },
    { dx: 7, dy: 8 }, { dx: 8, dy: 8 }, { dx: 9, dy: 8 },
    // Row 9
    { dx: 5, dy: 9 }, { dx: 6, dy: 9 }, { dx: 7, dy: 9 }, { dx: 8, dy: 9 },
    // Row 10
    { dx: 6, dy: 10 }, { dx: 7, dy: 10 },
    // Row 11
    { dx: 6, dy: 11 },
  ],
};

/**
 * スマイル 😊
 */
const smileStamp: StampTemplate = {
  id: 'smile',
  name: 'Smile',
  icon: '😊',
  width: 14,
  height: 14,
  pixels: [
    // 外枠（円形）
    // Row 0
    { dx: 4, dy: 0 }, { dx: 5, dy: 0 }, { dx: 6, dy: 0 }, { dx: 7, dy: 0 }, { dx: 8, dy: 0 }, { dx: 9, dy: 0 },
    // Row 1
    { dx: 2, dy: 1 }, { dx: 3, dy: 1 }, { dx: 10, dy: 1 }, { dx: 11, dy: 1 },
    // Row 2
    { dx: 1, dy: 2 }, { dx: 12, dy: 2 },
    // Row 3
    { dx: 0, dy: 3 }, { dx: 13, dy: 3 },
    // Row 4-9 sides
    { dx: 0, dy: 4 }, { dx: 13, dy: 4 },
    { dx: 0, dy: 5 }, { dx: 13, dy: 5 },
    { dx: 0, dy: 6 }, { dx: 13, dy: 6 },
    { dx: 0, dy: 7 }, { dx: 13, dy: 7 },
    { dx: 0, dy: 8 }, { dx: 13, dy: 8 },
    { dx: 0, dy: 9 }, { dx: 13, dy: 9 },
    // Row 10
    { dx: 0, dy: 10 }, { dx: 13, dy: 10 },
    // Row 11
    { dx: 1, dy: 11 }, { dx: 12, dy: 11 },
    // Row 12
    { dx: 2, dy: 12 }, { dx: 3, dy: 12 }, { dx: 10, dy: 12 }, { dx: 11, dy: 12 },
    // Row 13
    { dx: 4, dy: 13 }, { dx: 5, dy: 13 }, { dx: 6, dy: 13 }, { dx: 7, dy: 13 }, { dx: 8, dy: 13 }, { dx: 9, dy: 13 },
    // 目（左）
    { dx: 4, dy: 4 }, { dx: 5, dy: 4 },
    { dx: 4, dy: 5 }, { dx: 5, dy: 5 },
    // 目（右）
    { dx: 8, dy: 4 }, { dx: 9, dy: 4 },
    { dx: 8, dy: 5 }, { dx: 9, dy: 5 },
    // 口（笑顔）
    { dx: 3, dy: 8 }, { dx: 10, dy: 8 },
    { dx: 4, dy: 9 }, { dx: 9, dy: 9 },
    { dx: 5, dy: 10 }, { dx: 6, dy: 10 }, { dx: 7, dy: 10 }, { dx: 8, dy: 10 },
  ],
};

/**
 * 星 ⭐
 */
const starStamp: StampTemplate = {
  id: 'star',
  name: 'Star',
  icon: '⭐',
  width: 15,
  height: 14,
  pixels: [
    // 上部
    { dx: 7, dy: 0 },
    { dx: 6, dy: 1 }, { dx: 7, dy: 1 }, { dx: 8, dy: 1 },
    { dx: 6, dy: 2 }, { dx: 7, dy: 2 }, { dx: 8, dy: 2 },
    { dx: 5, dy: 3 }, { dx: 6, dy: 3 }, { dx: 7, dy: 3 }, { dx: 8, dy: 3 }, { dx: 9, dy: 3 },
    // 横広がり
    { dx: 0, dy: 4 }, { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: 3, dy: 4 }, { dx: 4, dy: 4 }, { dx: 5, dy: 4 }, { dx: 6, dy: 4 }, { dx: 7, dy: 4 }, { dx: 8, dy: 4 }, { dx: 9, dy: 4 }, { dx: 10, dy: 4 }, { dx: 11, dy: 4 }, { dx: 12, dy: 4 }, { dx: 13, dy: 4 }, { dx: 14, dy: 4 },
    { dx: 1, dy: 5 }, { dx: 2, dy: 5 }, { dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }, { dx: 6, dy: 5 }, { dx: 7, dy: 5 }, { dx: 8, dy: 5 }, { dx: 9, dy: 5 }, { dx: 10, dy: 5 }, { dx: 11, dy: 5 }, { dx: 12, dy: 5 }, { dx: 13, dy: 5 },
    // 中央
    { dx: 2, dy: 6 }, { dx: 3, dy: 6 }, { dx: 4, dy: 6 }, { dx: 5, dy: 6 }, { dx: 6, dy: 6 }, { dx: 7, dy: 6 }, { dx: 8, dy: 6 }, { dx: 9, dy: 6 }, { dx: 10, dy: 6 }, { dx: 11, dy: 6 }, { dx: 12, dy: 6 },
    { dx: 3, dy: 7 }, { dx: 4, dy: 7 }, { dx: 5, dy: 7 }, { dx: 6, dy: 7 }, { dx: 7, dy: 7 }, { dx: 8, dy: 7 }, { dx: 9, dy: 7 }, { dx: 10, dy: 7 }, { dx: 11, dy: 7 },
    // 下部分岐
    { dx: 3, dy: 8 }, { dx: 4, dy: 8 }, { dx: 5, dy: 8 }, { dx: 6, dy: 8 }, { dx: 7, dy: 8 }, { dx: 8, dy: 8 }, { dx: 9, dy: 8 }, { dx: 10, dy: 8 }, { dx: 11, dy: 8 },
    { dx: 2, dy: 9 }, { dx: 3, dy: 9 }, { dx: 4, dy: 9 }, { dx: 5, dy: 9 }, { dx: 9, dy: 9 }, { dx: 10, dy: 9 }, { dx: 11, dy: 9 }, { dx: 12, dy: 9 },
    { dx: 1, dy: 10 }, { dx: 2, dy: 10 }, { dx: 3, dy: 10 }, { dx: 4, dy: 10 }, { dx: 10, dy: 10 }, { dx: 11, dy: 10 }, { dx: 12, dy: 10 }, { dx: 13, dy: 10 },
    { dx: 0, dy: 11 }, { dx: 1, dy: 11 }, { dx: 2, dy: 11 }, { dx: 3, dy: 11 }, { dx: 11, dy: 11 }, { dx: 12, dy: 11 }, { dx: 13, dy: 11 }, { dx: 14, dy: 11 },
    { dx: 0, dy: 12 }, { dx: 1, dy: 12 }, { dx: 2, dy: 12 }, { dx: 12, dy: 12 }, { dx: 13, dy: 12 }, { dx: 14, dy: 12 },
    { dx: 0, dy: 13 }, { dx: 1, dy: 13 }, { dx: 13, dy: 13 }, { dx: 14, dy: 13 },
  ],
};

/**
 * リンゴ 🍎
 */
const appleStamp: StampTemplate = {
  id: 'apple',
  name: 'Apple',
  icon: '🍎',
  width: 12,
  height: 14,
  pixels: [
    // 茎
    { dx: 6, dy: 0 },
    { dx: 6, dy: 1 },
    // 葉
    { dx: 7, dy: 1 }, { dx: 8, dy: 1 },
    { dx: 8, dy: 2 }, { dx: 9, dy: 2 },
    // 上部
    { dx: 3, dy: 2 }, { dx: 4, dy: 2 }, { dx: 5, dy: 2 },
    { dx: 2, dy: 3 }, { dx: 3, dy: 3 }, { dx: 4, dy: 3 }, { dx: 5, dy: 3 }, { dx: 6, dy: 3 }, { dx: 7, dy: 3 }, { dx: 8, dy: 3 },
    // 本体
    { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: 3, dy: 4 }, { dx: 4, dy: 4 }, { dx: 5, dy: 4 }, { dx: 6, dy: 4 }, { dx: 7, dy: 4 }, { dx: 8, dy: 4 }, { dx: 9, dy: 4 },
    { dx: 0, dy: 5 }, { dx: 1, dy: 5 }, { dx: 2, dy: 5 }, { dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }, { dx: 6, dy: 5 }, { dx: 7, dy: 5 }, { dx: 8, dy: 5 }, { dx: 9, dy: 5 }, { dx: 10, dy: 5 },
    { dx: 0, dy: 6 }, { dx: 1, dy: 6 }, { dx: 2, dy: 6 }, { dx: 3, dy: 6 }, { dx: 4, dy: 6 }, { dx: 5, dy: 6 }, { dx: 6, dy: 6 }, { dx: 7, dy: 6 }, { dx: 8, dy: 6 }, { dx: 9, dy: 6 }, { dx: 10, dy: 6 }, { dx: 11, dy: 6 },
    { dx: 0, dy: 7 }, { dx: 1, dy: 7 }, { dx: 2, dy: 7 }, { dx: 3, dy: 7 }, { dx: 4, dy: 7 }, { dx: 5, dy: 7 }, { dx: 6, dy: 7 }, { dx: 7, dy: 7 }, { dx: 8, dy: 7 }, { dx: 9, dy: 7 }, { dx: 10, dy: 7 }, { dx: 11, dy: 7 },
    { dx: 0, dy: 8 }, { dx: 1, dy: 8 }, { dx: 2, dy: 8 }, { dx: 3, dy: 8 }, { dx: 4, dy: 8 }, { dx: 5, dy: 8 }, { dx: 6, dy: 8 }, { dx: 7, dy: 8 }, { dx: 8, dy: 8 }, { dx: 9, dy: 8 }, { dx: 10, dy: 8 }, { dx: 11, dy: 8 },
    { dx: 0, dy: 9 }, { dx: 1, dy: 9 }, { dx: 2, dy: 9 }, { dx: 3, dy: 9 }, { dx: 4, dy: 9 }, { dx: 5, dy: 9 }, { dx: 6, dy: 9 }, { dx: 7, dy: 9 }, { dx: 8, dy: 9 }, { dx: 9, dy: 9 }, { dx: 10, dy: 9 }, { dx: 11, dy: 9 },
    { dx: 0, dy: 10 }, { dx: 1, dy: 10 }, { dx: 2, dy: 10 }, { dx: 3, dy: 10 }, { dx: 4, dy: 10 }, { dx: 5, dy: 10 }, { dx: 6, dy: 10 }, { dx: 7, dy: 10 }, { dx: 8, dy: 10 }, { dx: 9, dy: 10 }, { dx: 10, dy: 10 }, { dx: 11, dy: 10 },
    // 下部
    { dx: 1, dy: 11 }, { dx: 2, dy: 11 }, { dx: 3, dy: 11 }, { dx: 4, dy: 11 }, { dx: 5, dy: 11 }, { dx: 6, dy: 11 }, { dx: 7, dy: 11 }, { dx: 8, dy: 11 }, { dx: 9, dy: 11 }, { dx: 10, dy: 11 },
    { dx: 2, dy: 12 }, { dx: 3, dy: 12 }, { dx: 4, dy: 12 }, { dx: 5, dy: 12 }, { dx: 6, dy: 12 }, { dx: 7, dy: 12 }, { dx: 8, dy: 12 }, { dx: 9, dy: 12 },
    { dx: 4, dy: 13 }, { dx: 5, dy: 13 }, { dx: 6, dy: 13 }, { dx: 7, dy: 13 },
  ],
};

/**
 * 月 🌙
 */
const moonStamp: StampTemplate = {
  id: 'moon',
  name: 'Moon',
  icon: '🌙',
  width: 14,
  height: 14,
  pixels: [
    // 外側の円弧
    { dx: 5, dy: 0 }, { dx: 6, dy: 0 }, { dx: 7, dy: 0 }, { dx: 8, dy: 0 }, { dx: 9, dy: 0 },
    { dx: 3, dy: 1 }, { dx: 4, dy: 1 }, { dx: 10, dy: 1 }, { dx: 11, dy: 1 },
    { dx: 2, dy: 2 }, { dx: 12, dy: 2 },
    { dx: 1, dy: 3 }, { dx: 13, dy: 3 },
    { dx: 0, dy: 4 },
    { dx: 0, dy: 5 },
    { dx: 0, dy: 6 },
    { dx: 0, dy: 7 },
    { dx: 0, dy: 8 },
    { dx: 0, dy: 9 },
    { dx: 1, dy: 10 }, { dx: 13, dy: 10 },
    { dx: 2, dy: 11 }, { dx: 12, dy: 11 },
    { dx: 3, dy: 12 }, { dx: 4, dy: 12 }, { dx: 10, dy: 12 }, { dx: 11, dy: 12 },
    { dx: 5, dy: 13 }, { dx: 6, dy: 13 }, { dx: 7, dy: 13 }, { dx: 8, dy: 13 }, { dx: 9, dy: 13 },
    // 内側（三日月の形）
    { dx: 4, dy: 3 }, { dx: 5, dy: 3 },
    { dx: 3, dy: 4 }, { dx: 4, dy: 4 },
    { dx: 2, dy: 5 }, { dx: 3, dy: 5 },
    { dx: 2, dy: 6 }, { dx: 3, dy: 6 },
    { dx: 2, dy: 7 }, { dx: 3, dy: 7 },
    { dx: 2, dy: 8 }, { dx: 3, dy: 8 },
    { dx: 3, dy: 9 }, { dx: 4, dy: 9 },
    { dx: 4, dy: 10 }, { dx: 5, dy: 10 },
  ],
};

/**
 * 太陽 ☀️（塗りつぶし円）
 */
const sunStamp: StampTemplate = {
  id: 'sun',
  name: 'Sun',
  icon: '☀️',
  width: 15,
  height: 15,
  pixels: [
    // 上の光線
    { dx: 7, dy: 0 },
    { dx: 7, dy: 1 },
    // 斜め光線（右上）
    { dx: 12, dy: 2 },
    { dx: 11, dy: 3 },
    // 斜め光線（左上）
    { dx: 2, dy: 2 },
    { dx: 3, dy: 3 },
    // 左の光線
    { dx: 0, dy: 7 },
    { dx: 1, dy: 7 },
    // 右の光線
    { dx: 13, dy: 7 },
    { dx: 14, dy: 7 },
    // 斜め光線（左下）
    { dx: 2, dy: 12 },
    { dx: 3, dy: 11 },
    // 斜め光線（右下）
    { dx: 12, dy: 12 },
    { dx: 11, dy: 11 },
    // 下の光線
    { dx: 7, dy: 13 },
    { dx: 7, dy: 14 },
    // 中心の円（塗りつぶし）
    { dx: 5, dy: 3 }, { dx: 6, dy: 3 }, { dx: 7, dy: 3 }, { dx: 8, dy: 3 }, { dx: 9, dy: 3 },
    { dx: 4, dy: 4 }, { dx: 5, dy: 4 }, { dx: 6, dy: 4 }, { dx: 7, dy: 4 }, { dx: 8, dy: 4 }, { dx: 9, dy: 4 }, { dx: 10, dy: 4 },
    { dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }, { dx: 6, dy: 5 }, { dx: 7, dy: 5 }, { dx: 8, dy: 5 }, { dx: 9, dy: 5 }, { dx: 10, dy: 5 }, { dx: 11, dy: 5 },
    { dx: 3, dy: 6 }, { dx: 4, dy: 6 }, { dx: 5, dy: 6 }, { dx: 6, dy: 6 }, { dx: 7, dy: 6 }, { dx: 8, dy: 6 }, { dx: 9, dy: 6 }, { dx: 10, dy: 6 }, { dx: 11, dy: 6 },
    { dx: 3, dy: 7 }, { dx: 4, dy: 7 }, { dx: 5, dy: 7 }, { dx: 6, dy: 7 }, { dx: 7, dy: 7 }, { dx: 8, dy: 7 }, { dx: 9, dy: 7 }, { dx: 10, dy: 7 }, { dx: 11, dy: 7 },
    { dx: 3, dy: 8 }, { dx: 4, dy: 8 }, { dx: 5, dy: 8 }, { dx: 6, dy: 8 }, { dx: 7, dy: 8 }, { dx: 8, dy: 8 }, { dx: 9, dy: 8 }, { dx: 10, dy: 8 }, { dx: 11, dy: 8 },
    { dx: 3, dy: 9 }, { dx: 4, dy: 9 }, { dx: 5, dy: 9 }, { dx: 6, dy: 9 }, { dx: 7, dy: 9 }, { dx: 8, dy: 9 }, { dx: 9, dy: 9 }, { dx: 10, dy: 9 }, { dx: 11, dy: 9 },
    { dx: 4, dy: 10 }, { dx: 5, dy: 10 }, { dx: 6, dy: 10 }, { dx: 7, dy: 10 }, { dx: 8, dy: 10 }, { dx: 9, dy: 10 }, { dx: 10, dy: 10 },
    { dx: 5, dy: 11 }, { dx: 6, dy: 11 }, { dx: 7, dy: 11 }, { dx: 8, dy: 11 }, { dx: 9, dy: 11 },
  ],
};

/**
 * 白抜きの円 ◯
 */
const circleStamp: StampTemplate = {
  id: 'circle',
  name: 'Circle',
  icon: '◯',
  width: 12,
  height: 12,
  pixels: [
    // Row 0
    { dx: 4, dy: 0 }, { dx: 5, dy: 0 }, { dx: 6, dy: 0 }, { dx: 7, dy: 0 },
    // Row 1
    { dx: 2, dy: 1 }, { dx: 3, dy: 1 }, { dx: 8, dy: 1 }, { dx: 9, dy: 1 },
    // Row 2
    { dx: 1, dy: 2 }, { dx: 10, dy: 2 },
    // Row 3
    { dx: 0, dy: 3 }, { dx: 11, dy: 3 },
    // Row 4-7 sides
    { dx: 0, dy: 4 }, { dx: 11, dy: 4 },
    { dx: 0, dy: 5 }, { dx: 11, dy: 5 },
    { dx: 0, dy: 6 }, { dx: 11, dy: 6 },
    { dx: 0, dy: 7 }, { dx: 11, dy: 7 },
    // Row 8
    { dx: 0, dy: 8 }, { dx: 11, dy: 8 },
    // Row 9
    { dx: 1, dy: 9 }, { dx: 10, dy: 9 },
    // Row 10
    { dx: 2, dy: 10 }, { dx: 3, dy: 10 }, { dx: 8, dy: 10 }, { dx: 9, dy: 10 },
    // Row 11
    { dx: 4, dy: 11 }, { dx: 5, dy: 11 }, { dx: 6, dy: 11 }, { dx: 7, dy: 11 },
  ],
};

/**
 * 塗りつぶしの正方形 ■ (36x36)
 */
const squareStamp: StampTemplate = {
  id: 'square',
  name: 'Square',
  icon: '■',
  width: 36,
  height: 36,
  pixels: (() => {
    const result: { dx: number; dy: number }[] = [];
    for (let y = 0; y < 36; y++) {
      for (let x = 0; x < 36; x++) {
        result.push({ dx: x, dy: y });
      }
    }
    return result;
  })(),
};

/**
 * 全スタンプ一覧
 */
export const STAMPS: StampTemplate[] = [
  heartStamp,
  smileStamp,
  starStamp,
  appleStamp,
  moonStamp,
  sunStamp,
  circleStamp,
  squareStamp,
];

/**
 * IDでスタンプを取得
 */
export function getStampById(id: string): StampTemplate | undefined {
  return STAMPS.find((s) => s.id === id);
}
