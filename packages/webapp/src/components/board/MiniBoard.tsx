'use client';

import { useRef, useEffect, useCallback } from 'react';
import { BoardState, BOARD_SIZE, PALETTE } from '@/types';
import { isAlive, getColor } from '@/lib/life-engine';

interface MiniBoardProps {
  state: BoardState;
  size?: number;
  className?: string;
}

/**
 * サムネイル用の小さなボード表示
 */
export function MiniBoard({ state, size = 80, className = '' }: MiniBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1ピクセル = 1セル（200x200 を size x size にスケーリング）
    const scale = size / BOARD_SIZE;

    // 背景
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(0, 0, size, size);

    // ImageDataで高速描画
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        // スケーリングした座標からボード座標を計算
        const bx = Math.floor(px / scale);
        const by = Math.floor(py / scale);

        const pixelIndex = (py * size + px) * 4;

        if (isAlive(state, bx, by)) {
          const colorIndex = getColor(state, bx, by);
          const hex = PALETTE[colorIndex];
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = 255;
        } else {
          // 背景色
          data[pixelIndex] = 11; // #0B
          data[pixelIndex + 1] = 15; // #0F
          data[pixelIndex + 2] = 20; // #14
          data[pixelIndex + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [state, size]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded ${className}`}
      style={{
        imageRendering: 'pixelated',
        width: size,
        height: size,
      }}
    />
  );
}
