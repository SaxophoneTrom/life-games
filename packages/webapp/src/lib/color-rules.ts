// ============================================
// カラールール - 16色パレット決定論的処理
// ============================================

import { PALETTE_RGB, PALETTE_SIZE } from '@/types';

/**
 * RGB色間のユークリッド距離を計算
 */
function colorDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * RGB値から最も近いパレットインデックスを取得
 */
export function findNearestPaletteIndex(rgb: [number, number, number]): number {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < PALETTE_SIZE; i++) {
    const distance = colorDistance(rgb, PALETTE_RGB[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * 複数のカラーインデックスの平均RGB値を計算
 */
export function averageRGB(colorIndices: number[]): [number, number, number] {
  if (colorIndices.length === 0) {
    return [0, 0, 0];
  }

  let r = 0;
  let g = 0;
  let b = 0;

  for (const index of colorIndices) {
    const rgb = PALETTE_RGB[index];
    r += rgb[0];
    g += rgb[1];
    b += rgb[2];
  }

  const count = colorIndices.length;
  return [
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count),
  ];
}

/**
 * 誕生時の色を計算
 * 親の中から1つを決定論的に選択（座標ベースではなく、色インデックスの合計でソート後選択）
 * これにより平均化による中間色への収束を防ぐ
 */
export function calculateBirthColor(parentColorIndices: number[]): number {
  if (parentColorIndices.length === 0) {
    return 0;
  }

  // 決定論的選択: 色インデックスの合計を使って選択
  // ソートして最初の色を選ぶ（決定論的）
  const sorted = [...parentColorIndices].sort((a, b) => a - b);
  const sum = parentColorIndices.reduce((acc, c) => acc + c, 0);
  const selectedIndex = sum % sorted.length;
  return sorted[selectedIndex];
}

/**
 * 生存時の色を計算
 * 自身50% + 隣接平均50% → 最近接パレット色
 * （隣接色の影響を強めて色の変化を促進）
 */
export function calculateSurvivalColor(
  selfColorIndex: number,
  neighborColorIndices: number[]
): number {
  const selfRgb = PALETTE_RGB[selfColorIndex];
  const neighborAvgRgb = neighborColorIndices.length > 0
    ? averageRGB(neighborColorIndices)
    : selfRgb;

  // 50% self + 50% neighbor average（隣接色の影響を強める）
  const blendedRgb: [number, number, number] = [
    Math.round(selfRgb[0] * 0.5 + neighborAvgRgb[0] * 0.5),
    Math.round(selfRgb[1] * 0.5 + neighborAvgRgb[1] * 0.5),
    Math.round(selfRgb[2] * 0.5 + neighborAvgRgb[2] * 0.5),
  ];

  return findNearestPaletteIndex(blendedRgb);
}

/**
 * パレットインデックスからHex色文字列を取得
 */
export function getColorHex(colorIndex: number): string {
  const rgb = PALETTE_RGB[colorIndex];
  return `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
}
