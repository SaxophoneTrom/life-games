'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { BoardState, Cell } from '@/types';
import { createEmptyBoard, injectCells, runGenerations } from '@/lib/life-engine';
import { FRAME_CONFIG, loadFrameImage, renderBoardToSizedCanvas } from '@/lib/gif-renderer';

// Share機能の有効/無効（環境変数で制御）
const isShareEnabled = process.env.NEXT_PUBLIC_SHARE_ENABLED === 'true';

interface MintSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId?: number;
  txHash?: string;
  cells: Cell[];
  nGenerations: number;
}

/**
 * Mint成功時に表示するダイアログ
 * - NFTフレーム付きアニメーションプレビュー（Canvas）
 * - Farcaster / BASEAPP シェアボタン
 */
export function MintSuccessDialog({
  isOpen,
  onClose,
  tokenId,
  txHash,
  cells,
  nGenerations,
}: MintSuccessDialogProps) {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<BoardState[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);

  // フレーム画像サイズ
  const CANVAS_WIDTH = FRAME_CONFIG.width;
  const CANVAS_HEIGHT = FRAME_CONFIG.height;

  // フレーム画像読み込み
  useEffect(() => {
    if (!isOpen) return;
    loadFrameImage().then(setFrameImage).catch(console.error);
  }, [isOpen]);

  // フレーム生成
  useEffect(() => {
    if (!isOpen || cells.length === 0) return;

    const emptyBoard = createEmptyBoard();
    const initialState = injectCells(emptyBoard, cells);
    const generatedFrames = runGenerations(initialState, nGenerations);
    setFrames(generatedFrames);
    setCurrentFrame(0);
    setIsPlaying(true);
  }, [isOpen, cells, nGenerations]);

  // フレーム描画（NFTフレーム付き）
  const renderFrame = useCallback((state: BoardState) => {
    const canvas = canvasRef.current;
    if (!canvas || !frameImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
  }, [frameImage]);

  // アニメーション
  useEffect(() => {
    if (!isOpen || frames.length === 0 || !isPlaying || !frameImage) return;

    const intervalId = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 100);

    return () => clearInterval(intervalId);
  }, [isOpen, frames.length, isPlaying, frameImage]);

  // フレーム更新時に描画
  useEffect(() => {
    if (frames[currentFrame] && frameImage) {
      renderFrame(frames[currentFrame]);
    }
  }, [currentFrame, frames, renderFrame, frameImage]);

  // Farcasterでシェア（SDK経由）
  const handleShareFarcaster = async () => {
    const text = tokenId
      ? `I just minted Segment #${tokenId} - Game Of Life On BASE!`
      : 'I just minted a Segment - Game Of Life On BASE!';
    const url = tokenId
      ? `${window.location.origin}/segment/${tokenId}`
      : window.location.origin;

    try {
      await sdk.actions.composeCast({
        text,
        embeds: [url],
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      <Card className="w-[90vw] max-w-[360px] bg-[#0B0F14] border-[#2A9D8F]/50">
        <CardContent className="py-4 space-y-4">
          {/* ヘッダー */}
          <div className="text-center">
            <div className="text-2xl mb-1">🎉</div>
            <h2 className="text-lg font-bold text-white">{t('mint_success')}</h2>
            {tokenId && (
              <p className="text-sm text-white/50">Segment #{tokenId}</p>
            )}
          </div>

          {/* NFTフレーム付きプレビュー */}
          <div className="flex justify-center">
            <div
              className="relative rounded-lg overflow-hidden"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="cursor-pointer w-full max-w-[280px]"
                style={{ imageRendering: 'pixelated' }}
              />
              {/* 再生/停止インジケーター */}
              <div className="absolute bottom-8 right-4 text-xs text-white/70 bg-black/50 px-1 rounded">
                {currentFrame + 1}/{frames.length}
              </div>
            </div>
          </div>

          {/* シェアボタン */}
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleShareFarcaster}
              disabled={!isShareEnabled}
            >
              {isShareEnabled ? t('share') : t('share_suspended')}
            </Button>
          </div>

          {/* トランザクションリンク */}
          {txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[#2A9D8F] hover:underline"
            >
              {t('view_transaction')}
            </a>
          )}

          {/* 閉じるボタン */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onClose}
          >
            {t('close')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
