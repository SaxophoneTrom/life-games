'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { BoardState, BOARD_SIZE, PALETTE } from '@/types';
import { isAlive, getColor } from '@/lib/life-engine';

interface BoardViewerProps {
  state: BoardState;
  className?: string;
  cellSize?: number;
  enableZoom?: boolean;
}

export function BoardViewer({
  state,
  className = '',
  cellSize = 2,
  enableZoom = true,
}: BoardViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number | null>(null);

  // キャンバスサイズ
  const canvasSize = BOARD_SIZE * cellSize;

  // ボードを描画
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 背景色（パレット0: #0B0F14）
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 生きているセルを描画
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (isAlive(state, x, y)) {
          const colorIndex = getColor(state, x, y);
          ctx.fillStyle = PALETTE[colorIndex];
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [state, cellSize, canvasSize]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  // ピンチズーム処理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableZoom) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [enableZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableZoom) return;

    if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      setOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastDistanceRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const delta = distance / lastDistanceRef.current;

      setScale((prev) => Math.max(0.5, Math.min(5, prev * delta)));
      lastDistanceRef.current = distance;
    }
  }, [enableZoom, isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    lastDistanceRef.current = null;
  }, []);

  // マウスホイールズーム（ネイティブイベントで登録してページスクロールを防止）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableZoom) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(0.5, Math.min(5, prev * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [enableZoom]);

  // ダブルタップでリセット
  const handleDoubleClick = useCallback(() => {
    if (!enableZoom) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [enableZoom]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0B0F14] rounded-lg border border-white/20 ${className}`}
      style={{ touchAction: enableZoom ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
          className="block mx-auto"
          style={{
            imageRendering: 'pixelated',
            width: canvasSize,
            height: canvasSize,
          }}
        />
      </div>
      {enableZoom && scale !== 1 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
