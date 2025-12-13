'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { SegmentCard } from '@/components/segment/SegmentCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useSegments, useEpochs } from '@/hooks/useOnchainData';
import {
  useEpochCollectAsContributor,
  useCheckContributorStatus,
} from '@/hooks/useEpochCollect';
import { EPOCH_ARCHIVE_NFT_ABI } from '@/lib/contracts/epoch-archive-nft-abi';
import { CONTRACT_ADDRESSES, currentChain } from '@/lib/wagmi-config';
import type { Epoch } from '@/types';

type MyTab = 'segments' | 'epochs';

export default function MyContent() {
  const t = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyTab>('segments');
  const [claimingEpochId, setClaimingEpochId] = useState<number | null>(null);
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isWrongNetwork = chainId !== undefined && chainId !== currentChain.id;

  // オンチェーンデータ取得
  const {
    data: segmentsData,
    isLoading: segmentsLoading,
    error: segmentsError,
  } = useSegments(100);

  const {
    data: epochsData,
    isLoading: epochsLoading,
  } = useEpochs(50);

  // 接続中のアドレスが所有するセグメントをフィルタ
  const allSegments = segmentsData?.segments ?? [];
  const mySegments = useMemo(() => {
    if (!isConnected || !address) return [];
    return allSegments.filter(
      (s) => s.minter.toLowerCase() === address.toLowerCase()
    );
  }, [isConnected, address, allSegments]);

  const mySegmentIds = useMemo(
    () => mySegments.map((s) => s.tokenId),
    [mySegments]
  );

  // 公開済みエポック一覧
  const revealedEpochs = useMemo(
    () => (epochsData?.epochs ?? []).filter((e) => e.revealed),
    [epochsData]
  );

  // 貢献者判定（各エポックに対して）
  // 簡易実装: 最初の公開済みエポックのみ判定
  const firstRevealedEpoch = revealedEpochs[0];
  const {
    isContributor,
    eligibleSegmentId,
    isLoading: isCheckingContributor,
  } = useCheckContributorStatus({
    epochId: firstRevealedEpoch?.id ?? 0,
    userAddress: address,
    segmentTokenIds: mySegmentIds,
  });

  // 無料mint可能なエポック
  const freeMintEpochs: Epoch[] = useMemo(() => {
    if (!isContributor || !firstRevealedEpoch) return [];
    return [firstRevealedEpoch];
  }, [isContributor, firstRevealedEpoch]);

  // EpochArchiveNFT所有確認
  const { data: epochBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.epochArchiveNFT,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000', BigInt(1)],
    chainId: currentChain.id,
    query: {
      enabled: isConnected && !!address,
    },
  });

  // 所有しているエポックを取得（簡易実装：balanceOf > 0 のもの）
  const myEpochs: Epoch[] = useMemo(() => {
    if (!epochBalance || epochBalance === 0n) return [];
    // 現状は簡易実装（個別のbalanceOf確認が必要）
    return revealedEpochs.slice(0, Number(epochBalance));
  }, [epochBalance, revealedEpochs]);

  // Free mint hook
  const {
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimSuccess,
    collect: collectFree,
    reset: resetClaim,
    error: claimError,
  } = useEpochCollectAsContributor({
    epochId: claimingEpochId ?? 0,
    segmentTokenId: eligibleSegmentId,
  });

  // 成功表示状態
  const [showSuccess, setShowSuccess] = useState(false);

  // Claim成功時の処理
  useEffect(() => {
    if (isClaimSuccess) {
      setShowSuccess(true);
      resetClaim();
      setClaimingEpochId(null);
      // 3秒後に自動で消す
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isClaimSuccess, resetClaim]);

  const handleSwitchNetwork = () => {
    switchChain({ chainId: currentChain.id });
  };

  const handleClaimFreeMint = (epochId: number) => {
    setClaimingEpochId(epochId);
    collectFree();
  };

  const isClaimLoading = isClaimPending || isClaimConfirming;

  // ウォレット未接続時
  if (!isConnected) {
    return (
      <div className="py-4 space-y-4 animate-fade-in">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-white/50 mb-4">{t('connect_wallet_to_view')}</p>
            <p className="text-white/30 text-sm">
              Connect your wallet to view your segments and epochs
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* 成功メッセージ */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#2A9D8F] text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          🎉 {t('transaction_success')}
        </div>
      )}

      {/* ネットワーク切り替えボタン */}
      {isWrongNetwork && (
        <Card>
          <CardContent className="py-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSwitchNetwork}
              disabled={isSwitchingChain}
              isLoading={isSwitchingChain}
            >
              {t('switch_network')} ({currentChain.name})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 無料ミント可能エポック */}
      {!isWrongNetwork && freeMintEpochs.length > 0 && (
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

              {claimError && (
                <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                  {claimError.message.toLowerCase().includes('reject') ||
                   claimError.message.toLowerCase().includes('denied') ||
                   claimError.message.toLowerCase().includes('cancel')
                    ? t('cancelled')
                    : claimError.message}
                </div>
              )}

              {freeMintEpochs.map((epoch) => (
                <Button
                  key={epoch.id}
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleClaimFreeMint(epoch.id)}
                  disabled={isClaimLoading && claimingEpochId === epoch.id}
                  isLoading={isClaimLoading && claimingEpochId === epoch.id}
                >
                  {isClaimPending && claimingEpochId === epoch.id
                    ? t('confirm_in_wallet')
                    : isClaimConfirming && claimingEpochId === epoch.id
                      ? t('confirming')
                      : `${t('claim_free_nft')} - Epoch #${epoch.id}`}
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
          {t('segments')} ({segmentsLoading ? '...' : mySegments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'epochs'
              ? 'bg-[#F67280] text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          onClick={() => setActiveTab('epochs')}
        >
          {t('epochs')} ({epochsLoading ? '...' : myEpochs.length})
        </button>
      </div>

      {/* コンテンツ */}
      {activeTab === 'segments' ? (
        <section>
          {segmentsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">Loading...</p>
              </CardContent>
            </Card>
          ) : segmentsError ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-red-400">Error loading segments</p>
              </CardContent>
            </Card>
          ) : mySegments.length > 0 ? (
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
          {epochsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-white/50">Loading...</p>
              </CardContent>
            </Card>
          ) : myEpochs.length > 0 ? (
            <div className="space-y-3">
              {myEpochs.map((epoch) => (
                <Card
                  key={epoch.id}
                  hoverable
                  onClick={() => router.push(`/epoch/${epoch.id}`)}
                >
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">Epoch #{epoch.id}</div>
                      <div className="text-sm text-white/50">
                        Gen {epoch.absStartGen} - {epoch.absEndGen}
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                      {epoch.artifactURI ? (
                        <img
                          src={epoch.artifactURI}
                          alt={`Epoch #${epoch.id}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-white/30 text-xs">NFT</span>
                      )}
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
