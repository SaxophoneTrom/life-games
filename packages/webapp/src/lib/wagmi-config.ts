import { http, createConfig } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Base Sepolia（開発用）と Base Mainnet（本番用）
export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

// 現在の環境に応じたチェーン
export const currentChain =
  process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;

// コントラクトアドレス（Base Sepolia デプロイ済み 2025-12-17 v3 - getSegments追加版）
export const CONTRACT_ADDRESSES = {
  segmentNFT: (process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS ||
    '0xACF68f1cC38FEf3fdf6f784D3011FE7F2C146D75') as `0x${string}`,
  epochArchiveNFT: (process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS ||
    '0x7f4D3a770eB0b313EEb9E3EdCF1c99BF036E9582') as `0x${string}`,
};
