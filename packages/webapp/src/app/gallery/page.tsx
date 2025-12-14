'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SegmentCard } from '@/components/segment/SegmentCard';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockSegments } from '@/hooks/useMockData';
import type { Epoch } from '@/types';

type GalleryTab = 'segments' | 'epochs';

// モック: 全エポック一覧
const mockEpochs: Epoch[] = [
  {
    id: 1,
    tokenId: 1,
    startGeneration: 1,
    endGeneration: 256,
    finalized: true,
    mediaUrl: undefined,
    contributors: [],
  },
  {
    id: 2,
    tokenId: 2,
    startGeneration: 257,
    endGeneration: 512,
    finalized: false,
    contributors: [],
  },
];

export default function GalleryPage() {
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<GalleryTab>('segments');

  const allSegments = useMockSegments(30);

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
          {t('segments')} ({allSegments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'epochs'
              ? 'bg-[#F67280] text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setActiveTab('epochs')}
        >
          {t('epochs')} ({mockEpochs.length})
        </button>
      </div>

      {/* コンテンツ */}
      {activeTab === 'segments' ? (
        <section>
          {allSegments.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {allSegments.map((segment) => (
                <SegmentCard key={segment.id} segment={segment} showDetails />
              ))}
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
          {mockEpochs.length > 0 ? (
            mockEpochs.map((epoch) => (
              <Link key={epoch.id} href={`/epoch/${epoch.id}`}>
                <Card hoverable>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">
                        {t('epoch')} #{epoch.id}
                      </div>
                      <div className="text-sm text-white/50">
                        Gen {epoch.startGeneration} - {epoch.endGeneration}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        epoch.finalized
                          ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]'
                          : 'bg-[#F4A261]/20 text-[#F4A261]'
                      }`}
                    >
                      {epoch.finalized ? t('revealed') : t('in_progress')}
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
