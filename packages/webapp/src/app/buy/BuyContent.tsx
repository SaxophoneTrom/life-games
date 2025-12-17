'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSwitchChain } from 'wagmi';
import { SegmentEditor } from '@/components/board/SegmentEditor';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { StampPicker } from '@/components/ui/StampPicker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { MintSuccessDialog } from '@/components/ui/MintSuccessDialog';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useEmptyBoard } from '@/hooks/useMockData';
import { useFid } from '@/hooks/useFarcasterContext';
import { useSegmentMint } from '@/hooks/useSegmentMint';
import { calculatePrice, formatPrice } from '@/lib/price-calculator';
import { currentChain } from '@/lib/wagmi-config';
import { Cell, MIN_GENERATIONS, MAX_GENERATIONS } from '@/types';
import { StampTemplate } from '@/lib/stamps';
import { formatEther } from 'viem';

export default function BuyContent() {
  const t = useTranslation();
  const router = useRouter();

  // チェーン関連（useAccountからchainIdを取得してウォレットの実際のチェーンを検出）
  const { chainId } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isWrongNetwork = chainId !== undefined && chainId !== currentChain.id;

  // 新仕様: 空盤面から始まる独立作品
  const baseState = useEmptyBoard();

  // Farcaster FID取得
  const { fid, isMock: isMockFid } = useFid();

  // 状態管理
  const [nGenerations, setNGenerations] = useState(15);
  const [selectedColor, setSelectedColor] = useState(5);
  const [injectedCells, setInjectedCells] = useState<Cell[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<StampTemplate | null>(null);
  const [isWatchMode, setIsWatchMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintedCells, setMintedCells] = useState<Cell[]>([]);
  const [mintedGenerations, setMintedGenerations] = useState(0);

  // Segment Mint hook
  const {
    isConnected,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash,
    fee,
    mint,
    reset,
  } = useSegmentMint({
    nGenerations,
    cells: injectedCells,
    fid,
  });

  // 計算値（フォールバック用）
  const estimatedPrice = useMemo(
    () => calculatePrice(nGenerations, injectedCells.length),
    [nGenerations, injectedCells.length]
  );

  // 実際の手数料またはフォールバック
  const displayPrice = fee ? formatEther(fee) + ' ETH' : formatPrice(estimatedPrice);

  // Mint成功時にダイアログ表示
  useEffect(() => {
    if (isSuccess && txHash) {
      // 成功時のセル・世代数を保持してダイアログ表示
      setMintedCells([...injectedCells]);
      setMintedGenerations(nGenerations);
      setShowSuccessDialog(true);
    }
  }, [isSuccess, txHash, injectedCells, nGenerations]);

  // ダイアログを閉じた時の処理
  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    reset();
    router.push('/gallery');
  };

  // ネットワーク切り替え処理
  const handleSwitchNetwork = () => {
    switchChain({ chainId: currentChain.id });
  };

  // Mint処理
  const handleMint = async () => {
    if (injectedCells.length === 0) return;
    mint();
  };

  // ローディング状態の判定
  const isLoading = isPending || isConfirming;
  const buttonText = isPending
    ? t('confirm_in_wallet')
    : isConfirming
      ? t('confirming')
      : t('mint');

  return (
    <div className="py-2 space-y-3 animate-fade-in">
      {/* 統合エディタ（ボード + 再生コントロール） */}
      <SegmentEditor
        baseState={baseState}
        injectedCells={injectedCells}
        onCellsChange={setInjectedCells}
        selectedColorIndex={selectedColor}
        nGenerations={nGenerations}
        cellSize={6}
        selectedStamp={selectedStamp}
        onWatchModeChange={setIsWatchMode}
      />

      {/* 世代数スライダー */}
      <Card>
        <CardContent className="py-3">
          <Slider
            value={nGenerations}
            min={MIN_GENERATIONS}
            max={MAX_GENERATIONS}
            onChange={setNGenerations}
            label={t('generations')}
          />
        </CardContent>
      </Card>

      {/* カラーパレット & スタンプ */}
      <Card>
        <CardContent className="py-3 space-y-3">
          <div className="space-y-2">
            <span className="text-sm text-white/70">{t('select_color')}</span>
            <ColorPicker
              selectedIndex={selectedColor}
              onChange={setSelectedColor}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm text-white/70">{t('stamps')}</span>
            <StampPicker
              selectedStampId={selectedStamp?.id ?? null}
              onSelect={setSelectedStamp}
            />
          </div>
        </CardContent>
      </Card>

      {/* 価格と購入 */}
      <Card className="bg-gradient-to-r from-[#F67280]/10 to-[#C06C84]/10 border-[#F67280]/30">
        <CardContent className="py-3 space-y-3">
          {/* FIDステータス */}
          {isMockFid && (
            <div className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2 py-1 rounded">
              Demo mode: Using mock FID ({fid})
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{t('price')}</span>
            <span className="text-lg font-bold text-white">{displayPrice}</span>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
              {error.message.toLowerCase().includes('reject') ||
               error.message.toLowerCase().includes('denied') ||
               error.message.toLowerCase().includes('cancel')
                ? t('cancelled')
                : error.message}
            </div>
          )}

          {/* ウォレット未接続時 */}
          {!isConnected && (
            <div className="text-xs text-white/50 text-center">
              {t('connect_wallet_to_mint')}
            </div>
          )}

          {/* ネットワーク切り替えボタン or Mintボタン */}
          {isConnected && isWrongNetwork ? (
            <Button
              size="lg"
              className="w-full"
              onClick={handleSwitchNetwork}
              disabled={isSwitchingChain}
              isLoading={isSwitchingChain}
            >
              {t('switch_network')} ({currentChain.name})
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={handleMint}
              disabled={
                injectedCells.length === 0 ||
                isLoading ||
                isWatchMode ||
                !isConnected
              }
              isLoading={isLoading}
            >
              {buttonText}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mint成功ダイアログ */}
      <MintSuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleCloseSuccessDialog}
        txHash={txHash}
        cells={mintedCells}
        nGenerations={mintedGenerations}
      />
    </div>
  );
}
