import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { EPOCH_ARCHIVE_NFT_ABI } from '@/lib/contracts/epoch-archive-nft-abi';
import { currentChain } from '@/lib/wagmi-config';

// EpochArchiveNFT コントラクトアドレス
const EPOCH_ARCHIVE_NFT_ADDRESS = process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS as `0x${string}`;

// Public client for reading contract（環境変数でチェーン切り替え）
const publicClient = createPublicClient({
  chain: currentChain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
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

    // コントラクトからgetEpochsを呼び出し（イベントログ検索不要）
    const [epochIds, epochList, total] = await publicClient.readContract({
      address: EPOCH_ARCHIVE_NFT_ADDRESS,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'getEpochs',
      args: [BigInt(offset), BigInt(limit)],
    });

    // レスポンス形式に変換
    const epochs: EpochListItem[] = epochIds.map((epochId, index) => {
      const epoch = epochList[index];
      return {
        epochId: Number(epochId),
        absStartGen: Number(epoch.absStartGen),
        absEndGen: Number(epoch.absEndGen),
        startBlock: Number(epoch.startBlock),
        endBlock: Number(epoch.endBlock),
        artifactURI: epoch.artifactURI,
        contributorsCID: epoch.contributorsCID,
        revealed: epoch.revealed,
      };
    });

    return NextResponse.json(
      {
        epochs,
        total: Number(total),
        limit,
        offset,
        hasMore: offset + limit < Number(total),
        lastMintedEpochId: Number(total),
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
