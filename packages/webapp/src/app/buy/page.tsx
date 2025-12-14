'use client';

import { useState, useMemo } from 'react';
import { SegmentEditor } from '@/components/board/SegmentEditor';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { useMockBoard } from '@/hooks/useMockData';
import { calculatePrice, formatPrice, calculateMaxCells } from '@/lib/price-calculator';
import { Cell, MIN_GENERATIONS, MAX_GENERATIONS } from '@/types';

export default function BuyPage() {
  const t = useTranslation();
  const baseState = useMockBoard();

  // 状態管理
  const [nGenerations, setNGenerations] = useState(15);
  const [selectedColor, setSelectedColor] = useState(5); // #F67280
  const [injectedCells, setInjectedCells] = useState<Cell[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 計算値
  const maxCells = useMemo(() => calculateMaxCells(nGenerations), [nGenerations]);
  const price = useMemo(
    () => calculatePrice(nGenerations, injectedCells.length),
    [nGenerations, injectedCells.length]
  );

  // 購入処理（後でコントラクト連携）
  const handlePurchase = async () => {
    if (injectedCells.length === 0) return;

    setIsPurchasing(true);
    try {
      // TODO: コントラクト呼び出し
      console.log('Purchase:', { nGenerations, injectedCells, price: price.toString() });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // デモ用遅延
      alert('Purchase successful! (Demo)');
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="py-2 space-y-3 animate-fade-in">
      {/* 統合エディタ（ボード + 再生コントロール） */}
      <SegmentEditor
        baseState={baseState}
        injectedCells={injectedCells}
        onCellsChange={setInjectedCells}
        selectedColorIndex={selectedColor}
        maxCells={maxCells}
        nGenerations={nGenerations}
        cellSize={6}
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

      {/* カラーパレット */}
      <Card>
        <CardContent className="py-3">
          <div className="space-y-2">
            <span className="text-sm text-white/70">{t('select_color')}</span>
            <ColorPicker
              selectedIndex={selectedColor}
              onChange={setSelectedColor}
            />
          </div>
        </CardContent>
      </Card>

      {/* 価格と購入 */}
      <Card className="bg-gradient-to-r from-[#F67280]/10 to-[#C06C84]/10 border-[#F67280]/30">
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{t('price')}</span>
            <span className="text-lg font-bold text-white">
              {formatPrice(price)}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={handlePurchase}
            disabled={injectedCells.length === 0 || isPurchasing}
            isLoading={isPurchasing}
          >
            {t('purchase')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
