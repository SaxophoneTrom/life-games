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
 * コントラクトのgetSegments()を使用してSegment一覧を取得
 * （イベントスキャン不要、ブロック範囲制限なし）
 */
export async function fetchAllSegmentsFromContract(): Promise<OnchainSegment[]> {
  const client = createClient();

  // まずtotalSupplyを取得
  const totalSupply = await client.readContract({
    address: SEGMENT_NFT_ADDRESS,
    abi: SEGMENT_NFT_ABI,
    functionName: 'totalSupply',
  }) as bigint;

  if (totalSupply === 0n) {
    return [];
  }

  // ページネーションで全件取得（古い順にソートするため逆順で取得）
  const PAGE_SIZE = 100n;
  const allSegments: OnchainSegment[] = [];

  for (let offset = 0n; offset < totalSupply; offset += PAGE_SIZE) {
    const [tokenIds, segmentList] = await client.readContract({
      address: SEGMENT_NFT_ADDRESS,
      abi: SEGMENT_NFT_ABI,
      functionName: 'getSegments',
      args: [offset, PAGE_SIZE],
    }) as [bigint[], { minter: `0x${string}`; fid: bigint; nGenerations: number; cellsHash: `0x${string}`; mintedAt: bigint }[], bigint];

    for (let i = 0; i < tokenIds.length; i++) {
      allSegments.push({
        tokenId: tokenIds[i],
        minter: segmentList[i].minter,
        fid: segmentList[i].fid,
        nGenerations: segmentList[i].nGenerations,
        cellsHash: segmentList[i].cellsHash,
        mintedAt: segmentList[i].mintedAt,
      });
    }
  }

  // tokenId順（古い順）にソート
  allSegments.sort((a, b) => {
    if (a.tokenId < b.tokenId) return -1;
    if (a.tokenId > b.tokenId) return 1;
    return 0;
  });

  return allSegments;
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
 * コントラクトのgetSegments()を使用（イベントスキャン不要）
 */
export async function fetchUnprocessedContributions(
  lastProcessedBlock: bigint
): Promise<Contribution[]> {
  // コントラクトから全Segmentを取得
  const allSegments = await fetchAllSegmentsFromContract();

  // lastProcessedBlockより後のものをフィルタ
  const unprocessedSegments = allSegments.filter(
    (seg) => seg.mintedAt > lastProcessedBlock
  );

  // 各Segmentに対してcellsEncodedを取得
  const contributions: Contribution[] = [];

  for (const segment of unprocessedSegments) {
    const cells = await fetchSegmentCells(segment.tokenId, segment.mintedAt);

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
 * コントラクトのgetSegments()を使用（イベントスキャン不要）
 */
export async function fetchAllContributions(): Promise<Contribution[]> {
  // コントラクトから全Segmentを取得
  const allSegments = await fetchAllSegmentsFromContract();

  // 各Segmentに対してcellsEncodedを取得
  const contributions: Contribution[] = [];

  for (const segment of allSegments) {
    const cells = await fetchSegmentCells(segment.tokenId, segment.mintedAt);

    contributions.push({
      tokenId: segment.tokenId,
      fid: segment.fid,
      nGenerations: segment.nGenerations,
      cells,
      blockNumber: segment.mintedAt,
    });
  }

  // tokenId順（古い順）にソート
  contributions.sort((a, b) => {
    if (a.tokenId < b.tokenId) return -1;
    if (a.tokenId > b.tokenId) return 1;
    return 0;
  });

  return contributions;
}
