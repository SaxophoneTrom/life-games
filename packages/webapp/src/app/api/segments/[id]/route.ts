import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';
import { Cell } from '@/types';

// SegmentNFT コントラクトアドレス
const SEGMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}`;

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// セグメント詳細レスポンス型
interface SegmentDetail {
  tokenId: number;
  minter: string;
  fid: number;
  nGenerations: number;
  cellsHash: string;
  mintedAt: number;
  blockNumber: number;
  cells: Cell[];
  owner: string;
}

// cellsEncodedをデコードしてCell配列に変換
function decodeCells(cellsEncoded: `0x${string}`): Cell[] {
  const cells: Cell[] = [];
  // 0x プレフィックスを除去
  const hex = cellsEncoded.slice(2);
  // 3バイト（6文字）ごとに処理
  for (let i = 0; i < hex.length; i += 6) {
    const x = parseInt(hex.slice(i, i + 2), 16);
    const y = parseInt(hex.slice(i + 2, i + 4), 16);
    const colorIndex = parseInt(hex.slice(i + 4, i + 6), 16);
    cells.push({ x, y, colorIndex });
  }
  return cells;
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
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // 現在のオーナーを取得
    let owner: string;
    try {
      owner = await publicClient.readContract({
        address: SEGMENT_NFT_ADDRESS,
        abi: SEGMENT_NFT_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
      });
    } catch {
      // トークンが存在しない場合
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // mintedAtブロック番号をピンポイントで指定してイベント取得
    const mintedAtBlock = BigInt(segment.mintedAt);

    // SegmentCellsイベントからcellsEncodedを取得
    const cellsLogs = await publicClient.getLogs({
      address: SEGMENT_NFT_ADDRESS,
      event: parseAbiItem(
        'event SegmentCells(uint256 indexed tokenId, bytes cellsEncoded)'
      ),
      args: {
        tokenId: tokenId,
      },
      fromBlock: mintedAtBlock,
      toBlock: mintedAtBlock,
    });

    // セルデータをデコード
    let cells: Cell[] = [];
    if (cellsLogs.length > 0) {
      const cellsEncoded = cellsLogs[0].args.cellsEncoded as `0x${string}`;
      cells = decodeCells(cellsEncoded);
    }

    const blockNumber = Number(segment.mintedAt);

    // レスポンスを構築
    const response: SegmentDetail = {
      tokenId: Number(tokenId),
      minter: segment.minter,
      fid: Number(segment.fid),
      nGenerations: segment.nGenerations,
      cellsHash: segment.cellsHash,
      mintedAt: Number(segment.mintedAt),
      blockNumber,
      cells,
      owner,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ（セグメントは不変）
      },
    });
  } catch (error) {
    console.error('Error fetching segment:', error);

    // トークンが存在しない場合のエラーハンドリング
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch segment' },
      { status: 500 }
    );
  }
}
