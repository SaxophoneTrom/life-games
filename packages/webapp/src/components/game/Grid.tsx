"use client";

import { memo, useCallback, useMemo } from "react";
import { type Grid as GridType, GRID_SIZE } from "@/lib/gameOfLife";

interface GridProps {
  grid: GridType;
  wallMask?: GridType | null;
  cellSize?: number;
  showGridLines?: boolean;
  className?: string;
}

interface CellProps {
  isAlive: boolean;
  isWall: boolean;
  size: number;
}

const Cell = memo(function Cell({ isAlive, isWall, size }: CellProps) {
  let bgColor: string;

  if (isWall) {
    bgColor = "bg-zinc-400 dark:bg-zinc-600";
  } else if (isAlive) {
    bgColor = "bg-blue-500";
  } else {
    bgColor = "bg-white dark:bg-zinc-800";
  }

  return (
    <div
      className={`${bgColor} transition-colors duration-75`}
      style={{
        width: size,
        height: size,
      }}
    />
  );
});

/**
 * 20×20 グリッド表示コンポーネント（読み取り専用）
 */
export const Grid = memo(function Grid({
  grid,
  wallMask,
  cellSize = 16,
  showGridLines = true,
  className = "",
}: GridProps) {
  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gap: showGridLines ? "1px" : "0px",
    }),
    [cellSize, showGridLines]
  );

  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isAlive = grid[y][x];
        const isWall = wallMask ? wallMask[y][x] : false;

        result.push(
          <Cell
            key={`${x}-${y}`}
            isAlive={isAlive}
            isWall={isWall}
            size={cellSize}
          />
        );
      }
    }

    return result;
  }, [grid, wallMask, cellSize]);

  return (
    <div
      className={`inline-block rounded-lg bg-zinc-200 p-1 dark:bg-zinc-700 ${className}`}
      style={gridStyle}
    >
      {cells}
    </div>
  );
});

/**
 * ミニサムネイル用の小さなグリッド
 */
export const GridThumbnail = memo(function GridThumbnail({
  grid,
  wallMask,
  size = 100,
  className = "",
}: {
  grid: GridType;
  wallMask?: GridType | null;
  size?: number;
  className?: string;
}) {
  const cellSize = size / GRID_SIZE;

  return (
    <Grid
      grid={grid}
      wallMask={wallMask}
      cellSize={cellSize}
      showGridLines={false}
      className={className}
    />
  );
});
