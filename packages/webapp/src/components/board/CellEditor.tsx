'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { BoardState, Cell, BOARD_SIZE, PALETTE } from '@/types';
import { isAlive, getColor, setCell, cloneBoard } from '@/lib/life-engine';

interface CellEditorProps {
  baseState: BoardState;
  injectedCells: Cell[];
  onCellsChange: (cells: Cell[]) => void;
  selectedColorIndex: number;
  maxCells: number;
  cellSize?: number;
  className?: string;
}

export function CellEditor({
  baseState,
  injectedCells,
  onCellsChange,
  selectedColorIndex,
  maxCells,
  cellSize = 2,
  className = '',
}: CellEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const canvasSize = BOARD_SIZE * cellSize;

  // 描画
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ベース状態を描画
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 既存のセル（薄く表示）
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (isAlive(baseState, x, y)) {
          const colorIndex = getColor(baseState, x, y);
          ctx.fillStyle = PALETTE[colorIndex] + '80'; // 50% 透明
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // 注入セル（強調表示）
    for (const cell of injectedCells) {
      ctx.fillStyle = PALETTE[cell.colorIndex];
      ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);

      // 枠線を追加
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        cell.x * cellSize + 0.5,
        cell.y * cellSize + 0.5,
        cellSize - 1,
        cellSize - 1
      );
    }
  }, [baseState, injectedCells, cellSize, canvasSize]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  // タップでセルを追加/削除
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      const cellX = Math.floor(canvasX / cellSize);
      const cellY = Math.floor(canvasY / cellSize);

      if (cellX < 0 || cellX >= BOARD_SIZE || cellY < 0 || cellY >= BOARD_SIZE) {
        return;
      }

      // 既に注入されているセルか確認
      const existingIndex = injectedCells.findIndex(
        (c) => c.x === cellX && c.y === cellY
      );

      if (existingIndex !== -1) {
        // 削除
        const newCells = [...injectedCells];
        newCells.splice(existingIndex, 1);
        onCellsChange(newCells);
      } else {
        // 追加（上限チェック）
        if (injectedCells.length >= maxCells) {
          return; // 上限に達している
        }

        // ベース状態で既に生きているセルには配置不可
        if (isAlive(baseState, cellX, cellY)) {
          return;
        }

        const newCells = [
          ...injectedCells,
          { x: cellX, y: cellY, colorIndex: selectedColorIndex },
        ];
        onCellsChange(newCells);
      }
    },
    [
      baseState,
      injectedCells,
      onCellsChange,
      selectedColorIndex,
      maxCells,
      cellSize,
      canvasSize,
    ]
  );

  // ホイールズーム
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  }, []);

  // ダブルクリックでリセット
  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0B0F14] rounded-lg ${className}`}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="transition-transform duration-100 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleCanvasClick}
          className="block mx-auto cursor-crosshair"
          style={{
            imageRendering: 'pixelated',
            width: canvasSize,
            height: canvasSize,
          }}
        />
      </div>
      {scale !== 1 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
