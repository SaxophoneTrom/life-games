import { NextRequest } from 'next/server';
import { ImageResponse } from '@vercel/og';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SEGMENT_NFT_ABI } from '@/lib/contracts/segment-nft-abi';
import { Cell, BOARD_SIZE, PALETTE_RGB } from '@/types';

// Edge runtime for @vercel/og
export const runtime = 'edge';

// SegmentNFT コントラクトアドレス
const SEGMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}`;

// Public client for reading contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

// OG画像サイズ
const OG_WIDTH = 1200;
const OG_HEIGHT = 800;

// OGフレームテンプレートの窓設定
const WINDOW_SIZE = 512; // 窓の大きさ
const WINDOW_X = 344;    // 窓のX座標
const WINDOW_Y = 219;    // 窓のY座標（630の中央付近に配置するためのオフセット調整）

const BOARD_SIZE_PX = WINDOW_SIZE; // ボード描画サイズ = 窓サイズ
const CELL_SIZE = BOARD_SIZE_PX / BOARD_SIZE; // 512 / 64 = 8

// cellsEncodedをデコードしてCell配列に変換
function decodeCells(cellsEncoded: `0x${string}`): Cell[] {
  const cells: Cell[] = [];
  const hex = cellsEncoded.slice(2);
  for (let i = 0; i < hex.length; i += 6) {
    const x = parseInt(hex.slice(i, i + 2), 16);
    const y = parseInt(hex.slice(i + 2, i + 4), 16);
    const colorIndex = parseInt(hex.slice(i + 4, i + 6), 16);
    cells.push({ x, y, colorIndex });
  }
  return cells;
}

// RGB配列をCSS色文字列に変換
function rgbToString(rgb: readonly [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// デフォルトOG画像を返す（静的画像ファイル）
async function generateDefaultOgImage(): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-life-games.vercel.app';
  const imageUrl = `${baseUrl}/OG_base.png`;

  // 静的画像にリダイレクト
  return Response.redirect(imageUrl, 302);
}

// セル付きOG画像を生成（フレーム画像の窓位置にセルを描画）
function generateCellsOgImage(cells: Cell[]): ImageResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-life-games.vercel.app';
  const frameImageUrl = `${baseUrl}/OG_frame.png`;
  const bgColor = rgbToString(PALETTE_RGB[0]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* 背景にフレーム画像 */}
        <img
          src={frameImageUrl}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* 窓の位置にボード描画エリア */}
        <div
          style={{
            position: 'absolute',
            left: WINDOW_X,
            top: WINDOW_Y,
            width: WINDOW_SIZE,
            height: WINDOW_SIZE,
            backgroundColor: bgColor,
            display: 'flex',
          }}
        >
          {/* セルを描画 */}
          {cells.map((cell, index) => {
            const rgb = PALETTE_RGB[cell.colorIndex] || PALETTE_RGB[1];
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: cell.x * CELL_SIZE,
                  top: cell.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: rgbToString(rgb),
                }}
              />
            );
          })}
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // デバッグログ: 環境変数確認
    console.log('[OG DEBUG] id:', id);
    console.log('[OG DEBUG] SEGMENT_NFT_ADDRESS:', SEGMENT_NFT_ADDRESS);
    console.log('[OG DEBUG] RPC_URL:', process.env.NEXT_PUBLIC_RPC_URL);
    console.log('[OG DEBUG] APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    // "default" または無効なIDの場合はデフォルト画像を返す
    if (id === 'default' || id === '0') {
      console.log('[OG DEBUG] Returning default image (id is default or 0)');
      return await generateDefaultOgImage();
    }

    const tokenId = BigInt(id);

    // コントラクトアドレスの確認
    if (!SEGMENT_NFT_ADDRESS || SEGMENT_NFT_ADDRESS === '0x...') {
      console.log('[OG DEBUG] Returning default image (invalid contract address)');
      return await generateDefaultOgImage();
    }

    // コントラクトからセグメントデータを取得
    let segment;
    try {
      console.log('[OG DEBUG] Fetching segment from contract...');
      segment = await publicClient.readContract({
        address: SEGMENT_NFT_ADDRESS,
        abi: SEGMENT_NFT_ABI,
        functionName: 'getSegment',
        args: [tokenId],
      });
      console.log('[OG DEBUG] Segment fetched:', JSON.stringify(segment, (_, v) => typeof v === 'bigint' ? v.toString() : v));
    } catch (contractError) {
      console.error('[OG DEBUG] Contract read error:', contractError);
      return await generateDefaultOgImage();
    }

    // セグメントが存在しない場合（minterがゼロアドレス）
    if (segment.minter === '0x0000000000000000000000000000000000000000') {
      console.log('[OG DEBUG] Returning default image (minter is zero address)');
      return await generateDefaultOgImage();
    }

    // mintedAtブロック番号からイベント取得
    const mintedAtBlock = BigInt(segment.mintedAt);
    console.log('[OG DEBUG] mintedAtBlock:', mintedAtBlock.toString());

    // SegmentCellsイベントからcellsEncodedを取得
    console.log('[OG DEBUG] Fetching SegmentCells event logs...');
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
    console.log('[OG DEBUG] cellsLogs count:', cellsLogs.length);

    // セルデータをデコード
    let cells: Cell[] = [];
    if (cellsLogs.length > 0) {
      const cellsEncoded = cellsLogs[0].args.cellsEncoded as `0x${string}`;
      console.log('[OG DEBUG] cellsEncoded length:', cellsEncoded.length);
      cells = decodeCells(cellsEncoded);
      console.log('[OG DEBUG] decoded cells count:', cells.length);
    }

    // セルがない場合はデフォルト画像
    if (cells.length === 0) {
      console.log('[OG DEBUG] Returning default image (no cells)');
      return await generateDefaultOgImage();
    }

    // セル付きOG画像を生成
    console.log('[OG DEBUG] Generating cells OG image with', cells.length, 'cells');
    return generateCellsOgImage(cells);
  } catch (error) {
    console.error('[OG DEBUG] Unexpected error:', error);
    return await generateDefaultOgImage();
  }
}
