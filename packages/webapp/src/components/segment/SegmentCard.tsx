'use client';

import Link from 'next/link';
import { useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import type { Segment, BoardState } from '@/types';
import { createEmptyBoard, injectCells } from '@/lib/life-engine';
import { renderBoardToSizedCanvas } from '@/lib/gif-renderer';

interface SegmentCardProps {
  segment: Segment;
  showDetails?: boolean;
}

const THUMBNAIL_SIZE = 100; // サムネイルサイズ

export function SegmentCard({ segment, showDetails = false }: SegmentCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1フレーム目の状態を計算
  const firstFrame: BoardState | null = useMemo(() => {
    if (!segment.injectedCells || segment.injectedCells.length === 0) return null;
    const emptyBoard = createEmptyBoard();
    return injectCells(emptyBoard, segment.injectedCells);
  }, [segment.injectedCells]);

  // サムネイル描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !firstFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ボードを描画
    const boardCanvas = renderBoardToSizedCanvas(firstFrame, THUMBNAIL_SIZE);
    ctx.drawImage(boardCanvas, 0, 0);
  }, [firstFrame]);

  return (
    <Link href={`/segment/${segment.id}`}>
      <Card hoverable className="w-[100px] flex-shrink-0">
        {/* サムネイル - 1フレーム目の静止画 */}
        <div className="aspect-square bg-[#0B0F14] relative overflow-hidden">
          {firstFrame ? (
            <canvas
              ref={canvasRef}
              width={THUMBNAIL_SIZE}
              height={THUMBNAIL_SIZE}
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl text-white/20">#{segment.id}</span>
            </div>
          )}
        </div>

        {/* 情報 */}
        <div className="p-2">
          <div className="text-sm font-medium text-white">#{segment.id}</div>
          {showDetails && (
            <div className="text-xs text-white/50 mt-0.5">
              {segment.nGenerations} gens
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// スケルトンローダー
export function SegmentCardSkeleton() {
  return (
    <div className="w-[100px] flex-shrink-0 bg-white/5 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-white/10" />
      <div className="p-2">
        <div className="h-4 bg-white/10 rounded w-12" />
      </div>
    </div>
  );
}
