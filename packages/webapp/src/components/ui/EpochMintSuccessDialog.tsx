'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { useTranslation } from '@/components/i18n/LanguageContext';

// Share機能の有効/無効（環境変数で制御）
const isShareEnabled = process.env.NEXT_PUBLIC_SHARE_ENABLED === 'true';

interface EpochMintSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  epochId: number;
  txHash?: string;
  artifactURI?: string;
  absStartGen: number;
  absEndGen: number;
  isFree?: boolean;
}

/**
 * Epoch Mint成功時に表示するダイアログ
 * - アーティファクト画像表示
 * - Farcasterシェアボタン
 * - トランザクションリンク
 */
export function EpochMintSuccessDialog({
  isOpen,
  onClose,
  epochId,
  txHash,
  artifactURI,
  absStartGen,
  absEndGen,
  isFree = false,
}: EpochMintSuccessDialogProps) {
  const t = useTranslation();

  // Farcasterでシェア（SDK経由）
  const handleShareFarcaster = async () => {
    const text = isFree
      ? `I claimed Epoch #${epochId} as a contributor on Infinite Life! Gen ${absStartGen}-${absEndGen}`
      : `I collected Epoch #${epochId} on Infinite Life! Gen ${absStartGen}-${absEndGen}`;
    const url = `${window.location.origin}/epoch/${epochId}`;

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
            <p className="text-sm text-white/50">
              {t('epoch')} #{epochId}
            </p>
          </div>

          {/* アーティファクト画像 */}
          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden bg-[#1a1f26]">
              {artifactURI ? (
                <img
                  src={artifactURI}
                  alt={`Epoch #${epochId}`}
                  className="w-full max-w-[280px] h-auto object-contain"
                />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center">
                  <span className="text-white/30">{t('epoch')} #{epochId}</span>
                </div>
              )}
            </div>
          </div>

          {/* 世代範囲 */}
          <div className="text-center text-sm text-white/70">
            {t('generations')}: {absStartGen} - {absEndGen}
          </div>

          {/* 貢献者バッジ */}
          {isFree && (
            <div className="text-center">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#2A9D8F]/20 text-[#2A9D8F] rounded text-xs">
                🎁 {t('you_contributed')}
              </span>
            </div>
          )}

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
