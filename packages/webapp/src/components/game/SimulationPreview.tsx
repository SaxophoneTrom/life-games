"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { type Grid as GridType, GRID_SIZE, MAX_GENERATIONS, countAliveCells } from "@/lib/gameOfLife";
import { Grid } from "./Grid";

interface SimulationPreviewProps {
  history: GridType[];
  wallMask?: GridType | null;
  cellSize?: number;
  targetAlive: number;
  className?: string;
  onReset?: () => void;
}

type PlaySpeed = 1 | 2 | 4;

/**
 * シミュレーション再生コンポーネント
 */
export const SimulationPreview = memo(function SimulationPreview({
  history,
  wallMask,
  cellSize = 16,
  targetAlive,
  className = "",
  onReset,
}: SimulationPreviewProps) {
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentGrid = history[currentGeneration] || history[0];
  const aliveCells = currentGrid ? countAliveCells(currentGrid) : 0;
  const finalAliveCells = history.length > 0 ? countAliveCells(history[history.length - 1]) : 0;

  // 再生間隔（ミリ秒）
  const intervalMs = 200 / speed;

  // 再生/停止
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
    if (isPlaying) {
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
  }, [isPlaying, intervalMs, history.length]);

  // historyが変わったらリセット
  useEffect(() => {
    setCurrentGeneration(0);
    setIsPlaying(false);
  }, [history]);

  if (!currentGrid) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <span className="text-zinc-500">No simulation data</span>
      </div>
    );
  }

  const distance = Math.abs(finalAliveCells - targetAlive);
  const baseScore = 400 - distance;
  const bonus = finalAliveCells === targetAlive ? 100 : 0;
  const score = baseScore + bonus;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* グリッド表示 */}
      <div className="flex justify-center">
        <Grid
          grid={currentGrid}
          wallMask={wallMask}
          cellSize={cellSize}
        />
      </div>

      {/* 情報表示 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-zinc-600 dark:text-zinc-400">
            Gen: <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{currentGeneration}</span>
            <span className="text-zinc-400">/{MAX_GENERATIONS}</span>
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            Alive: <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{aliveCells}</span>
          </span>
        </div>

        {currentGeneration === history.length - 1 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              Target: <span className="font-mono">{targetAlive}</span>
            </span>
            <span
              className={`font-medium ${
                bonus > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              Score: {score}
              {bonus > 0 && " (Perfect!)"}
            </span>
          </div>
        )}
      </div>

      {/* コントロール */}
      <div className="flex flex-col gap-2">
        {/* スライダー */}
        <input
          type="range"
          min={0}
          max={history.length - 1}
          value={currentGeneration}
          onChange={handleSliderChange}
          className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
        />

        {/* ボタン */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={goToStart}
            className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Go to start"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={prevGen}
            disabled={currentGeneration === 0}
            className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            aria-label="Previous generation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={nextGen}
            disabled={currentGeneration === history.length - 1}
            className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            aria-label="Next generation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>

          <button
            onClick={goToEnd}
            className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Go to end"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            onClick={cycleSpeed}
            className="ml-2 px-2 py-1 text-xs font-medium rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            aria-label={`Speed: ${speed}x`}
          >
            {speed}x
          </button>

          {/* リセットボタン（編集に戻る） */}
          {onReset && (
            <button
              onClick={onReset}
              className="ml-2 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="Reset and edit"
              title="Reset & Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
