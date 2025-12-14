'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MiniBoard } from '@/components/board/MiniBoard';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockBoard } from '@/hooks/useMockData';
import type { Epoch } from '@/types';

// モック: 全エポック一覧
const mockEpochs: Epoch[] = [
  {
    id: 1,
    tokenId: 1,
    startGeneration: 1,
    endGeneration: 256,
    finalized: true,
    mediaUrl: undefined,
    contributors: ['0x0000000000000000000000000000000000000002'], // モック: 自分が貢献
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

// モック: 自分のアドレス
const mockUserAddress = '0x0000000000000000000000000000000000000002';

// モック: ミント価格
const MINT_PRICE = '0.0001 ETH';

export default function EpochDetailPage() {
  const params = useParams();
  const t = useTranslation();
  const epochId = Number(params.id);
  const boardState = useMockBoard();

  const [isMinting, setIsMinting] = useState(false);

  const epoch = useMemo(
    () => mockEpochs.find((e) => e.id === epochId),
    [epochId]
  );

  // モック: コントリビューターかどうか
  const isContributor = useMemo(
    () => epoch?.contributors.includes(mockUserAddress) ?? false,
    [epoch]
  );

  if (!epoch) {
    return (
      <div className="py-8 text-center animate-fade-in">
        <p className="text-white/50">{t('error')}</p>
        <Link href="/gallery">
          <Button variant="secondary" className="mt-4">
            {t('gallery')}
          </Button>
        </Link>
      </div>
    );
  }

  const handleMint = async () => {
    setIsMinting(true);
    try {
      // TODO: コントラクト呼び出し
      console.log('Mint Epoch:', epochId, 'isContributor:', isContributor);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(`Epoch #${epochId} minted! (Demo)`);
    } catch (error) {
      console.error('Mint failed:', error);
    } finally {
      setIsMinting(false);
    }
  };

  const handleShare = () => {
    const shareText = `Check out Epoch #${epoch.id} on Infinite Life! Gen ${epoch.startGeneration}-${epoch.endGeneration}`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          {t('epoch')} #{epoch.id}
        </h1>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            epoch.finalized
              ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]'
              : 'bg-[#F4A261]/20 text-[#F4A261]'
          }`}
        >
          {epoch.finalized ? t('revealed') : t('in_progress')}
        </div>
      </div>

      {/* プレビュー */}
      <Card>
        <div className="aspect-square bg-[#0B0F14] flex items-center justify-center">
          {epoch.finalized && epoch.mediaUrl ? (
            <video
              src={epoch.mediaUrl}
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
            <span className="text-white">
              {epoch.finalized ? t('revealed') : t('in_progress')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('generations')}</span>
            <span className="text-white">
              {epoch.startGeneration} - {epoch.endGeneration}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ミントセクション */}
      {epoch.finalized && (
        <>
          {isContributor ? (
            <Card className="bg-gradient-to-r from-[#2A9D8F]/20 to-[#264653]/20 border-[#2A9D8F]/30">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <div className="text-white font-medium">
                    {t('you_contributed')}
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleMint}
                  disabled={isMinting}
                  isLoading={isMinting}
                >
                  {t('claim_free_nft')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('mint_price')}</span>
                  <span className="text-lg font-bold text-white">
                    {MINT_PRICE}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleMint}
                  disabled={isMinting}
                  isLoading={isMinting}
                >
                  {t('mint_nft')}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* シェアボタン */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleShare}
      >
        {t('share_on_farcaster')}
      </Button>
    </div>
  );
}
