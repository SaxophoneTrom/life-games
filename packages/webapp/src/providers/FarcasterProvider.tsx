"use client";

import { useEffect, useState, type ReactNode } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

type FarcasterProviderProps = {
  children: ReactNode;
};

export function FarcasterProvider({ children }: FarcasterProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initMiniApp = async () => {
      try {
        // Mini App環境かどうかをチェック
        const isMiniApp = await sdk.isInMiniApp();

        if (isMiniApp) {
          // Mini App環境の場合、readyを呼び出してスプラッシュスクリーンを非表示
          await sdk.actions.ready();
        }

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Mini App:", error);
        // エラーが発生しても通常のWebアプリとして動作
        setIsReady(true);
      }
    };

    initMiniApp();
  }, []);

  // 初期化完了前はローディング表示
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
