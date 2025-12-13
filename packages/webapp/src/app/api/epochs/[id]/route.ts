import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { EPOCH_ARCHIVE_NFT_ABI } from '@/lib/contracts/epoch-archive-nft-abi';

// EpochArchiveNFT コントラクトアドレス
const EPOCH_ARCHIVE_NFT_ADDRESS = process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS as `0x${string}`;

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// エポック詳細レスポンス型
interface EpochDetail {
  epochId: number;
  absStartGen: number;
  absEndGen: number;
  startStateRoot: string;
  startStateCID: string;
  endStateRoot: string;
  endStateCID: string;
  artifactURI: string;
  metadataURI: string;
  contributorsCID: string;
  contributorsRoot: string;
  startBlock: number;
  endBlock: number;
  revealed: boolean;
  mintPrice: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const epochId = BigInt(id);

    // コントラクトアドレスの確認
    if (!EPOCH_ARCHIVE_NFT_ADDRESS || EPOCH_ARCHIVE_NFT_ADDRESS === '0x...') {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // コントラクトからエポックデータを取得
    const epoch = await publicClient.readContract({
      address: EPOCH_ARCHIVE_NFT_ADDRESS,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'getEpoch',
      args: [epochId],
    });

    // エポックが存在しない場合（revealedがfalse）
    if (!epoch.revealed) {
      return NextResponse.json(
        { error: 'Epoch not found or not yet revealed' },
        { status: 404 }
      );
    }

    // mintPriceを取得
    const mintPrice = await publicClient.readContract({
      address: EPOCH_ARCHIVE_NFT_ADDRESS,
      abi: EPOCH_ARCHIVE_NFT_ABI,
      functionName: 'mintPrice',
    });

    // レスポンスを構築
    const response: EpochDetail = {
      epochId: Number(epochId),
      absStartGen: Number(epoch.absStartGen),
      absEndGen: Number(epoch.absEndGen),
      startStateRoot: epoch.startStateRoot,
      startStateCID: epoch.startStateCID,
      endStateRoot: epoch.endStateRoot,
      endStateCID: epoch.endStateCID,
      artifactURI: epoch.artifactURI,
      metadataURI: epoch.metadataURI,
      contributorsCID: epoch.contributorsCID,
      contributorsRoot: epoch.contributorsRoot,
      startBlock: Number(epoch.startBlock),
      endBlock: Number(epoch.endBlock),
      revealed: epoch.revealed,
      mintPrice: mintPrice.toString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ（エポックは不変）
      },
    });
  } catch (error) {
    console.error('Error fetching epoch:', error);

    return NextResponse.json(
      { error: 'Failed to fetch epoch' },
      { status: 500 }
    );
  }
}
