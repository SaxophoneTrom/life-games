// ============================================
// 価格計算
// ============================================

import { PriceConfig } from '@/types';

// デフォルト価格設定（コントラクトから取得する予定）
export const DEFAULT_PRICE_CONFIG: PriceConfig = {
  baseFee: BigInt('50000000000000'), // 0.00005 ETH
  perGenFee: BigInt('5000000000000'), // 0.000005 ETH
  perCellFee: BigInt('0'), // 0 ETH（初期設定でセル数課金なし）
};

/**
 * セグメント購入価格を計算
 * price = baseFee + (perGenFee * nGenerations) + (perCellFee * nCells)
 */
export function calculatePrice(
  nGenerations: number,
  nCells: number,
  config: PriceConfig = DEFAULT_PRICE_CONFIG
): bigint {
  const genCost = config.perGenFee * BigInt(nGenerations);
  const cellCost = config.perCellFee * BigInt(nCells);
  return config.baseFee + genCost + cellCost;
}

/**
 * BigIntをETH文字列に変換
 */
export function formatEth(wei: bigint, decimals: number = 6): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * ETH価格を表示用にフォーマット
 */
export function formatPrice(wei: bigint): string {
  return `${formatEth(wei)} ETH`;
}

/**
 * 最大注入セル数を計算
 * max = nGenerations * 9 = 世代数の9倍
 */
export function calculateMaxCells(nGenerations: number): number {
  return nGenerations * 9;
}
