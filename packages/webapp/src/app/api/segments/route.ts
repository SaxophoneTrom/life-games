import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi-config';

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// セグメント一覧レスポンス型
interface SegmentListItem {
  tokenId: number;
  minter: string;
  fid: number;
  nGenerations: number;
  cellsHash: string;
  mintedAt: number;
}

export async function GET(request: NextRequest) {
  try {
    // コントラクトアドレスの確認
    if (!CONTRACT_ADDRESSES.segmentNFT) {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const owner = searchParams.get('owner'); // 特定オーナーでフィルタ

    let segments: SegmentListItem[] = [];
    let total = 0;

    if (owner) {
      // オーナーでフィルタ: getSegmentsByOwner を使用
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.segmentNFT,
        abi: SEGMENT_NFT_ABI,
        functionName: 'getSegmentsByOwner',
        args: [owner as `0x${string}`, BigInt(offset), BigInt(limit)],
      });

      const [tokenIds, segmentList, totalCount] = result as [bigint[], any[], bigint];
      total = Number(totalCount);

      segments = tokenIds.map((tokenId, i) => ({
        tokenId: Number(tokenId),
        minter: segmentList[i].minter,
        fid: Number(segmentList[i].fid),
        nGenerations: segmentList[i].nGenerations,
        cellsHash: segmentList[i].cellsHash,
        mintedAt: Number(segmentList[i].mintedAt),
      }));
    } else {
      // 全セグメント: getSegments を使用
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.segmentNFT,
        abi: SEGMENT_NFT_ABI,
        functionName: 'getSegments',
        args: [BigInt(offset), BigInt(limit)],
      });

      const [tokenIds, segmentList, totalCount] = result as [bigint[], any[], bigint];
      total = Number(totalCount);

      segments = tokenIds.map((tokenId, i) => ({
        tokenId: Number(tokenId),
        minter: segmentList[i].minter,
        fid: Number(segmentList[i].fid),
        nGenerations: segmentList[i].nGenerations,
        cellsHash: segmentList[i].cellsHash,
        mintedAt: Number(segmentList[i].mintedAt),
      }));
    }

    return NextResponse.json(
      {
        segments,
        total,
        limit,
        offset,
        hasMore: offset + segments.length < total,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60', // 1分キャッシュ
        },
      }
    );
  } catch (error) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch segments' },
      { status: 500 }
    );
  }
}
