// ============================================
// Epoch Generator - EpochArchiveNFT Mint
// ============================================

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { EPOCH_ARCHIVE_NFT_ABI } from '../contracts/epoch-archive-nft-abi';
import { currentChain } from '../wagmi-config';
import type { MintEpochParams } from './types';

// 環境変数（NEXT_PUBLIC_RPC_URLで統一）
const EPOCH_ARCHIVE_NFT_ADDRESS = process.env
  .NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS as `0x${string}`;
const EPOCH_MINTER_PRIVATE_KEY = process.env.EPOCH_MINTER_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * EpochArchiveNFTをmintする
 *
 * @param params Mint用パラメータ
 * @returns Transaction hash
 */
export async function mintEpoch(params: MintEpochParams): Promise<`0x${string}`> {
  if (!EPOCH_MINTER_PRIVATE_KEY) {
    throw new Error('EPOCH_MINTER_PRIVATE_KEY is not set');
  }

  if (!EPOCH_ARCHIVE_NFT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS is not set');
  }

  // アカウント作成
  const account = privateKeyToAccount(EPOCH_MINTER_PRIVATE_KEY);

  // クライアント作成（環境変数でチェーン切り替え）
  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: currentChain,
    transport: http(RPC_URL),
  });

  console.log(`Minting Epoch ${params.epochId} from ${account.address}`);

  // コントラクト引数を整形（struct形式）
  const contractParams = {
    epochId: params.epochId,
    startStateRoot: params.startStateRoot,
    startStateCID: params.startStateCID,
    endStateRoot: params.endStateRoot,
    endStateCID: params.endStateCID,
    artifactURI: params.artifactURI,
    metadataURI: params.metadataURI,
    contributorsCID: params.contributorsCID,
    contributorsRoot: params.contributorsRoot,
    startBlock: params.startBlock,
    endBlock: params.endBlock,
  } as const;

  // Gas見積もり
  const gasEstimate = await publicClient.estimateContractGas({
    address: EPOCH_ARCHIVE_NFT_ADDRESS,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'mintEpoch',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: [contractParams] as any,
    account,
  });

  console.log(`Gas estimate: ${gasEstimate}`);

  // トランザクション送信
  const hash = await walletClient.writeContract({
    address: EPOCH_ARCHIVE_NFT_ADDRESS,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'mintEpoch',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: [contractParams] as any,
    gas: (gasEstimate * 120n) / 100n, // 20%バッファ
  });

  console.log(`Transaction submitted: ${hash}`);

  // トランザクション完了を待つ
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${hash}`);
  }

  console.log(`Epoch ${params.epochId} minted successfully!`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed}`);

  return hash;
}

/**
 * 最後にmintされたEpoch IDを取得
 */
export async function getLastMintedEpochId(): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(RPC_URL),
  });

  const lastMintedEpochId = await publicClient.readContract({
    address: EPOCH_ARCHIVE_NFT_ADDRESS,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'lastMintedEpochId',
  });

  return lastMintedEpochId as bigint;
}

/**
 * Epoch情報を取得
 */
export async function getEpoch(epochId: bigint): Promise<{
  absStartGen: bigint;
  absEndGen: bigint;
  startStateRoot: `0x${string}`;
  startStateCID: string;
  endStateRoot: `0x${string}`;
  endStateCID: string;
  artifactURI: string;
  metadataURI: string;
  contributorsCID: string;
  contributorsRoot: `0x${string}`;
  startBlock: bigint;
  endBlock: bigint;
  revealed: boolean;
}> {
  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(RPC_URL),
  });

  const epoch = await publicClient.readContract({
    address: EPOCH_ARCHIVE_NFT_ADDRESS,
    abi: EPOCH_ARCHIVE_NFT_ABI,
    functionName: 'getEpoch',
    args: [epochId],
  });

  return epoch as any;
}
