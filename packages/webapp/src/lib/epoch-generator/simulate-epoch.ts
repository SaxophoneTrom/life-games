// ============================================
// Epoch Generator - 共有世界線シミュレーション
// ============================================

import { BoardState, Cell, BOARD_SIZE } from '@/types';
import {
  createEmptyBoard,
  cloneBoard,
  injectCells,
  stepGeneration,
} from '../life-engine';
import type { Contribution, ContributorInfo, EpochProgress } from './types';

const GENERATIONS_PER_EPOCH = 256;

/**
 * BoardStateからstateRootを計算（keccak256）
 */
export function calculateStateRoot(state: BoardState): `0x${string}` {
  // StateV1エンコーディング: aliveBitset(512) + colorNibbles(2048) = 2560 bytes
  const stateBytes = new Uint8Array(2560);
  stateBytes.set(state.aliveBitset, 0);
  stateBytes.set(state.colorNibbles, 512);

  // keccak256ハッシュを計算（viemを使用）
  // 注: Node.js環境ではcryptoモジュールを使用
  const crypto = require('crypto');
  const hash = crypto.createHash('sha3-256').update(Buffer.from(stateBytes)).digest('hex');
  return `0x${hash}` as `0x${string}`;
}

/**
 * Contributionを共有世界線に適用し、指定世代数進める
 */
export function applyContribution(
  state: BoardState,
  contribution: Contribution
): { states: BoardState[]; endState: BoardState } {
  // 1. セルを注入
  const stateWithCells = injectCells(state, contribution.cells);

  // 2. nGenerations世代進める
  const states: BoardState[] = [stateWithCells];
  let current = stateWithCells;

  for (let i = 0; i < contribution.nGenerations; i++) {
    current = stepGeneration(current);
    states.push(current);
  }

  return { states, endState: current };
}

/**
 * 複数のContributionを順番に適用し、256世代分のフレームを生成
 *
 * @param contributions ブロック順にソートされたContribution配列
 * @param startState 開始状態（前回Epochの終了状態、なければ空盤面）
 * @param startGeneration 開始世代番号（絶対世代）
 * @returns 256フレーム分のBoardState配列と貢献者情報
 */
export function simulateEpoch(
  contributions: Contribution[],
  startState: BoardState,
  startGeneration: number
): {
  frames: BoardState[];
  endState: BoardState;
  contributorInfos: ContributorInfo[];
  usedContributions: number;
  endGeneration: number;
  startBlock: bigint;
  endBlock: bigint;
} {
  const frames: BoardState[] = [];
  const contributorInfos: ContributorInfo[] = [];

  let currentState = cloneBoard(startState);
  let currentGen = startGeneration;
  let contributionIndex = 0;
  let startBlock = 0n;
  let endBlock = 0n;

  // 256世代分のフレームを生成
  while (frames.length < GENERATIONS_PER_EPOCH && contributionIndex < contributions.length) {
    const contribution = contributions[contributionIndex];

    // ブロック番号を記録
    if (contributionIndex === 0) {
      startBlock = contribution.blockNumber;
    }
    endBlock = contribution.blockNumber;

    // このContributionの開始世代を記録
    const genStart = currentGen;

    // Contributionを適用
    const { states, endState } = applyContribution(currentState, contribution);

    // フレームを追加（最初のstateは注入直後なのでスキップ可能、または含める）
    // ここでは全状態を含める（注入直後 + nGenerations分）
    for (let i = 0; i < states.length && frames.length < GENERATIONS_PER_EPOCH; i++) {
      frames.push(states[i]);
      if (i > 0) currentGen++; // 最初のフレームは注入直後なのでカウントしない
    }

    // 貢献者情報を記録
    contributorInfos.push({
      tokenId: contribution.tokenId.toString(),
      fid: contribution.fid.toString(),
      minter: '', // 後でセット
      nGenerations: contribution.nGenerations,
      genStart,
      genEnd: currentGen,
    });

    currentState = endState;
    contributionIndex++;
  }

  // Contributionが足りない場合は空状態で埋める（Lifeを進める）
  while (frames.length < GENERATIONS_PER_EPOCH) {
    currentState = stepGeneration(currentState);
    frames.push(currentState);
    currentGen++;
  }

  return {
    frames,
    endState: currentState,
    contributorInfos,
    usedContributions: contributionIndex,
    endGeneration: currentGen,
    startBlock,
    endBlock,
  };
}

/**
 * 進行状況をコールバックで通知しながらシミュレーション
 */
export function simulateEpochWithProgress(
  contributions: Contribution[],
  startState: BoardState,
  startGeneration: number,
  onProgress?: (progress: EpochProgress) => void
): ReturnType<typeof simulateEpoch> {
  // 進行状況を通知
  if (onProgress) {
    onProgress({
      currentGeneration: startGeneration,
      processedContributions: 0,
      totalContributions: contributions.length,
      startBlock: contributions[0]?.blockNumber || 0n,
      endBlock: contributions[contributions.length - 1]?.blockNumber || 0n,
    });
  }

  const result = simulateEpoch(contributions, startState, startGeneration);

  // 完了を通知
  if (onProgress) {
    onProgress({
      currentGeneration: result.endGeneration,
      processedContributions: result.usedContributions,
      totalContributions: contributions.length,
      startBlock: result.startBlock,
      endBlock: result.endBlock,
    });
  }

  return result;
}
