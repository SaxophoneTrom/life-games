"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Grid as GridType,
  GRID_SIZE,
  MAX_GENERATIONS,
  countAliveCells,
  runSimulation,
  createEmptyGrid,
} from "@/lib/gameOfLife";

interface GameBoardProps {
  // 編集用グリッド
  grid: GridType;
  wallMask?: GridType | null;
  cellSize?: number;
  // セル数制限
  targetCellCount: number;
  targetAlive: number;
  // 編集コールバック
  onCellToggle: (x: number, y: number) => void;
  onClear: () => void;
  onRandom: () => void;
  // シミュレーション結果コールバック
  onSimulationComplete?: (result: SimulationResult) => void;
  className?: string;
}

export interface SimulationResult {
  score: number;
  finalAlive: number;
  isPerfect: boolean;
  history: GridType[];
}

type PlaySpeed = 1 | 2 | 4;
type Mode = "edit" | "play";

/**
 * 統合ゲームボード - 編集とシミュレーション再生を1つのコンポーネントで
 */
export const GameBoard = memo(function GameBoard({
  grid,
  wallMask,
  cellSize = 14,
  targetCellCount,
  targetAlive,
  onCellToggle,
  onClear,
  onRandom,
  onSimulationComplete,
  className = "",
}: GameBoardProps) {
  // モード管理
  const [mode, setMode] = useState<Mode>("edit");

  // 再生関連
  const [history, setHistory] = useState<GridType[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ドラッグ編集関連
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<boolean | null>(null);
  const visitedCellsRef = useRef<Set<string>>(new Set());

  // 現在表示するグリッド
  const displayGrid = mode === "play" && history.length > 0
    ? history[currentGeneration] || history[0]
    : grid;

  const aliveCells = countAliveCells(displayGrid);
  const gridCellCount = countAliveCells(grid);
  const canSimulate = gridCellCount > 0 && gridCellCount <= targetCellCount && mode === "edit";

  // スコア計算
  const finalAliveCells = history.length > 0 ? countAliveCells(history[history.length - 1]) : 0;
  const distance = Math.abs(finalAliveCells - targetAlive);
  const baseScore = 400 - distance;
  const bonus = finalAliveCells === targetAlive ? 100 : 0;
  const score = baseScore + bonus;
  const isPerfect = bonus > 0;

  // 再生間隔（ミリ秒）
  const intervalMs = 200 / speed;

  // ========== シミュレーション制御 ==========

  // シミュレーション実行
  const runSim = useCallback(() => {
    if (!canSimulate) return;

    const simHistory = runSimulation(grid, MAX_GENERATIONS, wallMask ?? undefined);
    setHistory(simHistory);
    setCurrentGeneration(0);
    setMode("play");
    setIsPlaying(true);

    // 結果をコールバック
    const finalAlive = countAliveCells(simHistory[simHistory.length - 1]);
    const dist = Math.abs(finalAlive - targetAlive);
    const base = 400 - dist;
    const bon = finalAlive === targetAlive ? 100 : 0;

    if (onSimulationComplete) {
      onSimulationComplete({
        score: base + bon,
        finalAlive,
        isPerfect: bon > 0,
        history: simHistory,
      });
    }
  }, [canSimulate, grid, wallMask, targetAlive, onSimulationComplete]);

  // リセット（編集モードに戻る）
  const handleReset = useCallback(() => {
    setMode("edit");
    setHistory([]);
    setCurrentGeneration(0);
    setIsPlaying(false);
  }, []);

  // 再生/停止トグル
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 次の世代へ
  const nextGen = useCallback(() => {
    setCurrentGeneration((prev) =>
      prev < history.length - 1 ? prev + 1 : prev
    );
  }, [history.length]);

  // 前の世代へ
  const prevGen = useCallback(() => {
    setCurrentGeneration((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // 最初に戻る
  const goToStart = useCallback(() => {
    setCurrentGeneration(0);
    setIsPlaying(false);
  }, []);

  // 最後に進む
  const goToEnd = useCallback(() => {
    setCurrentGeneration(history.length - 1);
    setIsPlaying(false);
  }, [history.length]);

  // スライダー操作
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentGeneration(Number(e.target.value));
    },
    []
  );

  // 速度変更
  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

  // 再生ループ
  useEffect(() => {
    if (isPlaying && mode === "play") {
      intervalRef.current = setInterval(() => {
        setCurrentGeneration((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, mode, intervalMs, history.length]);

  // ========== 編集機能 ==========

  // 座標からセル位置を計算
  const getCellFromPosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const padding = 4; // p-1 = 4px
      const gap = 1;
      const cellWithGap = cellSize + gap;

      const relX = clientX - rect.left - padding;
      const relY = clientY - rect.top - padding;

      const x = Math.floor(relX / cellWithGap);
      const y = Math.floor(relY / cellWithGap);

      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        return { x, y };
      }
      return null;
    },
    [cellSize]
  );

  // セルの操作実行
  const handleCellAction = useCallback(
    (x: number, y: number, isStart: boolean) => {
      if (mode !== "edit") return;
      if (wallMask && wallMask[y][x]) return;

      const cellKey = `${x}-${y}`;
      if (visitedCellsRef.current.has(cellKey)) return;

      if (isStart) {
        const newMode = !grid[y][x];
        setDragMode(newMode);
        visitedCellsRef.current.clear();
        visitedCellsRef.current.add(cellKey);
        onCellToggle(x, y);
      } else if (dragMode !== null) {
        if (grid[y][x] !== dragMode) {
          visitedCellsRef.current.add(cellKey);
          onCellToggle(x, y);
        }
      }
    },
    [mode, wallMask, grid, dragMode, onCellToggle]
  );

  // マウスイベント
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== "edit") return;
      e.preventDefault();
      setIsDragging(true);

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, true);
      }
    },
    [mode, getCellFromPosition, handleCellAction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || mode !== "edit") return;

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, false);
      }
    },
    [isDragging, mode, getCellFromPosition, handleCellAction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    visitedCellsRef.current.clear();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    visitedCellsRef.current.clear();
  }, []);

  // タッチイベント（useEffectで直接登録してpassive: falseを設定）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (mode !== "edit") return;
      e.preventDefault();
      setIsDragging(true);

      const touch = e.touches[0];
      const cell = getCellFromPosition(touch.clientX, touch.clientY);
      if (cell) {
        // 単発タップ対応: 壁でなければトグル
        if (wallMask && wallMask[cell.y][cell.x]) return;
        const newMode = !grid[cell.y][cell.x];
        setDragMode(newMode);
        visitedCellsRef.current.clear();
        visitedCellsRef.current.add(`${cell.x}-${cell.y}`);
        onCellToggle(cell.x, cell.y);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (mode !== "edit") return;
      e.preventDefault();

      const touch = e.touches[0];
      const cell = getCellFromPosition(touch.clientX, touch.clientY);
      if (cell) {
        if (wallMask && wallMask[cell.y][cell.x]) return;
        const cellKey = `${cell.x}-${cell.y}`;
        if (visitedCellsRef.current.has(cellKey)) return;
        // dragModeに合わせてセルを変更
        const currentDragMode = visitedCellsRef.current.size > 0;
        if (grid[cell.y][cell.x] !== currentDragMode) {
          visitedCellsRef.current.add(cellKey);
          onCellToggle(cell.x, cell.y);
        }
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setDragMode(null);
      visitedCellsRef.current.clear();
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mode, getCellFromPosition, grid, wallMask, onCellToggle]);

  // ========== レンダリング ==========

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gap: "1px",
    }),
    [cellSize]
  );

  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isAlive = displayGrid[y][x];
        const isWall = wallMask ? wallMask[y][x] : false;

        let bgColor: string;
        if (isWall) {
          bgColor = "bg-zinc-600";
        } else if (isAlive) {
          bgColor = "bg-blue-500";
        } else {
          bgColor = "bg-zinc-800";
        }

        result.push(
          <div
            key={`${x}-${y}`}
            className={`${bgColor} transition-colors duration-75`}
            style={{ width: cellSize, height: cellSize }}
          />
        );
      }
    }

    return result;
  }, [displayGrid, wallMask, cellSize]);

  // セル数の状態表示（MAX以下ならOK、1つ以上必要）
  const editCellCount = countAliveCells(grid);
  const cellCountValid = editCellCount > 0 && editCellCount <= targetCellCount;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* スコア表示（常に表示、編集中は---） */}
      <div className="text-center">
        <span
          className={`text-2xl font-bold ${
            mode === "play" && isPerfect ? "text-green-400" : "text-blue-400"
          }`}
        >
          Score: {mode === "play" ? score : "---"}
          {mode === "play" && isPerfect && " (Perfect!)"}
        </span>
      </div>

      {/* グリッド表示 */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="inline-block rounded-lg bg-zinc-700 p-1 select-none touch-none"
          style={gridStyle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {cells}
        </div>
      </div>

      {/* 情報表示 */}
      <div className="flex items-center justify-between text-sm px-1">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400">
            Gen: <span className="font-mono font-medium text-zinc-100">
              {mode === "play" ? currentGeneration : 0}
            </span>
            <span className="text-zinc-500">/{MAX_GENERATIONS}</span>
          </span>
          <span className="text-zinc-400">
            Alive: <span className="font-mono font-medium text-zinc-100">{aliveCells}</span>
          </span>
        </div>

        {mode === "edit" && (
          <span
            className={`text-sm font-medium ${
              cellCountValid ? "text-green-400" : "text-red-400"
            }`}
          >
            {editCellCount} <span className="text-zinc-500">(max {targetCellCount})</span>
          </span>
        )}

        {mode === "play" && currentGeneration === history.length - 1 && (
          <span className="text-zinc-400">
            Target: <span className="font-mono">{targetAlive}</span>
          </span>
        )}
      </div>

      {/* 統合コントロールバー */}
      <div className="flex flex-col gap-2">
        {/* 上段: Clear, Random, セル数 */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              disabled={mode === "play"}
              className="px-3 py-1.5 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onRandom}
              disabled={mode === "play"}
              className="px-3 py-1.5 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Random
            </button>
          </div>
          <span
            className={`text-sm font-medium ${
              cellCountValid ? "text-green-400" : "text-red-400"
            }`}
          >
            {editCellCount} <span className="text-zinc-500 text-xs">(max {targetCellCount})</span>
          </span>
        </div>

        {/* スライダー */}
        <input
          type="range"
          min={0}
          max={mode === "play" && history.length > 0 ? history.length - 1 : MAX_GENERATIONS}
          value={mode === "play" ? currentGeneration : 0}
          onChange={handleSliderChange}
          disabled={mode === "edit"}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* 再生コントロール */}
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={goToStart}
            disabled={mode === "edit"}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Go to start"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={prevGen}
            disabled={mode === "edit" || currentGeneration === 0}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous generation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>

          {/* 再生/停止ボタン - 編集中＆セル数不一致時は停止アイコン(disabled) */}
          <button
            onClick={mode === "edit" ? runSim : togglePlay}
            disabled={mode === "edit" && !cellCountValid}
            className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={
              mode === "edit"
                ? cellCountValid
                  ? "Run simulation"
                  : "Cell count not matched"
                : isPlaying
                ? "Pause"
                : "Play"
            }
          >
            {mode === "edit" ? (
              // 編集モード: セル数一致で▶、不一致で||
              cellCountValid ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              )
            ) : (
              // 再生モード: 再生中は||、停止中は▶
              isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )
            )}
          </button>

          <button
            onClick={nextGen}
            disabled={mode === "edit" || currentGeneration === history.length - 1}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next generation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>

          <button
            onClick={goToEnd}
            disabled={mode === "edit"}
            className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Go to end"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            onClick={cycleSpeed}
            className="ml-1 px-2 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
            aria-label={`Speed: ${speed}x`}
          >
            {speed}x
          </button>

          <button
            onClick={handleReset}
            disabled={mode === "edit"}
            className="ml-1 p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-400 hover:text-zinc-100"
            aria-label="Reset and edit"
            title="Reset & Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
