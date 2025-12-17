// ============================================
// Epoch Generator - 型定義
// ============================================

import { Cell, BoardState } from '@/types';

/**
 * オンチェーンから取得したSegment情報
 */
export interface OnchainSegment {
  tokenId: bigint;
  minter: `0x${string}`;
  fid: bigint;
  nGenerations: number;
  cellsHash: `0x${string}`;
  mintedAt: bigint; // block number
}

/**
 * SegmentCellsイベントから取得したセル情報
 */
export interface SegmentWithCells extends OnchainSegment {
  cells: Cell[];
}

/**
 * Contribution（共有世界線への貢献）
 */
export interface Contribution {
  tokenId: bigint;
  fid: bigint;
  nGenerations: number;
  cells: Cell[];
  blockNumber: bigint;
}

/**
 * Epoch生成の進行状況
 */
export interface EpochProgress {
  currentGeneration: number;
  processedContributions: number;
  totalContributions: number;
  startBlock: bigint;
  endBlock: bigint;
}

/**
 * 貢献者情報（JSON出力用）
 */
export interface ContributorInfo {
  tokenId: string;
  fid: string;
  minter: string;
  nGenerations: number;
  genStart: number; // 共有世界線上での開始世代
  genEnd: number; // 共有世界線上での終了世代
}

/**
 * Contributors JSON構造
 */
export interface ContributorsJson {
  epochId: number;
  absStartGen: number;
  absEndGen: number;
  contributors: ContributorInfo[];
  generatedAt: string;
}

/**
 * Epoch mint用パラメータ
 */
export interface MintEpochParams {
  epochId: bigint;
  startStateRoot: `0x${string}`;
  startStateCID: string;
  endStateRoot: `0x${string}`;
  endStateCID: string;
  artifactURI: string;
  metadataURI: string;
  contributorsCID: string;
  contributorsRoot: `0x${string}`;
  startBlock: bigint;
  endBlock: bigint;
}

/**
 * Epoch生成結果
 */
export interface EpochGenerationResult {
  epochId: number;
  gifBuffer: Buffer;
  startState: BoardState;
  endState: BoardState;
  contributors: ContributorsJson;
  params: MintEpochParams;
}
