import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';

// SegmentNFT コントラクトアドレス
const SEGMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}`;

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// NFTメタデータ標準形式
interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tokenId = BigInt(id);

    // コントラクトアドレスの確認
    if (!SEGMENT_NFT_ADDRESS || SEGMENT_NFT_ADDRESS === '0x...') {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // コントラクトからセグメントデータを取得
    const segment = await publicClient.readContract({
      address: SEGMENT_NFT_ADDRESS,
      abi: SEGMENT_NFT_ABI,
      functionName: 'getSegment',
      args: [tokenId],
    });

    // セグメントが存在しない場合（minterがゼロアドレス）
    if (segment.minter === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // アプリURL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';

    // メタデータを構築
    const metadata: NFTMetadata = {
      name: `Infinite Life Segment #${id}`,
      description: `An independent Game of Life artwork created with HighLife rules (B36/S23). Starting from an empty 64x64 board, this piece evolves through ${segment.nGenerations} generations of cellular automaton simulation.`,
      external_url: `${appUrl}/segment/${id}`,
      attributes: [
        {
          trait_type: 'Generations',
          value: segment.nGenerations,
        },
        {
          trait_type: 'Farcaster FID',
          value: Number(segment.fid),
        },
        {
          trait_type: 'Minted At Block',
          value: Number(segment.mintedAt),
        },
        {
          trait_type: 'Creator',
          value: segment.minter,
        },
        {
          trait_type: 'Cells Hash',
          value: segment.cellsHash,
        },
      ],
    };

    // CORSヘッダーを設定（OpenSeaなど外部からのアクセス用）
    return NextResponse.json(metadata, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
      },
    });
  } catch (error) {
    console.error('Error fetching token metadata:', error);

    // トークンが存在しない場合のエラーハンドリング
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
}
