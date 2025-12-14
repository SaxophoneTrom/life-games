/**
 * Conway's Game of Life シミュレーションロジック
 *
 * ルール (B3/S23):
 * - 生存セルは2または3の隣接セルがあれば生存
 * - 死亡セルは3の隣接セルがあれば誕生
 *
 * グリッドサイズ: 20×20 (400セル)
 * シミュレーション世代数: 128
 */

export const GRID_SIZE = 20;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 400
export const MAX_GENERATIONS = 128;

export type Grid = boolean[][];

/**
 * 空のグリッドを作成
 */
export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => false)
  );
}

/**
 * グリッドをコピー
 */
export function copyGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

/**
 * 指定位置の隣接生存セル数をカウント
 * トーラス境界（上下左右がつながっている）
 */
function countNeighbors(grid: Grid, x: number, y: number): number {
  let count = 0;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;

      // トーラス境界の処理
      const nx = (x + dx + GRID_SIZE) % GRID_SIZE;
      const ny = (y + dy + GRID_SIZE) % GRID_SIZE;

      if (grid[ny][nx]) {
        count++;
      }
    }
  }

  return count;
}

/**
 * 1世代進める
 */
export function nextGeneration(grid: Grid, wallMask?: Grid): Grid {
  const newGrid = createEmptyGrid();

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // 壁セルは常に死亡状態
      if (wallMask && wallMask[y][x]) {
        newGrid[y][x] = false;
        continue;
      }

      const neighbors = countNeighbors(grid, x, y);
      const isAlive = grid[y][x];

      if (isAlive) {
        // 生存ルール: 2または3の隣接セルで生存
        newGrid[y][x] = neighbors === 2 || neighbors === 3;
      } else {
        // 誕生ルール: 正確に3の隣接セルで誕生
        newGrid[y][x] = neighbors === 3;
      }
    }
  }

  return newGrid;
}

/**
 * 指定世代までシミュレーション実行
 * 全世代の履歴を返す
 */
export function runSimulation(
  initialGrid: Grid,
  generations: number = MAX_GENERATIONS,
  wallMask?: Grid
): Grid[] {
  const history: Grid[] = [copyGrid(initialGrid)];
  let currentGrid = initialGrid;

  for (let i = 0; i < generations; i++) {
    currentGrid = nextGeneration(currentGrid, wallMask);
    history.push(copyGrid(currentGrid));
  }

  return history;
}

/**
 * グリッドの生存セル数をカウント
 */
export function countAliveCells(grid: Grid): number {
  let count = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x]) {
        count++;
      }
    }
  }

  return count;
}

/**
 * スコア計算
 *
 * baseScore = 400 - |finalAlive - targetAlive|
 * ぴったり賞: +100
 * 最高スコア: 500
 */
export function calculateScore(finalAlive: number, targetAlive: number): number {
  const distance = Math.abs(finalAlive - targetAlive);
  const baseScore = 400 - distance;

  // ぴったり賞ボーナス
  if (finalAlive === targetAlive) {
    return baseScore + 100;
  }

  return baseScore;
}

/**
 * 128世代後のスコアを計算
 */
export function simulateAndScore(
  initialGrid: Grid,
  targetAlive: number,
  wallMask?: Grid
): { finalAlive: number; score: number; finalGrid: Grid } {
  const history = runSimulation(initialGrid, MAX_GENERATIONS, wallMask);
  const finalGrid = history[history.length - 1];
  const finalAlive = countAliveCells(finalGrid);
  const score = calculateScore(finalAlive, targetAlive);

  return { finalAlive, score, finalGrid };
}

/**
 * グリッドを1次元配列に変換（行優先）
 */
export function gridToFlatArray(grid: Grid): boolean[] {
  const flat: boolean[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      flat.push(grid[y][x]);
    }
  }

  return flat;
}

/**
 * 1次元配列からグリッドに変換
 */
export function flatArrayToGrid(flat: boolean[]): Grid {
  const grid = createEmptyGrid();

  for (let i = 0; i < flat.length && i < TOTAL_CELLS; i++) {
    const y = Math.floor(i / GRID_SIZE);
    const x = i % GRID_SIZE;
    grid[y][x] = flat[i];
  }

  return grid;
}

/**
 * 2つのグリッドが同じかどうか比較
 */
export function gridsEqual(grid1: Grid, grid2: Grid): boolean {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid1[y][x] !== grid2[y][x]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * グリッドが定常状態（変化なし）かどうかチェック
 */
export function isStable(grid: Grid, wallMask?: Grid): boolean {
  const next = nextGeneration(grid, wallMask);
  return gridsEqual(grid, next);
}

/**
 * グリッドが振動パターン（2世代で元に戻る）かどうかチェック
 */
export function isOscillating(grid: Grid, wallMask?: Grid): boolean {
  const gen1 = nextGeneration(grid, wallMask);
  const gen2 = nextGeneration(gen1, wallMask);
  return gridsEqual(grid, gen2);
}
