# Farcaster Infinite Life - プロジェクト CLAUDE.md

## プロジェクト概要

Farcaster Mini App として動作する、共有型 Conway's Game of Life アートプロジェクト。
64×64、16色のグローバル共有ボードに対して、ユーザーが「セグメント」（5〜30世代、範囲は変更可能）を購入し、
セルを注入してシミュレーションを進める。各セグメントはNFTとしてミントされ、
後からオフチェーンレンダラーでMP4が生成されて公開される。

### コンセプト
- **1つのグローバルボード**: 全ユーザーで共有、世代は単調増加
- **セグメント購入**: 5〜30世代分を購入（範囲は変更可能）、最大 `floor(n/2)` 個のセルを注入
- **即時ミント → 後で公開**: pending NFT → MP4 reveal
- **Farcaster連携**: FIDをオンチェーン記録

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
│   │   │   │   ├── page.tsx     # ホーム画面（ボード表示）
│   │   │   │   ├── buy/         # セグメント購入画面
│   │   │   │   ├── segment/[id] # セグメント詳細画面
│   │   │   │   └── api/         # API Routes
│   │   │   │       ├── token/[id]/route.ts    # NFTメタデータ
│   │   │   │       └── dispatch-render/route.ts
│   │   │   ├── components/      # 共通コンポーネント
│   │   │   ├── hooks/           # カスタムフック
│   │   │   ├── lib/             # ユーティリティ
│   │   │   │   ├── life-engine.ts    # Life シミュレーション（決定論的）
│   │   │   │   ├── color-rules.ts    # 16色カラールール
│   │   │   │   ├── state-encoding.ts # StateV1 エンコーディング
│   │   │   │   └── gif-renderer.ts   # プレビューGIF生成
│   │   │   ├── providers/       # Context Providers
│   │   │   └── types/           # TypeScript型定義
│   │   ├── public/              # 静的ファイル
│   │   └── package.json
│   │
│   └── contracts/               # Foundry プロジェクト
│       ├── foundry.toml
│       ├── src/
│       │   └── SegmentNFT.sol   # メインコントラクト
│       ├── test/
│       ├── script/
│       └── lib/                 # forge dependencies (Git除外)
│
├── .github/
│   └── workflows/
│       └── render-segment.yml   # セグメントレンダリング用 Actions
│
├── _backup_life_league/         # 旧プロジェクトバックアップ（Git除外）
│
└── docs/
    ├── requirements/
    │   ├── art/
    │   │   └── farcaster_infinite_life_mvp_spec.md  # MVP仕様書【必読】
    │   └── battle/              # 旧プロジェクト要件（参照用）
    └── TODO_old.md              # 旧TODO
```

---

## Vercelデプロイ設定

| 項目 | 値 |
|------|-----|
| Root Directory | `packages/webapp` |
| Build Command | `pnpm build` |
| Output Directory | `.next` |

---

## 要件定義ドキュメント参照【必読】

実装前に必ず以下のドキュメントを確認すること：

| ドキュメント | パス | 内容 |
|-------------|------|------|
| **MVP仕様書** | `docs/requirements/art/farcaster_infinite_life_mvp_spec.md` | 全体設計、コントラクト、API、レンダリング |
| **詳細設計書** | `docs/requirements/art/detailed_design.md` | コントラクト詳細、DB設計、画面設計、i18n |

---

## セキュリティルール【絶対厳守】

### 秘密情報のハードコード厳禁

以下の情報は**絶対に**ソースコードにハードコードしてはならない：

- `FINALIZER_PRIVATE_KEY` - セグメント確定用秘密鍵
- `GITHUB_TOKEN` - GitHub Actions dispatch用
- `ALCHEMY_API_KEY` - Alchemy APIキー
- `BASESCAN_API_KEY` - Basescan APIキー
- その他すべてのAPIキー、秘密鍵、トークン

### 環境変数の管理

```
✅ 正しい方法:
   - .env.local に記載（Git除外）
   - Vercelの環境変数設定で管理
   - GitHub Secretsで管理（Actions用）
   - process.env.XXX で参照

❌ 禁止行為:
   - ソースコードへの直接記載
   - .env.example に実際の値を記載
   - コミットメッセージに秘密情報を含める
   - console.log で秘密情報を出力
```

### コミット前チェック

1. `git diff --staged` で秘密情報が含まれていないか
2. `.env` ファイルがステージングされていないか
3. ログ出力に秘密情報が含まれていないか

---

## 重要な仕様【MVP】

### ボードパラメータ

| パラメータ | 値 |
|-----------|-----|
| サイズ | 64×64（4,096セル） |
| パレット | 16色（インデックス 0〜15） |
| トポロジー | Moore近傍（8方向） |
| ルール | Birth: 3, Survival: 2-3 |

### セグメント購入

| パラメータ | 値 |
|-----------|-----|
| nGenerations | 5〜30（範囲は変更可能） |
| 注入セル数上限 | `floor(nGenerations / 2)` |
| セルエンコーディング | 3バイト/セル（x, y, colorIndex） |

### カラールール（決定論的）

**誕生時**: 3つの親セルのRGB平均 → 最近接パレット色
**生存時**: 自身75% + 隣接平均25% → 最近接パレット色
**死亡時**: 即座に死（残光なし）

### 状態エンコーディング（StateV1）

```
aliveBitset: 4,096 bits = 512 bytes（行優先 i = y*64 + x）
colorNibbles: 4,096 * 4 bits = 2,048 bytes（2セル/byte）
合計: 2,560 bytes

stateRoot = keccak256(StateV1Bytes)
```

---

## UIレイアウト規約

### 言語
- **デフォルト**: 英語
- **対応言語**: 英語 / 日本語（切替可能）
- **切替UI**: ヘッダー右上に言語スイッチャー

### 全体レイアウト
- 縦長スマホ画面に最適化（424×695px web / デバイス依存 mobile）
- 100vhを使用してフル画面表示
- 64×64ボードはピンチズーム対応
- **ヘッダー**: ロゴ + 言語切替のみ（ウォレットボタンなし）
- **ナビゲーション**: 下部固定タブナビ（Home, Buy, Gallery, My）

### 主要画面（5画面）
| パス | 画面名 | 説明 |
|------|--------|------|
| `/` | Home | 現在のボード状態、最新セグメント一覧 |
| `/buy` | Buy | 世代数選択、セル配置、プレビューGIF、購入 |
| `/segment/[id]` | Segment Detail | pending/revealed状態、シェア |
| `/gallery` | Gallery | 過去セグメント・エポック一覧 |
| `/my` | My Page | 自分のセグメント、無料ミント可能エポック |

---

## 開発ルール

### 技術スタック（固定）

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router) |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React Query + Zustand |
| Web3 | wagmi + viem |
| バックエンド | Next.js API Routes |
| コントラクト | Foundry (Solidity 0.8.24) |
| レンダラー | GitHub Actions |
| ストレージ | GitHub Releases / IPFS |
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
4. **決定論性** - Life エンジン、カラールール、エンコーディングは完全決定論的
5. **命名規則**
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

## Farcaster Mini App 開発ルール【必読】

### LLM/AI向け禁止事項

- ❌ `fc:frame` メタタグを新規実装に使用（レガシー専用）
- ❌ Frames v1 構文の使用
- ❌ マニフェストに存在しないフィールドの作成
- ❌ `"version": "next"` の使用（`"1"` を使用）
- ❌ 2024年以前の古い例の参照

### LLM/AI向け必須事項

- ✅ `fc:miniapp` メタタグを使用
- ✅ `@farcaster/miniapp-sdk` の公式スキーマに準拠
- ✅ `sdk.actions.ready()` を必ず呼び出す
- ✅ マニフェストのドメインは完全一致

### 開発ツール

| ツール | URL |
|--------|-----|
| マニフェスト生成 | https://farcaster.xyz/~/developers/mini-apps/manifest |
| プレビューツール | https://farcaster.xyz/~/developers/mini-apps/preview |
| Embedツール | https://farcaster.xyz/~/developers/mini-apps/embed |

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-13 | 初版作成（Life League） |
| 2025-12-14 | Farcaster Infinite Life に方針転換、CLAUDE.md全面改訂 |
| 2025-12-14 | 詳細設計書追加、画面設計追加、セグメント範囲5-30、多言語対応(EN/JP) |
| 2025-12-14 | ボードサイズ 200×200 → 100×100 に変更 |
| 2025-12-14 | ボードサイズ 100×100 → 64×64 に変更 |
