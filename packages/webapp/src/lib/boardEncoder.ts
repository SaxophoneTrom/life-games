/**
 * ボードエンコード/デコード ユーティリティ
 *
 * 20×20グリッド = 400ビット を 2つの bytes32 (256ビット×2) で表現
 * boardA: bit 0-255 (セル0-255)
 * boardB: bit 0-143 (セル256-399)、上位112ビットは0
 */

import { type Grid, GRID_SIZE, TOTAL_CELLS, createEmptyGrid } from "./gameOfLife";

/**
 * グリッドを2つのbytes32（16進数文字列）にエンコード
 */
export function encodeBoard(grid: Grid): { boardA: `0x${string}`; boardB: `0x${string}` } {
  // グリッドを1次元ビット配列に変換（行優先）
  const bits: boolean[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      bits.push(grid[y][x]);
    }
  }

  // boardA: bit 0-255
  let boardA = 0n;
  for (let i = 0; i < 256 && i < bits.length; i++) {
    if (bits[i]) {
      boardA |= 1n << BigInt(i);
    }
  }

  // boardB: bit 0-143 (セル256-399)
  let boardB = 0n;
  for (let i = 256; i < TOTAL_CELLS; i++) {
    if (bits[i]) {
      boardB |= 1n << BigInt(i - 256);
    }
  }

  // bytes32形式（64文字の16進数）に変換
  const boardAHex = `0x${boardA.toString(16).padStart(64, "0")}` as `0x${string}`;
  const boardBHex = `0x${boardB.toString(16).padStart(64, "0")}` as `0x${string}`;

  return { boardA: boardAHex, boardB: boardBHex };
}

/**
 * 2つのbytes32からグリッドをデコード
 */
export function decodeBoard(boardA: `0x${string}`, boardB: `0x${string}`): Grid {
  const grid = createEmptyGrid();

  // bytes32をBigIntに変換
  const bitsA = BigInt(boardA);
  const bitsB = BigInt(boardB);

  // bit 0-255 からセル0-255を復元
  for (let i = 0; i < 256; i++) {
    const y = Math.floor(i / GRID_SIZE);
    const x = i % GRID_SIZE;
    grid[y][x] = ((bitsA >> BigInt(i)) & 1n) === 1n;
  }

  // bit 0-143 からセル256-399を復元
  for (let i = 256; i < TOTAL_CELLS; i++) {
    const y = Math.floor(i / GRID_SIZE);
    const x = i % GRID_SIZE;
    grid[y][x] = ((bitsB >> BigInt(i - 256)) & 1n) === 1n;
  }

  return grid;
}

/**
 * bytes32が有効な形式かチェック
 */
export function isValidBytes32(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * 2つのボードをANDして壁との重複をチェック
 * true = 重複あり
 */
export function hasWallOverlap(
  boardA: `0x${string}`,
  boardB: `0x${string}`,
  wallA: `0x${string}`,
  wallB: `0x${string}`
): boolean {
  const bitsA = BigInt(boardA);
  const bitsB = BigInt(boardB);
  const wallBitsA = BigInt(wallA);
  const wallBitsB = BigInt(wallB);

  // AND演算で重複チェック
  const overlapA = bitsA & wallBitsA;
  const overlapB = bitsB & wallBitsB;

  return overlapA !== 0n || overlapB !== 0n;
}

/**
 * bytes32形式のボードの生存セル数をカウント
 */
export function countBoardAliveCells(boardA: `0x${string}`, boardB: `0x${string}`): number {
  const bitsA = BigInt(boardA);
  const bitsB = BigInt(boardB);

  let count = 0;

  // boardA のビットカウント
  let tempA = bitsA;
  while (tempA > 0n) {
    if ((tempA & 1n) === 1n) count++;
    tempA >>= 1n;
  }

  // boardB のビットカウント（144ビットのみ）
  let tempB = bitsB;
  for (let i = 0; i < 144 && tempB > 0n; i++) {
    if ((tempB & 1n) === 1n) count++;
    tempB >>= 1n;
  }

  return count;
}

/**
 * 壁マスクをグリッドに変換
 */
export function wallMaskToGrid(wallA: `0x${string}`, wallB: `0x${string}`): Grid {
  return decodeBoard(wallA, wallB);
}

/**
 * 2つのボードが同じかどうか比較
 */
export function boardsEqual(
  boardA1: `0x${string}`,
  boardB1: `0x${string}`,
  boardA2: `0x${string}`,
  boardB2: `0x${string}`
): boolean {
  return (
    BigInt(boardA1) === BigInt(boardA2) &&
    BigInt(boardB1) === BigInt(boardB2)
  );
}

/**
 * ボードのハッシュを生成（重複チェック用）
 */
export function getBoardHash(boardA: `0x${string}`, boardB: `0x${string}`): string {
  return `${boardA.toLowerCase()}_${boardB.toLowerCase()}`;
}

/**
 * 空のボード（全て0）を取得
 */
export function getEmptyBoard(): { boardA: `0x${string}`; boardB: `0x${string}` } {
  return {
    boardA: `0x${"0".repeat(64)}` as `0x${string}`,
    boardB: `0x${"0".repeat(64)}` as `0x${string}`,
  };
}
