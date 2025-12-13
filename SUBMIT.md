# Game of Life on BASE

> Create Life, Mint Art - ライフゲームでアートを創造

## 概要

Conway's Game of Life（ライフゲーム）を使ったNFTアートプロジェクト。64×64の16色ボード上でセルを配置し、HighLifeルール(B36/S23)による進化をアニメーションで観察。作品はSegmentNFTとして即座にBase上でMintされます。

## デモ

- **アプリURL**: https://base-life-games.vercel.app
- **スライド**: https://docs.google.com/presentation/d/1GTr0C98WfDNc7wG0Ak0-trficSmwx2YQkWclRJHWzxE
- **デモ動画**(任意):（再生速度2倍推奨） https://drive.google.com/file/d/1gXEm81IkPxi8qyj7tC9ld8J3RUwLohUb/view

## 推しポイント

1. **HighLife (B36/S23) ルール採用**
   - 標準のConwayルールより動的で予測困難な進化パターン
   - 誕生条件が3または6個、生存条件が2-3個

2. **即確定Mint & クライアント側アニメーション**
   - 空盤面から独立した作品を作成→オンチェーンに即Mint
   - ブラウザ内でリアルタイムにアニメーション再生

3. **スタンプ機能で簡単作成**
   - ❤️ Heart, 😊 Smile, ⭐ Star, 🍎 Apple, 🌙 Moon など
   - ワンタップでパターンを配置

## 使用技術

- **フロントエンド**: Next.js 16 (App Router), Tailwind CSS 4
- **状態管理**: React Query + Zustand
- **Web3**: wagmi + viem
- **コントラクト**: Foundry (Solidity 0.8.24)
- **チェーン**: Base Mainnet
- **その他**: Farcaster Mini App SDK

## チームメンバー

- Saxophone55 - @virtualtrompete

---

*このプロジェクトは「12/13-20 大喜利.hack vibecoding mini hackathon」で作成されました*
