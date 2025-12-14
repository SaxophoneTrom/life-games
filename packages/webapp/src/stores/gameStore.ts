import { create } from "zustand";
import {
  type Grid,
  createEmptyGrid,
  copyGrid,
  countAliveCells,
  runSimulation,
  MAX_GENERATIONS,
  GRID_SIZE,
} from "@/lib/gameOfLife";
import { decodeBoard, encodeBoard, wallMaskToGrid } from "@/lib/boardEncoder";
import type { Season } from "@/types/game";

interface GameState {
  // ボード状態
  grid: Grid;
  wallMask: Grid | null;
  aliveCellCount: number;

  // シーズン情報
  currentSeason: Season | null;

  // シミュレーション
  simulationHistory: Grid[];
  isSimulating: boolean;

  // エディタ
  isDirty: boolean;

  // アクション
  setGrid: (grid: Grid) => void;
  toggleCell: (x: number, y: number) => void;
  clearGrid: () => void;
  randomizeGrid: (count: number) => void;
  loadBoard: (boardA: `0x${string}`, boardB: `0x${string}`) => void;

  // シーズン
  setSeason: (season: Season | null) => void;

  // シミュレーション
  runSimulation: () => void;
  clearSimulation: () => void;

  // エンコード
  getEncodedBoard: () => { boardA: `0x${string}`; boardB: `0x${string}` };

  // バリデーション
  isValidBoard: () => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  // 初期状態
  grid: createEmptyGrid(),
  wallMask: null,
  aliveCellCount: 0,
  currentSeason: null,
  simulationHistory: [],
  isSimulating: false,
  isDirty: false,

  // グリッド設定
  setGrid: (grid) => {
    set({
      grid: copyGrid(grid),
      aliveCellCount: countAliveCells(grid),
      isDirty: true,
      simulationHistory: [],
    });
  },

  // セルのトグル
  toggleCell: (x, y) => {
    const { grid, wallMask } = get();

    // 壁セルは変更不可
    if (wallMask && wallMask[y][x]) {
      return;
    }

    const newGrid = copyGrid(grid);
    newGrid[y][x] = !newGrid[y][x];

    set({
      grid: newGrid,
      aliveCellCount: countAliveCells(newGrid),
      isDirty: true,
      simulationHistory: [],
    });
  },

  // グリッドクリア
  clearGrid: () => {
    set({
      grid: createEmptyGrid(),
      aliveCellCount: 0,
      isDirty: true,
      simulationHistory: [],
    });
  },

  // ランダム配置
  randomizeGrid: (count) => {
    const { wallMask } = get();
    const newGrid = createEmptyGrid();

    // 壁以外のセル位置を収集
    const availableCells: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!wallMask || !wallMask[y][x]) {
          availableCells.push({ x, y });
        }
      }
    }

    // シャッフル
    for (let i = availableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }

    // 指定数だけセルを配置
    const toPlace = Math.min(count, availableCells.length);
    for (let i = 0; i < toPlace; i++) {
      const { x, y } = availableCells[i];
      newGrid[y][x] = true;
    }

    set({
      grid: newGrid,
      aliveCellCount: countAliveCells(newGrid),
      isDirty: true,
      simulationHistory: [],
    });
  },

  // bytes32からボード読み込み
  loadBoard: (boardA, boardB) => {
    const grid = decodeBoard(boardA, boardB);
    set({
      grid,
      aliveCellCount: countAliveCells(grid),
      isDirty: false,
      simulationHistory: [],
    });
  },

  // シーズン設定
  setSeason: (season) => {
    if (season) {
      const wallMask = wallMaskToGrid(season.wallA, season.wallB);
      set({ currentSeason: season, wallMask });
    } else {
      set({ currentSeason: null, wallMask: null });
    }
  },

  // シミュレーション実行
  runSimulation: () => {
    const { grid, wallMask } = get();
    set({ isSimulating: true });

    try {
      const history = runSimulation(grid, MAX_GENERATIONS, wallMask || undefined);
      set({ simulationHistory: history, isSimulating: false });
    } catch (error) {
      console.error("Simulation error:", error);
      set({ isSimulating: false });
    }
  },

  // シミュレーションクリア
  clearSimulation: () => {
    set({ simulationHistory: [] });
  },

  // エンコードされたボードを取得
  getEncodedBoard: () => {
    const { grid } = get();
    return encodeBoard(grid);
  },

  // ボードが有効かチェック
  isValidBoard: () => {
    const { aliveCellCount, currentSeason, wallMask, grid } = get();

    // シーズンがない場合は無効
    if (!currentSeason) {
      return false;
    }

    // 生存セル数が制約と一致するか
    if (aliveCellCount !== currentSeason.initialLiveCount) {
      return false;
    }

    // 壁との重複がないか
    if (wallMask) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] && wallMask[y][x]) {
            return false;
          }
        }
      }
    }

    return true;
  },
}));
