// ============================================
// Farcaster Infinite Life - 型定義
// ============================================

// ボード関連
export const BOARD_SIZE = 64;
export const PALETTE_SIZE = 16;

// セグメント世代数の範囲（コントラクトで変更可能）
export const MIN_GENERATIONS = 5;
export const MAX_GENERATIONS = 30;

// 16色パレット（0番は背景色=灰色、1-15はビビッドカラー）
export const PALETTE: readonly string[] = [
  '#2A2A2A', // 0: 背景（灰色）
  '#FF0000', // 1: 赤
  '#FF6600', // 2: オレンジ
  '#FFCC00', // 3: 黄色
  '#99FF00', // 4: 黄緑
  '#00FF00', // 5: 緑
  '#00FF99', // 6: エメラルド
  '#00FFFF', // 7: シアン
  '#0099FF', // 8: スカイブルー
  '#0000FF', // 9: 青
  '#6600FF', // 10: 紫
  '#CC00FF', // 11: マゼンタ
  '#FF00CC', // 12: ピンク
  '#FF0066', // 13: ローズ
  '#FFFFFF', // 14: 白
  '#FFD700', // 15: ゴールド
] as const;

// パレットのRGB値（カラールール計算用）
export const PALETTE_RGB: readonly [number, number, number][] = PALETTE.map((hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b] as [number, number, number];
});

// セル型
export interface Cell {
  x: number;
  y: number;
  colorIndex: number;
}

// ボード状態
export interface BoardState {
  generation: number;
  aliveBitset: Uint8Array; // 1,250 bytes (100×100 = 10,000 bits)
  colorNibbles: Uint8Array; // 5,000 bytes (10,000 × 4 bits)
}

// セグメント状態
export type SegmentStatus = 'pending' | 'revealed';

// セグメント情報
export interface Segment {
  id: number;
  tokenId: number;
  creator: string; // address
  fid: number;
  startGeneration: number;
  endGeneration: number;
  nGenerations: number;
  injectedCells: Cell[];
  status: SegmentStatus;
  mediaUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

// エポック情報
export interface Epoch {
  id: number;
  tokenId: number;
  startGeneration: number;
  endGeneration: number;
  finalized: boolean;
  mediaUrl?: string;
  contributors: string[]; // addresses
}

// 購入パラメータ
export interface PurchaseParams {
  nGenerations: number;
  cells: Cell[];
}

// 価格計算
export interface PriceConfig {
  baseFee: bigint;
  perGenFee: bigint;
  perCellFee: bigint;
}

// Farcaster User Context
export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}
