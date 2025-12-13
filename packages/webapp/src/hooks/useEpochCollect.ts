// ============================================
// Epoch Collect Hooks
// ============================================

import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { EPOCH_ARCHIVE_NFT_ABI } from '@/lib/contracts/epoch-archive-nft-abi';
import { CONTRACT_ADDRESSES, currentChain } from '@/lib/wagmi-config';

interface UseEpochCollectParams {
  epochId: number;
}

interface UseEpochCollectResult {
  // 状態
  isConnected: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  // 計算値
  mintPrice: bigint | undefined;
  // アクション
  collect: () => void;
  reset: () => void;
}

/**
 * 有料でEpoch NFTをcollect
 */
export function useEpochCollect({
  epochId,
}: UseEpochCollectParams): UseEpochCollectResult {
  const { isConnected, address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

  // mint価格を取得
  const { data: mintPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.epochArchiveNFT,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'mintPrice',
    chainId: currentChain.id,
  });

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

  // Collect実行
  const collect = () => {
    if (!isConnected || !address) {
      setError(new Error('Not connected'));
      return;
    }

    if (!mintPrice) {
      setError(new Error('Mint price not loaded'));
      return;
    }

    setError(null);

    writeContract({
      address: CONTRACT_ADDRESSES.epochArchiveNFT,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'collect',
      args: [BigInt(epochId)],
      value: mintPrice,
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
    mintPrice,
    collect,
    reset,
  };
}

interface UseEpochCollectAsContributorParams {
  epochId: number;
  segmentTokenId: number;
}

interface UseEpochCollectAsContributorResult {
  // 状態
  isConnected: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  // アクション
  collect: () => void;
  reset: () => void;
}

/**
 * 貢献者として無料でEpoch NFTをcollect
 */
export function useEpochCollectAsContributor({
  epochId,
  segmentTokenId,
}: UseEpochCollectAsContributorParams): UseEpochCollectAsContributorResult {
  const { isConnected, address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

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

  // Collect実行
  const collect = () => {
    if (!isConnected || !address) {
      setError(new Error('Not connected'));
      return;
    }

    setError(null);

    writeContract({
      address: CONTRACT_ADDRESSES.epochArchiveNFT,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'collectAsContributor',
      args: [BigInt(epochId), BigInt(segmentTokenId)],
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
    collect,
    reset,
  };
}

interface UseCheckContributorStatusParams {
  epochId: number;
  userAddress: `0x${string}` | undefined;
  segmentTokenIds: number[];
}

interface UseCheckContributorStatusResult {
  isContributor: boolean;
  eligibleSegmentId: number;
  hasClaimed: boolean;
  isLoading: boolean;
}

/**
 * 貢献者かどうかを確認
 */
export function useCheckContributorStatus({
  epochId,
  userAddress,
  segmentTokenIds,
}: UseCheckContributorStatusParams): UseCheckContributorStatusResult {
  // 貢献者ステータスを確認
  const { data, isLoading: isLoadingStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.epochArchiveNFT,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'checkContributorStatus',
    args: [
      BigInt(epochId),
      userAddress || '0x0000000000000000000000000000000000000000',
      segmentTokenIds.map((id) => BigInt(id)),
    ],
    chainId: currentChain.id,
    query: {
      enabled: !!userAddress && segmentTokenIds.length > 0,
    },
  });

  // 既にフリーミント済みかを確認
  const { data: hasClaimed, isLoading: isLoadingClaimed } = useReadContract({
    address: CONTRACT_ADDRESSES.epochArchiveNFT,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'contributorClaimed',
    args: [
      BigInt(epochId),
      userAddress || '0x0000000000000000000000000000000000000000',
    ],
    chainId: currentChain.id,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    isContributor: data?.[0] ?? false,
    eligibleSegmentId: Number(data?.[1] ?? 0n),
    hasClaimed: hasClaimed ?? false,
    isLoading: isLoadingStatus || isLoadingClaimed,
  };
}
