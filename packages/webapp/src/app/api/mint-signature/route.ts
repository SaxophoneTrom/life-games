import { NextRequest, NextResponse } from 'next/server';
import { keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi-config';

// 環境変数からチェーン選択（NEXT_PUBLIC_CHAIN_IDで統一）
const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === '8453';
const chain = isMainnet ? base : baseSepolia;

/**
 * Mint署名生成API
 *
 * ユーザーがSegment mintを行う前に、このAPIから署名を取得する必要がある。
 * 署名はEPOCH_MINTER_PRIVATE_KEYを使用して生成される。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userAddress,
      nGenerations,
      cellsEncoded, // hex string (0x...)
      fid,
      nonce
    } = body;

    // バリデーション
    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userAddress' },
        { status: 400 }
      );
    }

    if (typeof nGenerations !== 'number' || nGenerations < 10 || nGenerations > 30) {
      return NextResponse.json(
        { error: 'Invalid nGenerations (must be 10-30)' },
        { status: 400 }
      );
    }

    if (!cellsEncoded || typeof cellsEncoded !== 'string' || !cellsEncoded.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid cellsEncoded (must be hex string)' },
        { status: 400 }
      );
    }

    if (typeof fid !== 'number' || fid < 0) {
      return NextResponse.json(
        { error: 'Invalid fid' },
        { status: 400 }
      );
    }

    if (typeof nonce !== 'number' || nonce < 0) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 400 }
      );
    }

    // cellsEncodedの検証（3バイトの倍数）
    const cellsBytes = cellsEncoded.slice(2); // 0x を除去
    if (cellsBytes.length % 6 !== 0) { // 3バイト = 6文字（hex）
      return NextResponse.json(
        { error: 'Invalid cellsEncoded length (must be multiple of 3 bytes)' },
        { status: 400 }
      );
    }

    // 各セルの検証
    const cellCount = cellsBytes.length / 6;
    for (let i = 0; i < cellCount; i++) {
      const x = parseInt(cellsBytes.slice(i * 6, i * 6 + 2), 16);
      const y = parseInt(cellsBytes.slice(i * 6 + 2, i * 6 + 4), 16);
      const colorIndex = parseInt(cellsBytes.slice(i * 6 + 4, i * 6 + 6), 16);

      if (x >= 64 || y >= 64) {
        return NextResponse.json(
          { error: `Cell out of bounds: (${x}, ${y})` },
          { status: 400 }
        );
      }

      if (colorIndex >= 16) {
        return NextResponse.json(
          { error: `Invalid color index: ${colorIndex}` },
          { status: 400 }
        );
      }
    }

    // 秘密鍵の取得
    const privateKey = process.env.EPOCH_MINTER_PRIVATE_KEY;
    if (!privateKey) {
      console.error('EPOCH_MINTER_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // アカウント作成
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // メッセージハッシュを作成（コントラクトと同じ形式）
    // keccak256(abi.encodePacked(msg.sender, nGenerations, keccak256(cellsEncoded), fid, nonce, block.chainid, address(this)))
    const cellsHash = keccak256(cellsEncoded as `0x${string}`);

    // encodePacked形式でハッシュを作成
    const messageHash = keccak256(
      `0x${[
        userAddress.slice(2).toLowerCase().padStart(40, '0'), // address: 20 bytes
        nGenerations.toString(16).padStart(2, '0'), // uint8: 1 byte
        cellsHash.slice(2), // bytes32: 32 bytes
        BigInt(fid).toString(16).padStart(64, '0'), // uint256: 32 bytes
        BigInt(nonce).toString(16).padStart(64, '0'), // uint256: 32 bytes
        chain.id.toString(16).padStart(64, '0'), // uint256: 32 bytes (chainId)
        CONTRACT_ADDRESSES.segmentNFT.slice(2).toLowerCase().padStart(40, '0'), // address: 20 bytes
      ].join('')}` as `0x${string}`
    );

    // 署名を作成
    const signature = await account.signMessage({
      message: { raw: messageHash },
    });

    return NextResponse.json({
      signature,
      nonce,
      signer: account.address,
      messageHash,
    });
  } catch (error) {
    console.error('Error generating mint signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
