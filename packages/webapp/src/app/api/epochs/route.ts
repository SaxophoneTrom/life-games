import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { EPOCH_ARCHIVE_NFT_ABI } from '@/lib/contracts/epoch-archive-nft-abi';

// EpochArchiveNFT コントラクトアドレス
const EPOCH_ARCHIVE_NFT_ADDRESS = process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS as `0x${string}`;

// デプロイ時のブロック番号（イベント検索の開始点）
const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_DEPLOY_BLOCK || '0');

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// エポック一覧レスポンス型
interface EpochListItem {
  epochId: number;
  absStartGen: number;
  absEndGen: number;
  startBlock: number;
  endBlock: number;
  artifactURI: string;
  contributorsCID: string;
  revealed: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // コントラクトアドレスの確認
    if (!EPOCH_ARCHIVE_NFT_ADDRESS || EPOCH_ARCHIVE_NFT_ADDRESS === '0x...') {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 最新のmintされたエポックIDを取得
    const lastMintedEpochId = await publicClient.readContract({
      address: EPOCH_ARCHIVE_NFT_ADDRESS,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'lastMintedEpochId',
    });

    // まだエポックがmintされていない場合
    if (lastMintedEpochId === 0n) {
      return NextResponse.json({
        epochs: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
        lastMintedEpochId: 0,
      });
    }

    // EpochMintedイベントを取得
    const logs = await publicClient.getLogs({
      address: EPOCH_ARCHIVE_NFT_ADDRESS,
      event: parseAbiItem(
        'event EpochMinted(uint256 indexed epochId, uint256 absStartGen, uint256 absEndGen, uint256 startBlock, uint256 endBlock, string artifactURI, string contributorsCID)'
      ),
      fromBlock: DEPLOY_BLOCK,
      toBlock: 'latest',
    });

    // 新しい順にソート（epochIdの降順）
    const sortedLogs = [...logs].sort((a, b) => {
      return Number(b.args.epochId) - Number(a.args.epochId);
    });

    // ページネーション
    const paginatedLogs = sortedLogs.slice(offset, offset + limit);

    // レスポンス形式に変換
    const epochs: EpochListItem[] = paginatedLogs.map((log) => ({
      epochId: Number(log.args.epochId),
      absStartGen: Number(log.args.absStartGen),
      absEndGen: Number(log.args.absEndGen),
      startBlock: Number(log.args.startBlock),
      endBlock: Number(log.args.endBlock),
      artifactURI: log.args.artifactURI as string,
      contributorsCID: log.args.contributorsCID as string,
      revealed: true, // EpochMintedイベントが発生しているので必ずtrue
    }));

    return NextResponse.json(
      {
        epochs,
        total: logs.length,
        limit,
        offset,
        hasMore: offset + limit < logs.length,
        lastMintedEpochId: Number(lastMintedEpochId),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60', // 1分キャッシュ
        },
      }
    );
  } catch (error) {
    console.error('Error fetching epochs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch epochs' },
      { status: 500 }
    );
  }
}
