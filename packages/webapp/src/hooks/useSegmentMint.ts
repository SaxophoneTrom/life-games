// ============================================
// Segment Mint Hook
// ============================================

import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';
import { CONTRACT_ADDRESSES, currentChain } from '@/lib/wagmi-config';
import { calculatePrice } from '@/lib/price-calculator';
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

  // セルをエンコード
  const cellsEncoded = encodeCells(cells);

  // 手数料はローカル計算（Draw中にRPCを叩かない）
  const fee = calculatePrice(nGenerations, cells.length);

  // トランザクション書き込み
  const {
    data: txHash,
    writeContract,
    isPending,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();

  // トランザクション確認待ち
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ガスリミット計算（実測ベース最適化版）
  const calculateGasLimit = (cellCount: number): bigint => {
    // 実測値: 1,296セルで1,024,399 gas使用
    // 基本ガス: 120,000
    // セルあたり: 800（バリデーションのみ）
    // 30%のバッファを追加（安全マージン）
    const baseGas = 120000;
    const perCellGas = 800;
    const totalGas = Math.floor((baseGas + cellCount * perCellGas) * 1.3);
    return BigInt(totalGas);
  };

  // Mint実行
  const mint = () => {
    if (!isConnected || !address || cells.length === 0) {
      setError(new Error('Not connected or no cells'));
      return;
    }

    setError(null);

    const gasLimit = calculateGasLimit(cells.length);

    writeContract({
      address: CONTRACT_ADDRESSES.segmentNFT,
      abi: SEGMENT_NFT_ABI,
      functionName: 'mintSegment',
      args: [nGenerations, cellsEncoded, BigInt(fid)],
      value: fee,
      gas: gasLimit,
      chainId: currentChain.id,
    });
  };

  // リセット
  const reset = () => {
    resetWrite();
    setError(null);
  };

  return {
    isConnected,
    isPending,
    isConfirming,
    isSuccess,
    error: error || writeError || null,
    txHash,
    fee,
    cellsEncoded,
    mint,
    reset,
  };
}
