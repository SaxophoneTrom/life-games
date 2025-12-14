/**
 * Game of Life 関連の型定義
 */

import type { Grid } from "@/lib/gameOfLife";

/**
 * シーズン設定
 */
export interface Season {
  id: number;
  wallA: `0x${string}`;
  wallB: `0x${string}`;
  initialLiveCount: number;
  targetAlive: number;
  mintFee: string; // wei
  prizePool: string; // wei
  merkleRoot?: `0x${string}`;
  finalizedAt?: string;
  createdAt: string;
}

/**
 * 提出（ミントされたNFT）
 */
export interface Submission {
  id: string;
  tokenId: string;
  seasonId: number;
  ownerAddress: `0x${string}`;
  ownerFid?: number;
  boardA: `0x${string}`;
  boardB: `0x${string}`;
  score: number;
  finalAlive: number;
  txHash?: string;
  createdAt: string;
}

/**
 * リーダーボードエントリー
 */
export interface LeaderboardEntry {
  rank: number;
  tokenId: string;
  ownerAddress: `0x${string}`;
  ownerFid?: number;
  ownerName?: string;
  ownerAvatar?: string;
  boardA: `0x${string}`;
  boardB: `0x${string}`;
  score: number;
  finalAlive: number;
}

/**
 * ミント署名リクエスト
 */
export interface MintSignatureRequest {
  boardA: `0x${string}`;
  boardB: `0x${string}`;
  address: `0x${string}`;
}

/**
 * ミント署名レスポンス
 */
export interface MintSignatureResponse {
  signature: `0x${string}`;
  nonce: `0x${string}`;
  expiry: number;
  seasonId: number;
}

/**
 * シミュレーション状態
 */
export interface SimulationState {
  isRunning: boolean;
  currentGeneration: number;
  speed: 1 | 2 | 4;
  history: Grid[];
}

/**
 * エディタ状態
 */
export interface EditorState {
  grid: Grid;
  wallMask: Grid | null;
  isDirty: boolean;
  aliveCellCount: number;
}

/**
 * ユーザーのミント状況
 */
export interface MintStatus {
  freeMintsUsed: number;
  freeMintsTotal: number;
  paidMints: number;
  todayMints: number;
}

/**
 * クレーム情報
 */
export interface ClaimInfo {
  tokenId: string;
  seasonId: number;
  amount: string; // wei
  proof: `0x${string}`[];
  claimed: boolean;
}

/**
 * シーズン統計
 */
export interface SeasonStats {
  totalSubmissions: number;
  totalPlayers: number;
  averageScore: number;
  highestScore: number;
  prizePool: string;
}
