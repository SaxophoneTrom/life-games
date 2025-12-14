"use client";

import { memo, useCallback, useMemo, useState, useRef } from "react";
import { type Grid as GridType, GRID_SIZE } from "@/lib/gameOfLife";

interface GridEditorProps {
  grid: GridType;
  wallMask?: GridType | null;
  cellSize?: number;
  onCellToggle: (x: number, y: number) => void;
  onGridChange?: (grid: GridType) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 20×20 グリッドエディタ（セル編集機能付き）
 * タッチスワイプ・マウスドラッグで連続塗り対応
 */
export const GridEditor = memo(function GridEditor({
  grid,
  wallMask,
  cellSize = 16,
  onCellToggle,
  disabled = false,
  className = "",
}: GridEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<boolean | null>(null);
  // 既に操作したセルを追跡（同一ドラッグ中の重複操作防止）
  const visitedCellsRef = useRef<Set<string>>(new Set());

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
      if (disabled) return;
      if (wallMask && wallMask[y][x]) return; // 壁は操作不可

      const cellKey = `${x}-${y}`;
      if (visitedCellsRef.current.has(cellKey)) return;

      if (isStart) {
        // ドラッグ開始: 最初のセルの状態を反転する方向を記憶
        const newMode = !grid[y][x];
        setDragMode(newMode);
        visitedCellsRef.current.clear();
        visitedCellsRef.current.add(cellKey);
        onCellToggle(x, y);
      } else if (dragMode !== null) {
        // ドラッグ中: dragModeの方向にセルを変更
        if (grid[y][x] !== dragMode) {
          visitedCellsRef.current.add(cellKey);
          onCellToggle(x, y);
        }
      }
    },
    [disabled, wallMask, grid, dragMode, onCellToggle]
  );

  // マウスイベント
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, true);
      }
    },
    [disabled, getCellFromPosition, handleCellAction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || disabled) return;

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, false);
      }
    },
    [isDragging, disabled, getCellFromPosition, handleCellAction]
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

  // タッチイベント
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);

      const touch = e.touches[0];
      const cell = getCellFromPosition(touch.clientX, touch.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, true);
      }
    },
    [disabled, getCellFromPosition, handleCellAction]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;
      e.preventDefault();

      const touch = e.touches[0];
      const cell = getCellFromPosition(touch.clientX, touch.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, false);
      }
    },
    [isDragging, disabled, getCellFromPosition, handleCellAction]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    visitedCellsRef.current.clear();
  }, []);

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gap: "1px",
    }),
    [cellSize]
  );

  // セル描画
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isAlive = grid[y][x];
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
  }, [grid, wallMask, cellSize]);

  return (
    <div
      ref={containerRef}
      className={`inline-block rounded-lg bg-zinc-700 p-1 select-none touch-none ${className}`}
      style={gridStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {cells}
    </div>
  );
});

/**
 * グリッドエディタのツールバー
 */
export function GridEditorToolbar({
  onClear,
  onRandom,
  aliveCellCount,
  targetCellCount,
  disabled = false,
}: {
  onClear: () => void;
  onRandom: () => void;
  aliveCellCount: number;
  targetCellCount: number;
  disabled?: boolean;
}) {
  const isValid = aliveCellCount === targetCellCount;
  const diff = aliveCellCount - targetCellCount;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          disabled={disabled}
          className="rounded px-3 py-1 text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onRandom}
          disabled={disabled}
          className="rounded px-3 py-1 text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Random
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            isValid
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {aliveCellCount} / {targetCellCount} cells
        </span>
        {!isValid && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({diff > 0 ? `+${diff}` : diff})
          </span>
        )}
      </div>
    </div>
  );
}
