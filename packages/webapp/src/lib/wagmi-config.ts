import { http, createConfig } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';

// Base Sepolia（開発用）と Base Mainnet（本番用）
export const config = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

// 現在の環境に応じたチェーン
export const currentChain = process.env.NODE_ENV === 'production' ? base : baseSepolia;

// コントラクトアドレス（デプロイ後に更新）
export const CONTRACT_ADDRESSES = {
  segmentNFT: process.env.NEXT_PUBLIC_SEGMENT_NFT_ADDRESS as `0x${string}` | undefined,
  epochNFT: process.env.NEXT_PUBLIC_EPOCH_NFT_ADDRESS as `0x${string}` | undefined,
};
