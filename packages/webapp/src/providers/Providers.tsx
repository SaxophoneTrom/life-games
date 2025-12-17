'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
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
