'use client';

import { ReactNode, useEffect, useState } from 'react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface SafeAreaWrapperProps {
  children: ReactNode;
}

export function SafeAreaWrapper({ children }: SafeAreaWrapperProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // Farcaster Mini App SDKからsafeAreaInsetsを取得
    const initSafeArea = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        // SDKコンテキストを取得（Promiseを解決）
        const context = await sdk.context;
        if (context?.client?.safeAreaInsets) {
          setInsets(context.client.safeAreaInsets);
        }
      } catch {
        // SDKが利用できない場合はデフォルト値を使用
        console.log('Safe area insets not available');
      }
    };

    initSafeArea();
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0B0F14]"
      style={{
        paddingTop: `calc(44px + ${insets.top}px)`, // Header height + safe area
        paddingBottom: `calc(56px + ${insets.bottom}px)`, // BottomNav height + safe area
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </div>
  );
}
