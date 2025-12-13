'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EpochMintSuccessDialog } from '@/components/ui/EpochMintSuccessDialog';
import { MiniBoard } from '@/components/board/MiniBoard';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useEpoch, useSegments } from '@/hooks/useOnchainData';
import {
  useEpochCollect,
  useEpochCollectAsContributor,
  useCheckContributorStatus,
} from '@/hooks/useEpochCollect';
import { useMockBoard } from '@/hooks/useMockData';
import { currentChain } from '@/lib/wagmi-config';

// Share機能の有効/無効（環境変数で制御）
const isShareEnabled = process.env.NEXT_PUBLIC_SHARE_ENABLED === 'true';

export default function EpochContent() {
  const params = useParams();
  const t = useTranslation();
  const epochId = Number(params.id);
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isWrongNetwork = chainId !== undefined && chainId !== currentChain.id;

  // オンチェーンデータ取得
  const { data: epoch, isLoading, error } = useEpoch(epochId);

  // ユーザーのセグメント一覧を取得（貢献者判定用）
  const { data: segmentsData } = useSegments(100);
  const mySegmentIds = useMemo(() => {
    if (!isConnected || !address || !segmentsData) return [];
    return segmentsData.segments
      .filter((s) => s.minter.toLowerCase() === address.toLowerCase())
      .map((s) => s.tokenId);
  }, [isConnected, address, segmentsData]);

  // 貢献者判定
  const {
    isContributor,
    eligibleSegmentId,
    hasClaimed,
    isLoading: isCheckingContributor,
  } = useCheckContributorStatus({
    epochId,
    userAddress: address,
    segmentTokenIds: mySegmentIds,
  });

  // Epoch Collect hooks
  const {
    isPending: isPendingPaid,
    isConfirming: isConfirmingPaid,
    isSuccess: isSuccessPaid,
    mintPrice,
    txHash: txHashPaid,
    collect: collectPaid,
    reset: resetPaid,
    error: errorPaid,
  } = useEpochCollect({ epochId });

  const {
    isPending: isPendingFree,
    isConfirming: isConfirmingFree,
    isSuccess: isSuccessFree,
    txHash: txHashFree,
    collect: collectFree,
    reset: resetFree,
    error: errorFree,
  } = useEpochCollectAsContributor({ epochId, segmentTokenId: eligibleSegmentId });

  // プレビュー用ボード状態（本来はartifactURIから取得）
  const boardState = useMockBoard();

  // 成功ダイアログ状態
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | undefined>(undefined);
  const [wasFreeCollect, setWasFreeCollect] = useState(false);

  // 成功時の処理（ダイアログ表示）
  useEffect(() => {
    if (isSuccessPaid || isSuccessFree) {
      setWasFreeCollect(isSuccessFree);
      setMintTxHash(isSuccessFree ? txHashFree : txHashPaid);
      setShowSuccessDialog(true);
      resetPaid();
      resetFree();
    }
  }, [isSuccessPaid, isSuccessFree, txHashPaid, txHashFree, resetPaid, resetFree]);

  // ダイアログを閉じる処理
  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setMintTxHash(undefined);
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
  if (error || !epoch) {
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

  const handleSwitchNetwork = () => {
    switchChain({ chainId: currentChain.id });
  };

  const handleMintPaid = () => {
    collectPaid();
  };

  const handleMintFree = () => {
    collectFree();
  };

  const handleShare = async () => {
    const text = `Check out Epoch #${epoch.id} on Infinite Life! Gen ${epoch.absStartGen}-${epoch.absEndGen}`;
    const url = `${window.location.origin}/epoch/${epoch.id}`;

    try {
      await sdk.actions.composeCast({
        text,
        embeds: [url],
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
    }
  };

  const isLoadingPaid = isPendingPaid || isConfirmingPaid;
  const isLoadingFree = isPendingFree || isConfirmingFree;

  const mintPriceDisplay = mintPrice ? formatEther(mintPrice) + ' ETH' : '0.0001 ETH';

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* Mint成功ダイアログ */}
      <EpochMintSuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleCloseSuccessDialog}
        epochId={epoch.id}
        txHash={mintTxHash}
        artifactURI={epoch.artifactURI}
        absStartGen={epoch.absStartGen}
        absEndGen={epoch.absEndGen}
        isFree={wasFreeCollect}
      />

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          {t('epoch')} #{epoch.id}
        </h1>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            epoch.revealed
              ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]'
              : 'bg-[#F4A261]/20 text-[#F4A261]'
          }`}
        >
          {epoch.revealed ? t('revealed') : t('in_progress')}
        </div>
      </div>

      {/* プレビュー */}
      <Card>
        <div className="aspect-square bg-[#0B0F14] flex items-center justify-center">
          {epoch.revealed && epoch.artifactURI ? (
            // GIF表示（Mini App対応）
            <img
              src={epoch.artifactURI}
              alt={`Epoch #${epoch.id}`}
              className="w-full h-full object-contain"
            />
            // MP4表示（将来用 - Mini Appでは非対応）
            // epoch.artifactURI.endsWith('.mp4') ? (
            //   <video
            //     src={epoch.artifactURI}
            //     autoPlay
            //     loop
            //     muted
            //     playsInline
            //     className="w-full h-full object-contain"
            //   />
            // ) : (
            //   <img
            //     src={epoch.artifactURI}
            //     alt={`Epoch #${epoch.id}`}
            //     className="w-full h-full object-contain"
            //   />
            // )
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
              {epoch.revealed ? t('revealed') : t('in_progress')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{t('generations')}</span>
            <span className="text-white">
              {epoch.absStartGen} - {epoch.absEndGen}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Block Range</span>
            <span className="text-white font-mono text-sm">
              {epoch.startBlock} - {epoch.endBlock || '...'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ミントセクション */}
      {epoch.revealed && (
        <>
          {/* ウォレット未接続時 */}
          {!isConnected && (
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-white/50">{t('connect_wallet_to_mint')}</p>
              </CardContent>
            </Card>
          )}

          {/* ネットワーク切り替えボタン */}
          {isConnected && isWrongNetwork && (
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

          {/* 貢献者として無料mint */}
          {isConnected && !isWrongNetwork && isContributor && (
            <Card className="bg-gradient-to-r from-[#2A9D8F]/20 to-[#264653]/20 border-[#2A9D8F]/30">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <div className="text-white font-medium">
                    {t('you_contributed')}
                  </div>
                </div>

                {hasClaimed ? (
                  <div className="flex items-center gap-2 text-[#2A9D8F]">
                    <span>✓</span>
                    <span>{t('free_nft_claimed')}</span>
                  </div>
                ) : (
                  <>
                    {errorFree && (
                      <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                        {errorFree.message.toLowerCase().includes('reject') ||
                         errorFree.message.toLowerCase().includes('denied') ||
                         errorFree.message.toLowerCase().includes('cancel')
                          ? t('cancelled')
                          : errorFree.message}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleMintFree}
                      disabled={isLoadingFree}
                      isLoading={isLoadingFree}
                    >
                      {isPendingFree
                        ? t('confirm_in_wallet')
                        : isConfirmingFree
                          ? t('confirming')
                          : t('claim_free_nft')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 有料mint（貢献者でない場合または貢献者でClaim済みの追加購入） */}
          {isConnected && !isWrongNetwork && (!isContributor || hasClaimed) && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('mint_price')}</span>
                  <span className="text-lg font-bold text-white">
                    {mintPriceDisplay}
                  </span>
                </div>

                {errorPaid && (
                  <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                    {errorPaid.message.toLowerCase().includes('reject') ||
                     errorPaid.message.toLowerCase().includes('denied') ||
                     errorPaid.message.toLowerCase().includes('cancel')
                      ? t('cancelled')
                      : errorPaid.message}
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleMintPaid}
                  disabled={isLoadingPaid}
                  isLoading={isLoadingPaid}
                >
                  {isPendingPaid
                    ? t('confirm_in_wallet')
                    : isConfirmingPaid
                      ? t('confirming')
                      : t('mint_nft')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 貢献者確認中 */}
          {isConnected && !isWrongNetwork && isCheckingContributor && (
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-white/50">Checking contributor status...</p>
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
        disabled={!isShareEnabled}
      >
        {isShareEnabled ? t('share_on_farcaster') : t('share_suspended')}
      </Button>
    </div>
  );
}
