'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useTranslation } from '@/components/i18n/LanguageContext';
import { Button } from './Button';

/**
 * ウォレット接続ボタン（SSG対応ラッパー）
 * SSGビルド時はwagmiフックが使えないため、マウント後のみ内部コンポーネントをレンダリング
 */
export function ConnectButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSG時のプレースホルダー
    return (
      <Button size="sm" variant="secondary" disabled className="text-xs opacity-50">
        ...
      </Button>
    );
  }

  return <ConnectButtonInner />;
}

/**
 * 内部コンポーネント（マウント後のみレンダリング）
 * - 未接続時: Connectボタンを表示
 * - 接続時: アドレス短縮表示 + クリックで切断
 */
function ConnectButtonInner() {
  const t = useTranslation();
  const { address, isConnected, isConnecting } = useAccount();
  const { connectors, connect, status } = useConnect();
  const { disconnect } = useDisconnect();

  // 接続中
  if (isConnecting || status === 'pending') {
    return (
      <Button size="sm" variant="secondary" disabled className="text-xs">
        ...
      </Button>
    );
  }

  // 接続済み
  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <button
        onClick={() => disconnect()}
        className="px-2 py-1 text-xs font-mono bg-[#2A9D8F]/20 text-[#2A9D8F] rounded hover:bg-[#2A9D8F]/30 transition-colors"
        title={t('disconnect')}
      >
        {shortAddress}
      </button>
    );
  }

  // 未接続 - 最初のコネクターで接続
  const connector = connectors[0];
  if (!connector) {
    return null;
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => connect({ connector })}
      className="text-xs"
    >
      {t('connect_wallet')}
    </Button>
  );
}
