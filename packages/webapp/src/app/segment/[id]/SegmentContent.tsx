'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useSegment } from '@/hooks/useOnchainData';
import { useFid } from '@/hooks/useFarcasterContext';
import { useEmptyBoard } from '@/hooks/useMockData';
import { injectCells, runGenerations } from '@/lib/life-engine';
import {
  FRAME_CONFIG,
  loadFrameImage,
  renderBoardToSizedCanvas,
  generateFramedGif,
  downloadGif,
} from '@/lib/gif-renderer';

const FRAME_INTERVAL = 100; // 100ms per frame

// Share機能の有効/無効（環境変数で制御）
const isShareEnabled = process.env.NEXT_PUBLIC_SHARE_ENABLED === 'true';

export default function SegmentContent() {
  const params = useParams();
  const t = useTranslation();
  const segmentId = Number(params.id);

  // SDK初期化 & Mini App環境判定
  const { isMock } = useFid();

  // オンチェーンデータ取得
  const { data: segment, isLoading, error } = useSegment(segmentId);

  const emptyBoard = useEmptyBoard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);

  // フレーム画像読み込み
  useEffect(() => {
    loadFrameImage().then(setFrameImage).catch(console.error);
  }, []);

  // 新仕様: 空盤面 + 注入セル → 全フレームを生成
  const frames = useMemo(() => {
    if (!segment || !segment.injectedCells || segment.injectedCells.length === 0) return [];
    const withInjected = injectCells(emptyBoard, segment.injectedCells);
    return runGenerations(withInjected, segment.nGenerations);
  }, [segment, emptyBoard]);

  // Canvasに現在のフレームを描画（NFTフレーム付き）
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0 || !frameImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = frames[frameIndex] || frames[0];

    // 1. NFTフレーム画像を描画
    ctx.drawImage(frameImage, 0, 0);

    // 2. ボードを512x512で描画
    const boardCanvas = renderBoardToSizedCanvas(state, FRAME_CONFIG.windowSize);

    // 3. 窓の位置にボードを合成
    ctx.drawImage(
      boardCanvas,
      FRAME_CONFIG.windowX,
      FRAME_CONFIG.windowY
    );
  }, [frames, frameImage]);

  // アニメーションループ
  useEffect(() => {
    if (!isPlaying || frames.length === 0 || !frameImage) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL) {
        setCurrentFrame((prev) => (prev + 1) % frames.length);
        lastFrameTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frames.length, frameImage]);

  // フレーム変更時に描画
  useEffect(() => {
    if (frameImage) {
      renderFrame(currentFrame);
    }
  }, [currentFrame, renderFrame, frameImage]);

  // GIFダウンロード（NFTフレーム付きアニメーションGIF）
  const handleDownload = async () => {
    if (frames.length === 0) return;

    setIsGeneratingGif(true);
    try {
      const blob = await generateFramedGif(frames);
      downloadGif(blob, `segment-${segmentId}.gif`);
    } catch (err) {
      console.error('Failed to generate GIF:', err);
    } finally {
      setIsGeneratingGif(false);
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="py-8 text-center animate-fade-in">
        <p className="text-white/50">{t('loading')}</p>
      </div>
    );
  }

  // エラーまたは見つからない
  if (error || !segment) {
    return (
      <div className="py-8 text-center animate-fade-in">
        <p className="text-white/50">{error?.message || t('error')}</p>
        <Link href="/gallery">
          <Button variant="secondary" className="mt-4">
            {t('gallery')}
          </Button>
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    const text = `Check out Segment #${segment.id} - Game Of Life On BASE!`;
    const url = `${window.location.origin}/segment/${segment.id}`;

    try {
      await sdk.actions.composeCast({
        text,
        embeds: [url],
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
    }
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          {t('segment')} #{segment.id}
        </h1>
        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
          Minted
        </span>
      </div>

      {/* NFTフレーム付きアニメーションプレビュー */}
      <div className="flex justify-center">
        <div className="relative">
          {frames.length > 0 && frameImage ? (
            <>
              <canvas
                ref={canvasRef}
                width={FRAME_CONFIG.width}
                height={FRAME_CONFIG.height}
                className="w-full max-w-[343px]"
                style={{ imageRendering: 'pixelated' }}
              />
              {/* 再生コントロール */}
              <div className="absolute bottom-12 left-4 right-4 flex items-center justify-between bg-black/50 rounded px-2 py-1">
                <button
                  onClick={togglePlay}
                  className="text-white/80 hover:text-white text-sm"
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <span className="text-white/60 text-xs">
                  Gen: {currentFrame + 1}/{frames.length}
                </span>
              </div>
            </>
          ) : (
            <div className="w-[343px] aspect-[686/876] bg-[#0B0F14] flex items-center justify-center rounded-lg">
              <div className="text-white/50 text-sm">
                {!frameImage ? 'Loading frame...' : 'No cell data available'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 詳細情報 */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-white/50">{t('generations')}</span>
            <span className="text-white">{segment.nGenerations}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('injected_cells')}</span>
            <span className="text-white">{segment.injectedCells?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('minter')}</span>
            <span className="text-white font-mono text-sm">
              {segment.minter.slice(0, 6)}...{segment.minter.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">FID</span>
            <span className="text-white">{segment.fid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('minted_at')}</span>
            <span className="text-white font-mono text-sm">Block #{segment.mintedAt}</span>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="space-y-2">
        {/* Mini App環境ではDownload GIFボタンを非表示 */}
        {isMock && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleDownload}
            disabled={isGeneratingGif || frames.length === 0}
            isLoading={isGeneratingGif}
          >
            {t('download_gif')}
          </Button>
        )}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleShare}
          disabled={!isShareEnabled}
        >
          {isShareEnabled ? t('share') : t('share_suspended')}
        </Button>
      </div>
    </div>
  );
}
