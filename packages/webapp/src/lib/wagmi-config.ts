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

// コントラクトアドレス（Base Sepolia デプロイ済み 2025-12-19 v6 - 署名検証版）
export const CONTRACT_ADDRESSES = {
  segmentNFT: (process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS ||
    '0x83329e0f070660810231B577EBAa5e1Facbde1a2') as `0x${string}`,
  epochArchiveNFT: (process.env.NEXT_PUBLIC_EPOCH_ARCHIVE_NFT_ADDRESS ||
    '0xC1F4eC40B0DCdA6323498ac90E72499Bdfee0F72') as `0x${string}`,
};
