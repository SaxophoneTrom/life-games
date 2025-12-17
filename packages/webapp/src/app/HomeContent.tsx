'use client';

import Link from 'next/link';
import { useRef, useEffect, useMemo, useState } from 'react';
import { BoardViewer } from '@/components/board/BoardViewer';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockBoard } from '@/hooks/useMockData';
import { useSegments, useSegment } from '@/hooks/useOnchainData';
import { createEmptyBoard, injectCells, runGenerations } from '@/lib/life-engine';
import { FRAME_CONFIG, loadFrameImage, renderBoardToSizedCanvas, generateFramedGif } from '@/lib/gif-renderer';

export default function HomeContent() {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);

  // 共有世界線の最新状態（本来はEpoch進行状況から算出）
  // TODO: 将来的にはオンチェーンから取得
  const boardState = useMockBoard();

  // オンチェーンからセグメント一覧を取得（最新1件のIDを取得するため）
  const { data, isLoading, error } = useSegments(1);
  const latestSegmentId = data?.segments?.[0]?.id;
  const totalSegments = data?.total ?? 0;

  // 最新セグメントの詳細を取得（cellsを含む）
  const { data: latestSegment, isLoading: isLoadingDetail } = useSegment(latestSegmentId);

  // フレーム画像読み込み
  useEffect(() => {
    loadFrameImage().then(setFrameImage).catch(console.error);
  }, []);

  // 1世代目（注入直後）の盤面
  const firstFrame = useMemo(() => {
    if (!latestSegment?.injectedCells || latestSegment.injectedCells.length === 0) return null;
    const emptyBoard = createEmptyBoard();
    return injectCells(emptyBoard, latestSegment.injectedCells);
  }, [latestSegment]);

  // NFTフレーム付きで静止画を描画（GIF生成中のフォールバック用）
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

  // アニメーションGIF生成
  useEffect(() => {
    if (!latestSegment?.injectedCells || !firstFrame || latestSegment.injectedCells.length === 0) {
      setGifUrl(null);
      return;
    }

    // GIF生成開始
    setIsGeneratingGif(true);
    setGifUrl(null);

    const generateGif = async () => {
      try {
        // 全フレームを生成
        const nGenerations = latestSegment.nGenerations || 10;
        const frames = runGenerations(firstFrame, nGenerations);

        // フレーム付きGIFを生成
        const blob = await generateFramedGif(frames, { frameDelay: 100 });

        // ObjectURLを作成
        const url = URL.createObjectURL(blob);
        setGifUrl(url);
      } catch (error) {
        console.error('Failed to generate GIF:', error);
      } finally {
        setIsGeneratingGif(false);
      }
    };

    generateGif();

    // クリーンアップ: 前のObjectURLを解放
    return () => {
      setGifUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return null;
      });
    };
  }, [latestSegment, firstFrame]);

  return (
    <div className="py-4 space-y-6 animate-fade-in">
      {/* ボード表示 */}
      <section>
        <BoardViewer
          state={boardState}
          cellSize={6}
          enableZoom={true}
          className="w-full aspect-square mx-auto"
        />
      </section>

      {/* 統計情報 */}
      <section className="flex justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-white">
            {boardState.generation.toLocaleString()}
          </div>
          <div className="text-sm text-white/50">{t('generation')}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? '...' : totalSegments}
          </div>
          <div className="text-sm text-white/50">{t('total_segments')}</div>
        </div>
      </section>

      {/* 参加ボタン */}
      <section className="px-4">
        <Link href="/buy" className="block">
          <Button size="lg" className="w-full">
            {t('join_now')}
          </Button>
        </Link>
      </section>

      {/* 最新セグメント - 1件のみNFTフレーム付きで表示 */}
      <section>
        <h2 className="text-sm font-medium text-white/70 mb-3">
          {t('latest_segment')}
        </h2>
        <div className="flex justify-center">
          {isLoading || isLoadingDetail ? (
            // スケルトン
            <div className="w-full max-w-[343px] aspect-[686/876] bg-white/5 rounded-lg animate-pulse" />
          ) : error ? (
            <div className="text-white/50 text-sm py-4">
              Failed to load segment
            </div>
          ) : latestSegment && firstFrame && frameImage ? (
            <Link href={`/segment/${latestSegment.id}`}>
              <div className="relative cursor-pointer hover:opacity-90 transition-opacity">
                {gifUrl ? (
                  // アニメーションGIF表示
                  <img
                    src={gifUrl}
                    alt={`Segment #${latestSegment.id}`}
                    className="w-full max-w-[343px]"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  // GIF生成中は静止画を表示
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={FRAME_CONFIG.width}
                      height={FRAME_CONFIG.height}
                      className="w-full max-w-[343px]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {isGeneratingGif && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="text-white text-sm">Generating...</div>
                      </div>
                    )}
                  </div>
                )}
                {/* セグメント番号 */}
                <div className="absolute bottom-8 left-4 text-white/80 text-sm bg-black/50 px-2 py-1 rounded">
                  #{latestSegment.id}
                </div>
              </div>
            </Link>
          ) : (
            <div className="text-white/50 text-sm py-8 text-center">
              No segments yet. Be the first to create one!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
