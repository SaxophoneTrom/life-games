'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { BoardState, Cell, BOARD_SIZE, PALETTE } from '@/types';
import { isAlive, getColor, injectCells, runGenerations } from '@/lib/life-engine';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';

interface SegmentPreviewProps {
  baseState: BoardState;
  injectedCells: Cell[];
  nGenerations: number;
  cellSize?: number;
  className?: string;
}

export function SegmentPreview({
  baseState,
  injectedCells,
  nGenerations,
  cellSize = 2,
  className = '',
}: SegmentPreviewProps) {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<BoardState[]>([]);
  const animationRef = useRef<number | null>(null);

  const canvasSize = BOARD_SIZE * cellSize;

  // プレビューアニメーションを生成
  const generatePreview = useCallback(() => {
    // セルを注入
    const withInjected = injectCells(baseState, injectedCells);

    // シミュレーション実行
    const states = runGenerations(withInjected, nGenerations);
    setFrames(states);
    setCurrentFrame(0);
  }, [baseState, injectedCells, nGenerations]);

  // フレームを描画
  const drawFrame = useCallback(
    (state: BoardState) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = PALETTE[0];
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (isAlive(state, x, y)) {
            const colorIndex = getColor(state, x, y);
            ctx.fillStyle = PALETTE[colorIndex];
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    },
    [cellSize, canvasSize]
  );

  // アニメーション再生
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    let lastTime = 0;
    const frameInterval = 200; // 200ms per frame

    const animate = (timestamp: number) => {
      if (timestamp - lastTime >= frameInterval) {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
        lastTime = timestamp;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frames.length]);

  // 現在のフレームを描画
  useEffect(() => {
    if (frames.length > 0 && currentFrame < frames.length) {
      drawFrame(frames[currentFrame]);
    }
  }, [frames, currentFrame, drawFrame]);

  const handlePlayPause = () => {
    if (frames.length === 0) {
      generatePreview();
      setIsPlaying(true);
    } else if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentFrame >= frames.length - 1) {
        setCurrentFrame(0);
      }
      setIsPlaying(true);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* プレビューキャンバス */}
      <div className="relative bg-[#0B0F14] rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="block mx-auto"
          style={{
            imageRendering: 'pixelated',
            width: '100%',
            maxWidth: canvasSize,
            height: 'auto',
          }}
        />

        {/* フレームカウンター */}
        {frames.length > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
            {currentFrame + 1} / {frames.length}
          </div>
        )}
      </div>

      {/* コントロール */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePlayPause}
        className="w-full"
      >
        {isPlaying ? (
          <>
            <PauseIcon className="w-4 h-4 mr-2" />
            Pause
          </>
        ) : (
          <>
            <PlayIcon className="w-4 h-4 mr-2" />
            {t('preview')}
          </>
        )}
      </Button>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}
