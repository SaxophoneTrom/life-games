'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SegmentStatus } from '@/components/segment/SegmentStatus';
import { MiniBoard } from '@/components/board/MiniBoard';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockSegments, useMockBoard } from '@/hooks/useMockData';

export default function SegmentDetailPage() {
  const params = useParams();
  const t = useTranslation();
  const segmentId = Number(params.id);

  const segments = useMockSegments(20);
  const boardState = useMockBoard();

  const segment = useMemo(
    () => segments.find((s) => s.id === segmentId),
    [segments, segmentId]
  );

  if (!segment) {
    return (
      <div className="py-8 text-center animate-fade-in">
        <p className="text-white/50">{t('error')}</p>
        <Link href="/">
          <Button variant="secondary" className="mt-4">
            {t('home')}
          </Button>
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    const shareText = `Check out Segment #${segment.id} on Infinite Life!`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          {t('segment')} #{segment.id}
        </h1>
        <SegmentStatus status={segment.status} />
      </div>

      {/* プレビュー */}
      <Card>
        <div className="aspect-square bg-[#0B0F14] flex items-center justify-center">
          {segment.status === 'revealed' && segment.mediaUrl ? (
            <video
              src={segment.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <MiniBoard state={boardState} size={280} />
          )}
        </div>
      </Card>

      {/* 詳細情報 */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-white/50">{t('status')}</span>
            <span className="text-white capitalize">{segment.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('generations')}</span>
            <span className="text-white">
              {segment.startGeneration} - {segment.endGeneration} ({segment.nGenerations})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('injected_cells')}</span>
            <span className="text-white">{segment.injectedCells.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('creator')}</span>
            <span className="text-white font-mono text-sm">
              {segment.creator.slice(0, 6)}...{segment.creator.slice(-4)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* シェアボタン */}
      <Button size="lg" className="w-full" onClick={handleShare}>
        {t('share_on_farcaster')}
      </Button>
    </div>
  );
}
