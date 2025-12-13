// ============================================
// Segment Mint Hook (with Signature Verification)
// ============================================

import { useState, useMemo, useCallback } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { decodeEventLog } from 'viem';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';
import { CONTRACT_ADDRESSES, currentChain } from '@/lib/wagmi-config';
import type { Cell } from '@/types';

/**
 * セルをbytes形式にエンコード
 * 3バイト/セル: x(1byte), y(1byte), colorIndex(1byte)
 */
function encodeCells(cells: Cell[]): `0x${string}` {
  if (cells.length === 0) return '0x';

  const bytes = new Uint8Array(cells.length * 3);
  cells.forEach((cell, i) => {
    bytes[i * 3] = cell.x;
    bytes[i * 3 + 1] = cell.y;
    bytes[i * 3 + 2] = cell.colorIndex;
  });

  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

interface UseSegmentMintParams {
  nGenerations: number;
  cells: Cell[];
  fid: number;
}

interface UseSegmentMintResult {
  // 状態
  isConnected: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  tokenId: number | undefined;
  // 計算値
  fee: bigint;
  cellsEncoded: `0x${string}`;
  // アクション
  mint: () => void;
  reset: () => void;
}

export function useSegmentMint({
  nGenerations,
  cells,
  fid,
}: UseSegmentMintParams): UseSegmentMintResult {
  const { isConnected, address } = useAccount();
  const [error, setError] = useState<Error | null>(null);
  const [isRequestingSignature, setIsRequestingSignature] = useState(false);

  // セルをエンコード
  const cellsEncoded = encodeCells(cells);

  // コントラクトから手数料設定を取得
  const { data: baseFee } = useReadContract({
    address: CONTRACT_ADDRESSES.segmentNFT,
    abi: SEGMENT_NFT_ABI,
    functionName: 'baseFee',
    chainId: currentChain.id,
  });

  const { data: perGenFee } = useReadContract({
    address: CONTRACT_ADDRESSES.segmentNFT,
    abi: SEGMENT_NFT_ABI,
    functionName: 'perGenFee',
    chainId: currentChain.id,
  });

  const { data: perCellFee } = useReadContract({
    address: CONTRACT_ADDRESSES.segmentNFT,
    abi: SEGMENT_NFT_ABI,
    functionName: 'perCellFee',
    chainId: currentChain.id,
  });

  // 手数料をローカル計算（コントラクトから取得した値を使用）
  const fee = useMemo(() => {
    const base = baseFee ?? 0n;
    const perGen = perGenFee ?? 0n;
    const perCell = perCellFee ?? 0n;
    return base + perGen * BigInt(nGenerations) + perCell * BigInt(cells.length);
  }, [baseFee, perGenFee, perCellFee, nGenerations, cells.length]);

  // コントラクトからnonceを取得
  const { data: contractNonce, refetch: refetchNonce } = useReadContract({
    address: CONTRACT_ADDRESSES.segmentNFT,
    abi: SEGMENT_NFT_ABI,
    functionName: 'getNonce',
    args: address ? [address] : undefined,
    chainId: currentChain.id,
    query: {
      enabled: !!address,
    },
  });

  // トランザクション書き込み
  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();

  // トランザクション確認待ち
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // レシートからtokenIdを取得
  const tokenId = useMemo(() => {
    if (!receipt?.logs) return undefined;

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SEGMENT_NFT_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'SegmentMinted' && 'tokenId' in decoded.args) {
          return Number(decoded.args.tokenId);
        }
      } catch {
        // 他のイベントは無視
      }
    }
    return undefined;
  }, [receipt]);

  // ガスリミット計算（実測ベース最適化版）
  const calculateGasLimit = (cellCount: number): bigint => {
    // 署名検証のオーバーヘッドを考慮して増加
    // 基本ガス: 250,000（ERC721 mint + Storage write + Events + ReentrancyGuard + Signature verification）
    // セルあたり: 800（バリデーションのみ）
    // 30%のバッファを追加（安全マージン）
    const baseGas = 250000;
    const perCellGas = 800;
    const totalGas = Math.floor((baseGas + cellCount * perCellGas) * 1.3);
    return BigInt(totalGas);
  };

  // Mint実行（署名取得→コントラクト呼び出し）
  const mint = useCallback(async () => {
    if (!isConnected || !address || cells.length === 0) {
      setError(new Error('Not connected or no cells'));
      return;
    }

    if (contractNonce === undefined) {
      setError(new Error('Failed to get nonce'));
      return;
    }

    setError(null);
    setIsRequestingSignature(true);

    try {
      // 1. サーバーから署名を取得
      const response = await fetch('/api/mint-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          nGenerations,
          cellsEncoded,
          fid,
          nonce: Number(contractNonce),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signature');
      }

      const { signature } = await response.json();

      setIsRequestingSignature(false);

      // 2. 署名付きでコントラクトを呼び出し
      const gasLimit = calculateGasLimit(cells.length);

      writeContract({
        address: CONTRACT_ADDRESSES.segmentNFT,
        abi: SEGMENT_NFT_ABI,
        functionName: 'mintSegmentWithSignature',
        args: [
          nGenerations,
          cellsEncoded,
          BigInt(fid),
          contractNonce,
          signature as `0x${string}`,
        ],
        value: fee,
        gas: gasLimit,
        chainId: currentChain.id,
      });
    } catch (err) {
      setIsRequestingSignature(false);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [isConnected, address, cells.length, contractNonce, nGenerations, cellsEncoded, fid, fee, writeContract]);

  // リセット
  const reset = useCallback(() => {
    resetWrite();
    setError(null);
    setIsRequestingSignature(false);
    refetchNonce();
  }, [resetWrite, refetchNonce]);

  // isPendingは署名取得中またはトランザクション送信中
  const isPending = isRequestingSignature || isWritePending;

  return {
    isConnected,
    isPending,
    isConfirming,
    isSuccess,
    error: error || writeError || null,
    txHash,
    tokenId,
    fee,
    cellsEncoded,
    mint,
    reset,
  };
}
