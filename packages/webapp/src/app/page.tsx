'use client';

import Link from 'next/link';
import { BoardViewer } from '@/components/board/BoardViewer';
import { SegmentCard, SegmentCardSkeleton } from '@/components/segment/SegmentCard';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockBoard, useMockSegments } from '@/hooks/useMockData';

export default function HomePage() {
  const t = useTranslation();
  const boardState = useMockBoard();
  const segments = useMockSegments(10);

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
            {segments.length}
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

      {/* 最新セグメント */}
      <section>
        <h2 className="text-sm font-medium text-white/70 mb-3">
          {t('latest_segments')}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
          {segments.length > 0 ? (
            segments.map((segment) => (
              <SegmentCard key={segment.id} segment={segment} />
            ))
          ) : (
            // スケルトン
            Array.from({ length: 5 }).map((_, i) => (
              <SegmentCardSkeleton key={i} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
