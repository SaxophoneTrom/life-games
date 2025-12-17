'use client';

import Link from 'next/link';
import { useRef, useEffect, useMemo, useState } from 'react';
import type { Segment } from '@/types';
import { useSegment } from '@/hooks/useOnchainData';
import { createEmptyBoard, injectCells } from '@/lib/life-engine';
import { FRAME_CONFIG, loadFrameImage, renderBoardToSizedCanvas } from '@/lib/gif-renderer';

interface FramedSegmentCardProps {
  segment: Segment;
}

export function FramedSegmentCard({ segment }: FramedSegmentCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);

  // セグメント詳細を個別に取得（injectedCellsを含む）
  const { data: segmentDetail } = useSegment(segment.id);

  // フレーム画像読み込み
  useEffect(() => {
    loadFrameImage().then(setFrameImage).catch(console.error);
  }, []);

  // 1フレーム目の状態を計算
  const firstFrame = useMemo(() => {
    const cells = segmentDetail?.injectedCells;
    if (!cells || cells.length === 0) return null;
    const emptyBoard = createEmptyBoard();
    return injectCells(emptyBoard, cells);
  }, [segmentDetail?.injectedCells]);

  // NFTフレーム付きで描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameImage || !firstFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. NFTフレーム画像を描画
    ctx.drawImage(frameImage, 0, 0);

    // 2. ボードを512x512で描画
    const boardCanvas = renderBoardToSizedCanvas(firstFrame, FRAME_CONFIG.windowSize);

    // 3. 窓の位置にボードを合成
    ctx.drawImage(
      boardCanvas,
      FRAME_CONFIG.windowX,
      FRAME_CONFIG.windowY
    );
  }, [frameImage, firstFrame]);

  return (
    <Link href={`/segment/${segment.id}`} className="block pb-4">
      <div className="relative cursor-pointer hover:opacity-90 transition-opacity">
        {firstFrame && frameImage ? (
          <canvas
            ref={canvasRef}
            width={FRAME_CONFIG.width}
            height={FRAME_CONFIG.height}
            className="w-full"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div
            className="w-full bg-white/5 animate-pulse"
            style={{ aspectRatio: `${FRAME_CONFIG.width}/${FRAME_CONFIG.height}` }}
          />
        )}
        {/* セグメント番号 */}
        <div className="absolute bottom-8 left-4 text-white/80 text-sm bg-black/50 px-2 py-1 rounded">
          #{segment.id}
        </div>
        {/* 世代数 */}
        <div className="absolute bottom-8 right-4 text-white/60 text-xs bg-black/50 px-2 py-1 rounded">
          {segment.nGenerations} gens
        </div>
      </div>
    </Link>
  );
}

// スケルトンローダー
export function FramedSegmentCardSkeleton() {
  return (
    <div
      className="w-full bg-white/5 rounded-lg animate-pulse"
      style={{ aspectRatio: `${FRAME_CONFIG.width}/${FRAME_CONFIG.height}` }}
    />
  );
}
