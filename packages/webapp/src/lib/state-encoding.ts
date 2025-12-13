// ============================================
// StateV1 エンコーディング - オンチェーン互換
// ============================================

import { BoardState, Cell, BOARD_SIZE } from '@/types';
import { createEmptyBoard, setCell, isAlive, getColor, coordToIndex } from './life-engine';

/**
 * StateV1 バイト構造:
 * - aliveBitset: 512 bytes (4,096 bits, row-major: i = y * 64 + x)
 * - colorNibbles: 2,048 bytes (4,096 * 4 bits, 2 cells per byte)
 * 合計: 2,560 bytes
 */

/**
 * BoardState を StateV1 バイト配列にエンコード
 */
export function encodeStateV1(state: BoardState): Uint8Array {
  const bytes = new Uint8Array(2560);

  // Copy aliveBitset (512 bytes)
  bytes.set(state.aliveBitset, 0);

  // Copy colorNibbles (2,048 bytes)
  bytes.set(state.colorNibbles, 512);

  return bytes;
}

/**
 * StateV1 バイト配列を BoardState にデコード
 */
export function decodeStateV1(bytes: Uint8Array, generation: number = 0): BoardState {
  if (bytes.length !== 2560) {
    throw new Error(`Invalid StateV1 length: expected 2560, got ${bytes.length}`);
  }

  return {
    generation,
    aliveBitset: bytes.slice(0, 512),
    colorNibbles: bytes.slice(512, 2560),
  };
}

/**
 * セルエンコーディング: 3バイト/セル（x, y, colorIndex）
 */
export function encodeCells(cells: Cell[]): Uint8Array {
  const bytes = new Uint8Array(cells.length * 3);

  for (let i = 0; i < cells.length; i++) {
    bytes[i * 3] = cells[i].x;
    bytes[i * 3 + 1] = cells[i].y;
    bytes[i * 3 + 2] = cells[i].colorIndex;
  }

  return bytes;
}

/**
 * セルエンコーディングをデコード
 */
export function decodeCells(bytes: Uint8Array): Cell[] {
  if (bytes.length % 3 !== 0) {
    throw new Error(`Invalid cells encoding length: ${bytes.length}`);
  }

  const cells: Cell[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    cells.push({
      x: bytes[i],
      y: bytes[i + 1],
      colorIndex: bytes[i + 2],
    });
  }

  return cells;
}

/**
 * セルをHex文字列にエンコード（コントラクト用）
 */
export function encodeCellsHex(cells: Cell[]): string {
  const bytes = encodeCells(cells);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex文字列からセルをデコード
 */
export function decodeCellsHex(hex: string): Cell[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  return decodeCells(bytes);
}

/**
 * keccak256ハッシュを計算（stateRoot用）
 * ブラウザ互換のため、viemを使用
 */
export async function calculateStateRoot(state: BoardState): Promise<string> {
  const { keccak256 } = await import('viem');
  const bytes = encodeStateV1(state);
  return keccak256(bytes);
}

/**
 * BoardStateをJSON形式にシリアライズ（ストレージ用）
 */
export function serializeBoardState(state: BoardState): string {
  return JSON.stringify({
    generation: state.generation,
    aliveBitset: Array.from(state.aliveBitset),
    colorNibbles: Array.from(state.colorNibbles),
  });
}

/**
 * JSON形式からBoardStateをデシリアライズ
 */
export function deserializeBoardState(json: string): BoardState {
  const data = JSON.parse(json);
  return {
    generation: data.generation,
    aliveBitset: new Uint8Array(data.aliveBitset),
    colorNibbles: new Uint8Array(data.colorNibbles),
  };
}

/**
 * Base64エンコード（API通信用）
 */
export function encodeStateBase64(state: BoardState): string {
  const bytes = encodeStateV1(state);
  if (typeof window !== 'undefined') {
    return btoa(String.fromCharCode(...bytes));
  }
  return Buffer.from(bytes).toString('base64');
}

/**
 * Base64デコード
 */
export function decodeStateBase64(base64: string, generation: number = 0): BoardState {
  let bytes: Uint8Array;

  if (typeof window !== 'undefined') {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  }

  return decodeStateV1(bytes, generation);
}
