'use client';

import Link from 'next/link';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useSegments, useSegment } from '@/hooks/useOnchainData';
import { createEmptyBoard, injectCells, runGenerations, isAlive, getColor } from '@/lib/life-engine';
import { generateBaseLogoCells } from '@/lib/base-logo-cells';
import { FRAME_CONFIG, loadFrameImage, renderBoardToSizedCanvas, generateFramedGif } from '@/lib/gif-renderer';
import { BoardState, BOARD_SIZE, PALETTE } from '@/types';

// アニメーション設定
const ANIMATION_GENERATIONS = 128; // 128世代
const FRAME_INTERVAL_MS = 150; // 1倍速（SegmentEditorと同じ）

export default function HomeContent() {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);

  // BASEロゴアニメーション用状態
  const [animationFrames, setAnimationFrames] = useState<BoardState[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // 再生中かどうか
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // BASEロゴの128世代アニメーションを事前計算
  useEffect(() => {
    const baseCells = generateBaseLogoCells();
    const emptyBoard = createEmptyBoard();
    const initialBoard = injectCells(emptyBoard, baseCells);
    const frames = runGenerations(initialBoard, ANIMATION_GENERATIONS);
    setAnimationFrames(frames);
    setIsAnimationReady(true);
  }, []);

  // アニメーション再生ループ（タップで開始、128世代で停止）
  useEffect(() => {
    if (!isAnimationReady || animationFrames.length === 0 || !isPlaying) {
      // 再生停止時はインターバルをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        const nextFrame = prev + 1;
        // 128世代（最後のフレーム）に達したら先頭に戻って停止
        if (nextFrame >= animationFrames.length) {
          setIsPlaying(false);
          return 0;
        }
        return nextFrame;
      });
    }, FRAME_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAnimationReady, animationFrames.length, isPlaying]);

  // 画像タップでアニメーション開始
  const handleCanvasClick = useCallback(() => {
    if (!isAnimationReady || animationFrames.length === 0) return;

    // 停止中ならフレーム0から再生開始
    if (!isPlaying) {
      setCurrentFrame(0);
      setIsPlaying(true);
    }
  }, [isAnimationReady, animationFrames.length, isPlaying]);

  // BASEロゴアニメーションの描画
  const cellSize = 6;
  const canvasSize = BOARD_SIZE * cellSize;

  const drawAnimationFrame = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas || animationFrames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = animationFrames[currentFrame];
    if (!state) return;

    // 背景色
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
  }, [animationFrames, currentFrame, canvasSize]);

  useEffect(() => {
    drawAnimationFrame();
  }, [drawAnimationFrame]);

  // 1世代目（注入直後）の盤面（最新セグメント用）
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

  // アニメーションGIF生成（最新セグメント用）
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
      {/* BASEロゴアニメーション表示 */}
      <section className="flex justify-center">
        <div
          className="relative overflow-hidden bg-[#0B0F14] rounded-lg border border-white/20 cursor-pointer"
          onClick={handleCanvasClick}
        >
          <canvas
            ref={animationCanvasRef}
            width={canvasSize}
            height={canvasSize}
            className="block"
            style={{
              imageRendering: 'pixelated',
              width: canvasSize,
              height: canvasSize,
            }}
          />
          {/* 再生ボタンオーバーレイ（停止中のみ表示） */}
          {!isPlaying && isAnimationReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          {/* 世代表示 */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
            Gen {currentFrame + 1}/{ANIMATION_GENERATIONS}
          </div>
        </div>
      </section>

      {/* 統計情報 */}
      <section className="flex justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-white">
            {currentFrame + 1}
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
