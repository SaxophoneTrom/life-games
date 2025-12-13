# Life Games - プロジェクト CLAUDE.md

## プロジェクト概要

Farcaster Mini App として動作する、Conway's Game of Life を題材にした週次NFTコンペティションアプリ。
ユーザーは20×20のボードを設計し、256世代シミュレーション後の生存セル数が目標値に近いほど高スコアを獲得。
Base チェーン上でNFTとしてミントし、週次で賞金を分配する。

---

## フォルダ構成（モノレポ）

```
200_LifeGames/
├── CLAUDE.md                    # このファイル（プロジェクトルール）
├── .gitignore                   # Git除外設定
├── .env.example                 # 環境変数テンプレート（Git管理）
├── package.json                 # ルートpackage.json（スクリプト用）
├── pnpm-workspace.yaml          # pnpmワークスペース設定
│
├── packages/
│   ├── webapp/                  # Next.js アプリ（Vercelデプロイ対象）
│   │   ├── src/
│   │   │   ├── app/             # App Router
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx     # ホーム画面
│   │   │   │   ├── editor/      # エディタ画面
│   │   │   │   ├── leaderboard/ # リーダーボード画面
│   │   │   │   ├── my/          # マイページ画面
│   │   │   │   ├── admin/       # 管理画面
│   │   │   │   └── api/         # API Routes
│   │   │   ├── components/      # 共通コンポーネント
│   │   │   ├── hooks/           # カスタムフック
│   │   │   ├── lib/             # ユーティリティ
│   │   │   ├── providers/       # Context Providers
│   │   │   └── types/           # TypeScript型定義
│   │   ├── public/              # 静的ファイル
│   │   └── package.json
│   │
│   └── contracts/               # Foundry プロジェクト
│       ├── foundry.toml
│       ├── src/
│       │   ├── LifeLeagueNFT.sol
│       │   ├── SeasonSettlement.sol
│       │   ├── WallRegistry.sol
│       │   └── libraries/
│       │       └── BoardLib.sol
│       ├── test/
│       ├── script/
│       └── lib/                 # forge dependencies (Git除外)
│
└── docs/
    ├── requirements/            # 要件定義ドキュメント（Git除外）
    └── life_games_spec_v0_1.md
```

---

## Vercelデプロイ設定

Vercelにデプロイする際は以下の設定を使用：

| 項目 | 値 |
|------|-----|
| Root Directory | `packages/webapp` |
| Build Command | `pnpm build` |
| Output Directory | `.next` |

---

## 要件定義ドキュメント参照

実装前に必ず以下のドキュメントを確認すること：

| ドキュメント | パス | 内容 |
|-------------|------|------|
| MVP要件定義 | `docs/requirements/mvp_requirements_v1.md` | ユーザーストーリー、画面仕様、スコアリング |
| 技術スタック | `docs/requirements/tech_stack_v1.md` | 使用技術、DB設計、環境変数 |
| コントラクト仕様 | `docs/requirements/smart_contract_spec_v1.md` | 3つのコントラクト詳細 |
| API仕様 | `docs/requirements/api_spec_v1.md` | エンドポイント、認証フロー |

---

## セキュリティルール【絶対厳守】

### 秘密情報のハードコード厳禁

以下の情報は**絶対に**ソースコードにハードコードしてはならない：

- `SIGNER_PRIVATE_KEY` - サーバー署名用秘密鍵
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase管理キー
- `ALCHEMY_API_KEY` - Alchemy APIキー
- `BASESCAN_API_KEY` - Basescan APIキー
- 管理者ウォレットアドレスのリスト
- TOTP秘密鍵
- その他すべてのAPIキー、秘密鍵、トークン

### 環境変数の管理

```
✅ 正しい方法:
   - .env.local に記載（Git除外）
   - Vercelの環境変数設定で管理
   - process.env.XXX で参照

❌ 禁止行為:
   - ソースコードへの直接記載
   - .env.example に実際の値を記載
   - コミットメッセージに秘密情報を含める
   - console.log で秘密情報を出力
```

### コミット前チェック

コミット前に以下を確認：
1. `git diff --staged` で秘密情報が含まれていないか
2. `.env` ファイルがステージングされていないか
3. ログ出力に秘密情報が含まれていないか

---

## 開発ルール

### 技術スタック（固定）

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React Query + Zustand |
| Web3 | wagmi + viem |
| バックエンド | Next.js API Routes |
| データベース | Supabase (PostgreSQL) |
| コントラクト | Foundry (Solidity 0.8.24) |
| チェーン | Base Sepolia (開発) → Base Mainnet (本番) |

### コマンド

```bash
# ルートから実行
pnpm dev           # webapp 開発サーバー起動
pnpm build         # webapp ビルド
pnpm forge:build   # コントラクトビルド
pnpm forge:test    # コントラクトテスト
```

### コーディング規約

1. **TypeScript 必須** - any型の使用は極力避ける
2. **エラーハンドリング** - try-catch で適切にエラー処理
3. **コメント** - 複雑なロジックには日本語コメント
4. **命名規則**
   - コンポーネント: PascalCase
   - 関数・変数: camelCase
   - 定数: UPPER_SNAKE_CASE
   - ファイル: kebab-case または camelCase

### Git運用

- `main` ブランチへの直接pushは禁止
- 機能ごとにブランチを作成
- コミットメッセージは日本語可

---

## チェーン情報

### Base Sepolia（開発）

| 項目 | 値 |
|------|-----|
| Chain ID | 84532 |
| RPC URL | https://sepolia.base.org |
| Block Explorer | https://sepolia.basescan.org |

### Base Mainnet（本番）

| 項目 | 値 |
|------|-----|
| Chain ID | 8453 |
| RPC URL | https://mainnet.base.org |
| Block Explorer | https://basescan.org |

---

## 重要な仕様

### スコア計算式

```
finalAlive = 256世代後の生存セル数
distance = |finalAlive - targetAlive|
baseScore = 400 - distance

if (finalAlive == targetAlive) {
    score = baseScore + 100  // ぴったり賞ボーナス
} else {
    score = baseScore
}

最高スコア: 500点
```

### ボードエンコーディング

- 20×20グリッド = 400ビット
- 2つの bytes32 (boardA, boardB) で表現
- boardA: bit 0-255, boardB: bit 0-143 (上位112ビットは0)

### 時間計算（JST基準）

```
JST_OFFSET = 32400 seconds (9時間)
WEEK = 604800 seconds
DAY = 86400 seconds

seasonId = floor((block.timestamp + JST_OFFSET) / WEEK) (uint32)
dayIndex = floor((block.timestamp + JST_OFFSET) / DAY) (uint32)
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-13 | 初版作成 |
| 2025-12-14 | モノレポ構成に変更 |
| 2025-12-14 | プロジェクト名を Life Games に変更 |
