'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { config } from '@/lib/wagmi-config';
import { LanguageProvider } from '@/components/i18n/LanguageContext';

// QueryClientはクライアントサイドでのみ作成
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1分
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Farcaster Mini App SDK初期化
    // アプリ起動時に一度だけready()を呼び出してスプラッシュスクリーンを非表示にする
    const initFarcasterSdk = async () => {
      try {
        // Mini App環境かどうかを確認
        const isInMiniApp = await sdk.isInMiniApp();
        if (isInMiniApp) {
          await sdk.actions.ready();
        }
      } catch (err) {
        // Mini App環境外（通常ブラウザ）の場合はエラーを無視
        console.debug('Farcaster SDK init skipped:', err);
      }
    };

    initFarcasterSdk();
  }, []);

  // SSR時はシンプルなプレースホルダーを返す
  if (!mounted) {
    return (
      <LanguageProvider>
        <div className="min-h-screen bg-[#0B0F14]">{children}</div>
      </LanguageProvider>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
