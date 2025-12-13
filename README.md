# Life Games

Conway's Game of Life を題材にした週次NFTコンペティション。Farcaster Mini App として動作し、Base チェーン上でNFTをミントします。

## 概要

- 20×20のボードを設計
- 256世代シミュレーション後の生存セル数が目標値に近いほど高スコア
- 週次で賞金を分配

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React Query + Zustand |
| Web3 | wagmi + viem |
| バックエンド | Next.js API Routes |
| データベース | Supabase (PostgreSQL) |
| コントラクト | Foundry (Solidity 0.8.24) |
| チェーン | Base Sepolia (開発) / Base Mainnet (本番) |

## フォルダ構成

```
life-games/
├── packages/
│   ├── webapp/          # Next.js アプリ
│   └── contracts/       # Foundry コントラクト
├── package.json         # ルート（ワークスペーススクリプト）
└── pnpm-workspace.yaml
```

## セットアップ

### 必要なツール

- Node.js 20+
- pnpm 9+
- Foundry

### インストール

```bash
# 依存関係のインストール
pnpm install

# Foundry依存関係のインストール
cd packages/contracts
forge install
```

### 環境変数

```bash
# テンプレートをコピー
cp .env.example .env.local

# .env.local を編集して必要な値を設定
```

## 開発コマンド

```bash
# Next.js 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# Lint
pnpm lint

# コントラクトビルド
pnpm forge:build

# コントラクトテスト
pnpm forge:test
```

## デプロイ

### Vercel（フロントエンド）

| 設定項目 | 値 |
|---------|-----|
| Root Directory | `packages/webapp` |
| Build Command | `pnpm build` |
| Output Directory | `.next` |

### コントラクト

```bash
cd packages/contracts

# Base Sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# Base Mainnet
forge script script/Deploy.s.sol --rpc-url base_mainnet --broadcast --verify
```

## チェーン情報

| ネットワーク | Chain ID | RPC URL |
|-------------|----------|---------|
| Base Sepolia | 84532 | https://sepolia.base.org |
| Base Mainnet | 8453 | https://mainnet.base.org |

## ライセンス

MIT
