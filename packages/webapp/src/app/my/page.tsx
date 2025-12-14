'use client';

import { useState, useMemo } from 'react';
import { SegmentCard } from '@/components/segment/SegmentCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockSegments } from '@/hooks/useMockData';
import type { Epoch } from '@/types';

type MyTab = 'segments' | 'epochs';

// モック: 無料ミント可能なエポック
const mockFreeMintEpochs: Epoch[] = [
  {
    id: 1,
    tokenId: 1,
    startGeneration: 1,
    endGeneration: 1000,
    finalized: true,
    contributors: [],
  },
];

// モック: 自分のエポックNFT
const mockMyEpochs: Epoch[] = [
  {
    id: 2,
    tokenId: 2,
    startGeneration: 1001,
    endGeneration: 2000,
    finalized: true,
    mediaUrl: undefined,
    contributors: [],
  },
];

export default function MyPage() {
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<MyTab>('segments');

  const allSegments = useMockSegments(30);

  // モック: 自分のセグメント（IDが偶数のものを自分のものとする）
  const mySegments = useMemo(
    () => allSegments.filter((s) => s.id % 2 === 0),
    [allSegments]
  );

  const handleClaimFreeMint = (epochId: number) => {
    console.log('Claim free mint for epoch:', epochId);
    alert(`Free mint claimed for Epoch #${epochId}! (Demo)`);
  };

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* 無料ミント可能エポック */}
      {mockFreeMintEpochs.length > 0 && (
        <section>
          <Card className="bg-gradient-to-r from-[#2A9D8F]/20 to-[#264653]/20 border-[#2A9D8F]/30">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <div className="text-white font-medium">{t('free_mint_available')}</div>
                  <div className="text-sm text-white/50">{t('you_contributed')}</div>
                </div>
              </div>
              {mockFreeMintEpochs.map((epoch) => (
                <Button
                  key={epoch.id}
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleClaimFreeMint(epoch.id)}
                >
                  {t('claim_free_nft')} - Epoch #{epoch.id}
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

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
          {t('segments')} ({mySegments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'epochs'
              ? 'bg-[#F67280] text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setActiveTab('epochs')}
        >
          {t('epochs')} ({mockMyEpochs.length})
        </button>
      </div>

      {/* コンテンツ */}
      {activeTab === 'segments' ? (
        <section>
          {mySegments.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {mySegments.map((segment) => (
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
        <section>
          {mockMyEpochs.length > 0 ? (
            <div className="space-y-3">
              {mockMyEpochs.map((epoch) => (
                <Card key={epoch.id} hoverable>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">Epoch #{epoch.id}</div>
                      <div className="text-sm text-white/50">
                        Gen {epoch.startGeneration} - {epoch.endGeneration}
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                      <span className="text-white/30 text-xs">NFT</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">No epoch NFTs yet</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
