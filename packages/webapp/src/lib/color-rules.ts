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
 * 3つの親セルのRGB平均 → 最近接パレット色
 */
export function calculateBirthColor(parentColorIndices: number[]): number {
  if (parentColorIndices.length !== 3) {
    // 安全策: 3つでない場合は最初の色を返す
    return parentColorIndices[0] || 0;
  }

  const avgRgb = averageRGB(parentColorIndices);
  return findNearestPaletteIndex(avgRgb);
}

/**
 * 生存時の色を計算
 * 自身75% + 隣接平均25% → 最近接パレット色
 */
export function calculateSurvivalColor(
  selfColorIndex: number,
  neighborColorIndices: number[]
): number {
  const selfRgb = PALETTE_RGB[selfColorIndex];
  const neighborAvgRgb = neighborColorIndices.length > 0
    ? averageRGB(neighborColorIndices)
    : selfRgb;

  // 75% self + 25% neighbor average
  const blendedRgb: [number, number, number] = [
    Math.round(selfRgb[0] * 0.75 + neighborAvgRgb[0] * 0.25),
    Math.round(selfRgb[1] * 0.75 + neighborAvgRgb[1] * 0.25),
    Math.round(selfRgb[2] * 0.75 + neighborAvgRgb[2] * 0.25),
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
