// ============================================
// Epoch Generator - Contribution取得
// ============================================

import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '../contracts/segment-nft-abi';
import type { Cell } from '@/types';
import type { OnchainSegment, Contribution } from './types';

// 環境変数からコントラクトアドレスを取得
const SEGMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}`;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// ブロック範囲制限（Base Sepoliaの制限: 100,000ブロック）
const MAX_BLOCK_RANGE = 50000n;

/**
 * Public clientを作成
 */
export function createClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/**
 * cellsEncodedをCell[]にデコード
 * 3バイト/セル: x(1), y(1), colorIndex(1)
 */
export function decodeCells(cellsEncoded: `0x${string}`): Cell[] {
  const cells: Cell[] = [];
  const bytes = Buffer.from(cellsEncoded.slice(2), 'hex');

  for (let i = 0; i < bytes.length; i += 3) {
    cells.push({
      x: bytes[i],
      y: bytes[i + 1],
      colorIndex: bytes[i + 2],
    });
  }

  return cells;
}

/**
 * 単一のSegmentを取得
 */
export async function fetchSegment(tokenId: bigint): Promise<OnchainSegment> {
  const client = createClient();

  const segment = await client.readContract({
    address: SEGMENT_NFT_ADDRESS,
    abi: SEGMENT_NFT_ABI,
    functionName: 'getSegment',
    args: [tokenId],
  }) as { minter: `0x${string}`; fid: bigint; nGenerations: number; cellsHash: `0x${string}`; mintedAt: bigint };

  return {
    tokenId,
    minter: segment.minter,
    fid: segment.fid,
    nGenerations: segment.nGenerations,
    cellsHash: segment.cellsHash,
    mintedAt: segment.mintedAt,
  };
}

/**
 * 特定tokenIdのSegmentCellsイベントを取得
 * mintedAtブロック付近のみ検索（ブロック範囲制限対策）
 */
export async function fetchSegmentCells(tokenId: bigint, mintedAt?: bigint): Promise<Cell[]> {
  const client = createClient();

  // mintedAtが指定されている場合、その付近のみ検索
  let fromBlock = 0n;
  let toBlock: bigint | 'latest' = 'latest';

  if (mintedAt !== undefined) {
    // mintedAtの前後100ブロックを検索（イベントは同一ブロックで発生するはず）
    fromBlock = mintedAt > 100n ? mintedAt - 100n : 0n;
    toBlock = mintedAt + 100n;
  } else {
    // mintedAtが不明な場合はチャンク検索
    const currentBlock = await client.getBlockNumber();
    const logs: Cell[] = [];

    for (let start = 0n; start <= currentBlock; start += MAX_BLOCK_RANGE) {
      const end = start + MAX_BLOCK_RANGE - 1n > currentBlock ? currentBlock : start + MAX_BLOCK_RANGE - 1n;

      const chunkLogs = await client.getLogs({
        address: SEGMENT_NFT_ADDRESS,
        event: parseAbiItem('event SegmentCells(uint256 indexed tokenId, bytes cellsEncoded)'),
        args: { tokenId },
        fromBlock: start,
        toBlock: end,
      });

      if (chunkLogs.length > 0) {
        return decodeCells(chunkLogs[0].args.cellsEncoded!);
      }
    }

    console.warn(`No SegmentCells event found for tokenId ${tokenId}`);
    return [];
  }

  const logs = await client.getLogs({
    address: SEGMENT_NFT_ADDRESS,
    event: parseAbiItem('event SegmentCells(uint256 indexed tokenId, bytes cellsEncoded)'),
    args: { tokenId },
    fromBlock,
    toBlock,
  });

  if (logs.length === 0) {
    console.warn(`No SegmentCells event found for tokenId ${tokenId} near block ${mintedAt}`);
    return [];
  }

  return decodeCells(logs[0].args.cellsEncoded!);
}

/**
 * 未処理のContributionを取得
 * lastProcessedBlockより後にmintされたSegmentを取得し、
 * Contribution形式に変換する
 *
 * tokenId順に1つずつ処理（シンプルで効率的）
 */
export async function fetchUnprocessedContributions(
  lastProcessedBlock: bigint
): Promise<Contribution[]> {
  const client = createClient();

  // totalSupplyを取得
  const totalSupply = await client.readContract({
    address: SEGMENT_NFT_ADDRESS,
    abi: SEGMENT_NFT_ABI,
    functionName: 'totalSupply',
  }) as bigint;

  if (totalSupply === 0n) {
    return [];
  }

  const contributions: Contribution[] = [];

  // tokenId 1から順に処理
  for (let tokenId = 1n; tokenId <= totalSupply; tokenId++) {
    const segment = await fetchSegment(tokenId);

    // lastProcessedBlockより後のものだけ処理
    if (segment.mintedAt <= lastProcessedBlock) {
      continue;
    }

    const cells = await fetchSegmentCells(tokenId, segment.mintedAt);

    contributions.push({
      tokenId: segment.tokenId,
      fid: segment.fid,
      nGenerations: segment.nGenerations,
      cells,
      blockNumber: segment.mintedAt,
    });
  }

  // ブロック番号順にソート（決定論的順序）
  contributions.sort((a, b) => {
    if (a.blockNumber < b.blockNumber) return -1;
    if (a.blockNumber > b.blockNumber) return 1;
    // 同一ブロック内ではtokenId順
    if (a.tokenId < b.tokenId) return -1;
    if (a.tokenId > b.tokenId) return 1;
    return 0;
  });

  return contributions;
}

/**
 * 最新のSegment tokenIdを取得
 */
export async function fetchNextTokenId(): Promise<bigint> {
  const client = createClient();

  const nextTokenId = await client.readContract({
    address: SEGMENT_NFT_ADDRESS,
    abi: SEGMENT_NFT_ABI,
    functionName: 'nextTokenId',
  });

  return nextTokenId as bigint;
}

/**
 * 全Segmentを取得（genesis〜現在）
 * 初回Epoch生成時に使用
 *
 * tokenId順に1つずつ処理（シンプルで効率的）
 */
export async function fetchAllContributions(): Promise<Contribution[]> {
  // lastProcessedBlock = 0 で全件取得
  return fetchUnprocessedContributions(0n);
}
