// ============================================
// Conway's Game of Life エンジン - 決定論的実装
// ============================================

import { BOARD_SIZE, Cell, BoardState } from '@/types';
import { calculateBirthColor, calculateSurvivalColor } from './color-rules';

/**
 * ボード座標からビットセットインデックスを計算
 */
export function coordToIndex(x: number, y: number): number {
  return y * BOARD_SIZE + x;
}

/**
 * ビットセットインデックスからボード座標を計算
 */
export function indexToCoord(index: number): { x: number; y: number } {
  return {
    x: index % BOARD_SIZE,
    y: Math.floor(index / BOARD_SIZE),
  };
}

/**
 * セルが生きているかチェック
 */
export function isAlive(state: BoardState, x: number, y: number): boolean {
  const index = coordToIndex(x, y);
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  return (state.aliveBitset[byteIndex] & (1 << bitIndex)) !== 0;
}

/**
 * セルの色インデックスを取得
 */
export function getColor(state: BoardState, x: number, y: number): number {
  const index = coordToIndex(x, y);
  const byteIndex = Math.floor(index / 2);
  const isHighNibble = index % 2 === 1;

  if (isHighNibble) {
    return (state.colorNibbles[byteIndex] >> 4) & 0x0f;
  } else {
    return state.colorNibbles[byteIndex] & 0x0f;
  }
}

/**
 * セルを設定
 */
export function setCell(
  state: BoardState,
  x: number,
  y: number,
  alive: boolean,
  colorIndex: number
): void {
  const index = coordToIndex(x, y);

  // alive bitset
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  if (alive) {
    state.aliveBitset[byteIndex] |= 1 << bitIndex;
  } else {
    state.aliveBitset[byteIndex] &= ~(1 << bitIndex);
  }

  // color nibbles
  const colorByteIndex = Math.floor(index / 2);
  const isHighNibble = index % 2 === 1;
  if (isHighNibble) {
    state.colorNibbles[colorByteIndex] =
      (state.colorNibbles[colorByteIndex] & 0x0f) | ((colorIndex & 0x0f) << 4);
  } else {
    state.colorNibbles[colorByteIndex] =
      (state.colorNibbles[colorByteIndex] & 0xf0) | (colorIndex & 0x0f);
  }
}

/**
 * 空のボード状態を作成
 */
export function createEmptyBoard(): BoardState {
  return {
    generation: 0,
    aliveBitset: new Uint8Array(512), // 4,096 bits = 512 bytes (64×64)
    colorNibbles: new Uint8Array(2048), // 4,096 * 4 bits = 2,048 bytes
  };
}

/**
 * ボード状態をクローン
 */
export function cloneBoard(state: BoardState): BoardState {
  return {
    generation: state.generation,
    aliveBitset: new Uint8Array(state.aliveBitset),
    colorNibbles: new Uint8Array(state.colorNibbles),
  };
}

/**
 * Moore近傍（8方向）の座標を取得
 * トーラストポロジー（端は反対側に繋がる）
 */
function getNeighbors(x: number, y: number): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      // トーラストポロジー: 端は反対側に繋がる
      const nx = (x + dx + BOARD_SIZE) % BOARD_SIZE;
      const ny = (y + dy + BOARD_SIZE) % BOARD_SIZE;
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

/**
 * 1世代進める（決定論的）
 * ルール: Birth: 3, Survival: 2-3
 */
export function stepGeneration(state: BoardState): BoardState {
  const newState = createEmptyBoard();
  newState.generation = state.generation + 1;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const neighbors = getNeighbors(x, y);
      const aliveNeighbors: { x: number; y: number; colorIndex: number }[] = [];

      // 生きている隣接セルをカウント
      for (const n of neighbors) {
        if (isAlive(state, n.x, n.y)) {
          aliveNeighbors.push({
            ...n,
            colorIndex: getColor(state, n.x, n.y),
          });
        }
      }

      const neighborCount = aliveNeighbors.length;
      const currentlyAlive = isAlive(state, x, y);

      if (currentlyAlive) {
        // Survival: 2-3 neighbors
        if (neighborCount === 2 || neighborCount === 3) {
          const currentColor = getColor(state, x, y);
          const neighborColors = aliveNeighbors.map((n) => n.colorIndex);
          const newColor = calculateSurvivalColor(currentColor, neighborColors);
          setCell(newState, x, y, true, newColor);
        }
        // else: 死亡（残光なし）
      } else {
        // Birth: exactly 3 neighbors
        if (neighborCount === 3) {
          const parentColors = aliveNeighbors.map((n) => n.colorIndex);
          const newColor = calculateBirthColor(parentColors);
          setCell(newState, x, y, true, newColor);
        }
      }
    }
  }

  return newState;
}

/**
 * セルを注入
 */
export function injectCells(state: BoardState, cells: Cell[]): BoardState {
  const newState = cloneBoard(state);

  for (const cell of cells) {
    if (cell.x >= 0 && cell.x < BOARD_SIZE && cell.y >= 0 && cell.y < BOARD_SIZE) {
      setCell(newState, cell.x, cell.y, true, cell.colorIndex);
    }
  }

  return newState;
}

/**
 * 複数世代を進める
 */
export function runGenerations(
  state: BoardState,
  numGenerations: number
): BoardState[] {
  const states: BoardState[] = [state];
  let current = state;

  for (let i = 0; i < numGenerations; i++) {
    current = stepGeneration(current);
    states.push(current);
  }

  return states;
}

/**
 * 生きているセル数をカウント
 */
export function countAliveCells(state: BoardState): number {
  let count = 0;
  for (let i = 0; i < state.aliveBitset.length; i++) {
    let byte = state.aliveBitset[i];
    while (byte) {
      count += byte & 1;
      byte >>= 1;
    }
  }
  return count;
}

/**
 * 生きているセルのリストを取得
 */
export function getAliveCells(state: BoardState): Cell[] {
  const cells: Cell[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isAlive(state, x, y)) {
        cells.push({
          x,
          y,
          colorIndex: getColor(state, x, y),
        });
      }
    }
  }

  return cells;
}
