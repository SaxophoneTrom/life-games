// ============================================
// Farcaster Context Hook
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// SDKからコンテキスト型を推論
type MiniAppContext = Awaited<typeof sdk.context>;

interface UseFarcasterContextResult {
  // コンテキスト情報
  context: MiniAppContext | null;
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
  // 状態
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  // アクション
  signIn: () => Promise<void>;
}

/**
 * Farcaster Mini App SDKからユーザー情報を取得するhook
 */
export function useFarcasterContext(): UseFarcasterContextResult {
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        // Mini App内で実行されているか確認
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        // SDKを初期化してコンテキストを取得
        const ctx = await sdk.context;
        setContext(ctx);
        setIsReady(true);

        // ready()を呼び出してスプラッシュ画面を非表示
        await sdk.actions.ready();
      } catch (err) {
        console.error('Farcaster SDK initialization error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize Farcaster SDK'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeSdk();
  }, []);

  // Sign In with Farcaster
  const signIn = useCallback(async () => {
    try {
      const nonce = Math.random().toString(36).substring(2);
      const result = await sdk.actions.signIn({ nonce });
      console.log('Sign in result:', result);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err : new Error('Sign in failed'));
    }
  }, []);

  // ユーザー情報を抽出
  const user = context?.user;

  return {
    context,
    fid: user?.fid ?? null,
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    pfpUrl: user?.pfpUrl ?? null,
    isLoading,
    isReady,
    error,
    signIn,
  };
}

/**
 * Farcaster環境外でもFIDを取得するためのフォールバック付きhook
 * 開発時やブラウザ直接アクセス時のためのモックFIDを提供
 */
export function useFid(): { fid: number; isLoading: boolean; isMock: boolean } {
  const { fid, isLoading } = useFarcasterContext();

  // Farcaster環境外の場合はモックFIDを使用
  const isMock = fid === null;
  const effectiveFid = fid ?? 12345; // 開発用モックFID

  return {
    fid: effectiveFid,
    isLoading,
    isMock,
  };
}
