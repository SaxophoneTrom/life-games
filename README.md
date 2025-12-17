# Farcaster Infinite Life

Conway's Game of Life をベースにした共同アートプロジェクト。Farcaster Mini App として動作し、Base チェーン上でNFTをミントします。

## コンセプト

### SegmentNFT（個人作品）
- **空盤面（世代0）から**ユーザーが細胞を注入し、n世代進めた「独立作品」
- 即確定mint（Pending→Finalizeパイプライン不要）
- Mini Appがクライアント側でGIF生成・即時表示

### EpochArchiveNFT（共有世界線）
- SegmentNFT mint時に発生する**Contributionログ**を時系列順に適用
- **256世代ごと**にGIFアーカイブとしてmint
- 貢献者（Contributors）は該当Epochを無料mint可能

## 仕様

| パラメータ | 値 |
|-----------|-----|
| ボードサイズ | 64×64（4,096セル） |
| カラーパレット | 16色（インデックス 0〜15） |
| ライフルール | **HighLife (B36/S23)** |
| 世代数/Segment | 10〜30 |
| 世代数/Epoch | 256 |

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router) |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React Query + Zustand |
| Web3 | wagmi + viem |
| バックエンド | Next.js API Routes |
| コントラクト | Foundry (Solidity 0.8.24) |
| Epoch生成 | GitHub Actions |
| チェーン | Base Sepolia (開発) / Base Mainnet (本番) |

## フォルダ構成

```
200_LifeGames/
├── packages/
│   ├── webapp/              # Next.js アプリ（Vercelデプロイ対象）
│   │   ├── src/
│   │   │   ├── app/         # App Router
│   │   │   ├── components/  # 共通コンポーネント
│   │   │   ├── hooks/       # カスタムフック
│   │   │   └── lib/         # ユーティリティ
│   │   └── public/          # 静的ファイル
│   │
│   └── contracts/           # Foundry プロジェクト
│       ├── src/
│       │   ├── SegmentNFT.sol
│       │   └── EpochArchiveNFT.sol
│       ├── test/
│       └── script/
│
├── .github/
│   └── workflows/
│       └── epoch-generator.yml  # Epoch生成用 Actions
│
├── package.json
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
# 環境変数を読み込んでデプロイ
set -a && source .env.local && set +a && \
cd packages/contracts && \
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

## GitHub Actions（Epoch Generator）

256世代分のContributionが溜まると、自動的にEpochArchiveNFTを生成・mint。

### 必要な設定（Repository Settings）

| 種類 | 名前 | 説明 |
|------|------|------|
| Secret | `EPOCH_MINTER_PRIVATE_KEY` | Epoch mint用ウォレットの秘密鍵 |
| Variable | `SEGMENT_NFT_ADDRESS` | SegmentNFTコントラクトアドレス |
| Variable | `EPOCH_ARCHIVE_NFT_ADDRESS` | EpochArchiveNFTコントラクトアドレス |

## チェーン情報

| ネットワーク | Chain ID | RPC URL |
|-------------|----------|---------|
| Base Sepolia | 84532 | https://sepolia.base.org |
| Base Mainnet | 8453 | https://mainnet.base.org |

## ライセンス

MIT
