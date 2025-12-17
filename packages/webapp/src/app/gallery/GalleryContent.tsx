'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FramedSegmentCard, FramedSegmentCardSkeleton } from '@/components/segment/FramedSegmentCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useSegments, useEpochs } from '@/hooks/useOnchainData';

type GalleryTab = 'segments' | 'epochs';

export default function GalleryContent() {
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<GalleryTab>('segments');
  const [displayCount, setDisplayCount] = useState(1);

  // オンチェーンデータ取得（全件取得してクライアントでページング）
  const {
    data: segmentsData,
    isLoading: segmentsLoading,
    error: segmentsError,
  } = useSegments(100);

  const {
    data: epochsData,
    isLoading: epochsLoading,
    error: epochsError,
  } = useEpochs(50);

  const allSegments = segmentsData?.segments ?? [];
  const segments = allSegments.slice(0, displayCount);
  const hasMore = displayCount < allSegments.length;
  const epochs = epochsData?.epochs ?? [];

  // 1件ずつ追加読み込み
  const handleLoadMore = () => {
    if (hasMore) {
      setDisplayCount((prev) => prev + 1);
    }
  };

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* タブ */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'segments'
              ? 'bg-[#F67280] text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setActiveTab('segments')}
        >
          {t('segments')} ({segmentsLoading ? '...' : allSegments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'epochs'
              ? 'bg-[#F67280] text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setActiveTab('epochs')}
        >
          {t('epochs')} ({epochsLoading ? '...' : epochs.length})
        </button>
      </div>

      {/* コンテンツ */}
      {activeTab === 'segments' ? (
        <section>
          {segmentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <FramedSegmentCardSkeleton key={i} />
              ))}
            </div>
          ) : segmentsError ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-red-400">Error loading segments</p>
              </CardContent>
            </Card>
          ) : segments.length > 0 ? (
            <div className="space-y-16">
              {segments.map((segment) => (
                <FramedSegmentCard key={segment.id} segment={segment} />
              ))}
              {/* Load More ボタン */}
              {hasMore && (
                <div className="pt-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleLoadMore}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">{t('no_segments')}</p>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {epochsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">Loading...</p>
              </CardContent>
            </Card>
          ) : epochsError ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-red-400">Error loading epochs</p>
              </CardContent>
            </Card>
          ) : epochs.length > 0 ? (
            epochs.map((epoch) => (
              <Link key={epoch.id} href={`/epoch/${epoch.id}`}>
                <Card hoverable>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">
                        {t('epoch')} #{epoch.id}
                      </div>
                      <div className="text-sm text-white/50">
                        Gen {epoch.absStartGen} - {epoch.absEndGen}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        epoch.revealed
                          ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]'
                          : 'bg-[#F4A261]/20 text-[#F4A261]'
                      }`}
                    >
                      {epoch.revealed ? t('revealed') : t('in_progress')}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">{t('no_epochs')}</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
