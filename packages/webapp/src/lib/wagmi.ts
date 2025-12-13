import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

// チェーン設定（環境変数で切り替え）
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532;
const chain = chainId === 8453 ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [chain],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org"),
  },
  connectors: [farcasterMiniApp()],
});
