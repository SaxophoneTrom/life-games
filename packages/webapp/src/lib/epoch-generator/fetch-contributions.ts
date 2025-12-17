// ============================================
// Epoch Generator - Contribution取得
// ============================================

import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '../contracts/segment-nft-abi';
import type { Cell } from '@/types';
import type { OnchainSegment, SegmentWithCells, Contribution } from './types';

// 環境変数からコントラクトアドレスを取得
const SEGMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}`;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

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
 * 特定のブロック範囲のSegmentMintedイベントを取得
 */
export async function fetchSegmentMintedEvents(
  fromBlock: bigint,
  toBlock?: bigint
): Promise<OnchainSegment[]> {
  const client = createClient();

  const logs = await client.getLogs({
    address: SEGMENT_NFT_ADDRESS,
    event: parseAbiItem(
      'event SegmentMinted(uint256 indexed tokenId, address indexed minter, uint256 indexed fid, uint8 nGenerations, bytes32 cellsHash)'
    ),
    fromBlock,
    toBlock: toBlock || 'latest',
  });

  return logs.map((log) => ({
    tokenId: log.args.tokenId!,
    minter: log.args.minter!,
    fid: log.args.fid!,
    nGenerations: log.args.nGenerations!,
    cellsHash: log.args.cellsHash!,
    mintedAt: log.blockNumber,
  }));
}

/**
 * 特定tokenIdのSegmentCellsイベントを取得
 */
export async function fetchSegmentCells(tokenId: bigint): Promise<Cell[]> {
  const client = createClient();

  const logs = await client.getLogs({
    address: SEGMENT_NFT_ADDRESS,
    event: parseAbiItem('event SegmentCells(uint256 indexed tokenId, bytes cellsEncoded)'),
    args: { tokenId },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  if (logs.length === 0) {
    console.warn(`No SegmentCells event found for tokenId ${tokenId}`);
    return [];
  }

  return decodeCells(logs[0].args.cellsEncoded!);
}

/**
 * 未処理のContributionを取得
 * lastProcessedBlockから現在までのSegmentを取得し、
 * Contribution形式に変換する
 */
export async function fetchUnprocessedContributions(
  lastProcessedBlock: bigint
): Promise<Contribution[]> {
  const client = createClient();
  const currentBlock = await client.getBlockNumber();

  // SegmentMintedイベントを取得
  const segments = await fetchSegmentMintedEvents(lastProcessedBlock + 1n, currentBlock);

  // 各Segmentに対してcellsEncodedを取得
  const contributions: Contribution[] = [];

  for (const segment of segments) {
    const cells = await fetchSegmentCells(segment.tokenId);

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
 */
export async function fetchAllContributions(): Promise<Contribution[]> {
  return fetchUnprocessedContributions(0n);
}
