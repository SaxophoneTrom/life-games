'use client';

import { useMemo } from 'react';
import { BoardState, Segment, BOARD_SIZE } from '@/types';
import { createEmptyBoard, setCell } from '@/lib/life-engine';

/**
 * 開発用モックデータ
 * 実際のAPI/Supabase連携前のUI確認用
 */

// 簡易シード付き疑似乱数（決定論的）
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// ランダムなボード状態を生成
export function generateRandomBoard(density: number = 0.1): BoardState {
  const state = createEmptyBoard();

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (Math.random() < density) {
        const colorIndex = Math.floor(Math.random() * 16);
        setCell(state, x, y, true, colorIndex);
      }
    }
  }

  state.generation = Math.floor(Math.random() * 10000);
  return state;
}

// グライダーパターンを生成（決定論的）
export function generateGliderBoard(): BoardState {
  const state = createEmptyBoard();
  state.generation = 1234;
  const rand = seededRandom(54321); // 固定シード

  // 中央付近に複数のグライダー（64×64に合わせて座標調整）
  const gliders = [
    { x: 10, y: 10 },
    { x: 30, y: 20 },
    { x: 50, y: 40 },
    { x: 20, y: 50 },
  ];

  for (let idx = 0; idx < gliders.length; idx++) {
    const pos = gliders[idx];
    const colorBase = (idx * 3 + 1) % 16; // 決定論的な色
    // グライダーパターン
    setCell(state, pos.x + 1, pos.y, true, colorBase);
    setCell(state, pos.x + 2, pos.y + 1, true, (colorBase + 1) % 16);
    setCell(state, pos.x, pos.y + 2, true, (colorBase + 2) % 16);
    setCell(state, pos.x + 1, pos.y + 2, true, colorBase);
    setCell(state, pos.x + 2, pos.y + 2, true, (colorBase + 1) % 16);
  }

  // 決定論的なセルを追加
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(rand() * BOARD_SIZE);
    const y = Math.floor(rand() * BOARD_SIZE);
    const colorIndex = Math.floor(rand() * 15) + 1; // 1-15（0は背景色）
    setCell(state, x, y, true, colorIndex);
  }

  return state;
}

// モックセグメントを生成（決定論的・新仕様: 空盤面起点、即確定mint）
export function generateMockSegments(count: number): Segment[] {
  const segments: Segment[] = [];
  const rand = seededRandom(12345); // 固定シード

  for (let i = 1; i <= count; i++) {
    const nGen = Math.floor(rand() * 21) + 10; // 10-30（新仕様）
    const cellCount = Math.floor(nGen / 2); // maxCells = floor(nGen / 2)

    // 決定論的な注入セルを生成
    const injectedCells = [];
    for (let j = 0; j < cellCount; j++) {
      injectedCells.push({
        x: Math.floor(rand() * BOARD_SIZE),
        y: Math.floor(rand() * BOARD_SIZE),
        colorIndex: Math.floor(rand() * 15) + 1, // 1-15
      });
    }

    segments.push({
      id: i,
      tokenId: i,
      minter: `0x${i.toString(16).padStart(40, '0')}`, // 決定論的なアドレス
      fid: 1000 + i,
      nGenerations: nGen,
      injectedCells,
      cellsHash: `0x${(i * 12345).toString(16).padStart(64, '0')}`, // ダミーハッシュ
      mintedAt: 1000000 + i * 100, // ダミーブロック番号
      createdAt: new Date(1702500000000 - i * 3600000), // 固定の基準時刻から計算
    });
  }

  return segments.reverse(); // 新しい順
}

// フック版
export function useMockBoard() {
  return useMemo(() => generateGliderBoard(), []);
}

// 空盤面を返すフック（新仕様: SegmentNFTは空盤面起点）
export function useEmptyBoard() {
  return useMemo(() => createEmptyBoard(), []);
}

export function useMockSegments(count: number = 10) {
  return useMemo(() => generateMockSegments(count), [count]);
}
