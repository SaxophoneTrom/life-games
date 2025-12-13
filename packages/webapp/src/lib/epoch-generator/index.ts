// ============================================
// Epoch Generator - メインエントリーポイント
// ============================================

import { keccak256, toHex } from 'viem';
import { createEmptyBoard, cloneBoard } from '../life-engine';
import { BoardState } from '@/types';
import { fetchAllContributions, fetchUnprocessedContributions } from './fetch-contributions';
import { simulateEpoch, calculateStateRoot } from './simulate-epoch';
import { generateVideo } from './generate-video';
import {
  uploadEpochVideo,
  uploadContributorsJson,
  uploadEpochMetadata,
  uploadStateCheckpoint,
} from './upload-release';
import { mintEpoch, getLastMintedEpochId, getEpoch } from './mint-epoch';
import type {
  Contribution,
  ContributorsJson,
  MintEpochParams,
  EpochGenerationResult,
} from './types';

export * from './types';
export * from './fetch-contributions';
export * from './simulate-epoch';
export * from './generate-video';
export * from './upload-release';
export * from './mint-epoch';

const GENERATIONS_PER_EPOCH = 256;

/**
 * BoardStateを2560バイトのUint8Arrayに変換
 */
function boardStateToBytes(state: BoardState): Uint8Array {
  const bytes = new Uint8Array(2560);
  bytes.set(state.aliveBitset, 0);
  bytes.set(state.colorNibbles, 512);
  return bytes;
}

/**
 * ContributorsのMerkle rootを計算
 */
function calculateContributorsRoot(contributors: ContributorsJson): `0x${string}` {
  if (contributors.contributors.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  // 各貢献者のハッシュを計算
  const leaves = contributors.contributors.map((c) =>
    keccak256(
      toHex(
        JSON.stringify({
          tokenId: c.tokenId,
          fid: c.fid,
          genStart: c.genStart,
          genEnd: c.genEnd,
        })
      )
    )
  );

  // 簡易Merkle root（2の累乗でなくてもOK）
  while (leaves.length > 1) {
    const newLeaves: `0x${string}`[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      if (i + 1 < leaves.length) {
        // 2つの葉をソートしてハッシュ（決定論的）
        const pair = [leaves[i], leaves[i + 1]].sort();
        newLeaves.push(keccak256(`${pair[0]}${pair[1].slice(2)}`));
      } else {
        // 奇数の場合はそのまま上げる
        newLeaves.push(leaves[i]);
      }
    }
    leaves.length = 0;
    leaves.push(...newLeaves);
  }

  return leaves[0];
}

/**
 * Epoch生成のメイン処理
 *
 * @param dryRun trueの場合、mint/uploadをスキップ
 */
export async function generateEpoch(dryRun = false): Promise<EpochGenerationResult | null> {
  console.log('='.repeat(50));
  console.log('Epoch Generation Started');
  console.log('='.repeat(50));

  // 1. 最後にmintされたEpoch IDを取得
  const lastMintedEpochId = await getLastMintedEpochId();
  const nextEpochId = Number(lastMintedEpochId) + 1;
  console.log(`Last minted epoch: ${lastMintedEpochId}`);
  console.log(`Next epoch to generate: ${nextEpochId}`);

  // 2. 前回Epochの終了状態を取得（なければ空盤面）
  let startState: BoardState;
  let startGeneration: number;
  let lastProcessedBlock: bigint;

  if (lastMintedEpochId === 0n) {
    // 初回Epoch: 空盤面から開始
    startState = createEmptyBoard();
    startGeneration = 1;
    lastProcessedBlock = 0n;
    console.log('Starting from empty board (first epoch)');
  } else {
    // 前回Epochの終了状態を取得
    // 注: 実際にはcheckpointファイルからロードするか、再計算が必要
    // ここでは簡易的にコントラクトの情報を使用
    const prevEpoch = await getEpoch(lastMintedEpochId);
    startGeneration = Number(prevEpoch.absEndGen) + 1;
    lastProcessedBlock = prevEpoch.endBlock;

    // TODO: startStateCIDからIPFS/GitHub Releaseより状態を復元
    // 現時点では空盤面から再計算（非効率だが確実）
    console.log(`Previous epoch ended at gen ${prevEpoch.absEndGen}, block ${prevEpoch.endBlock}`);
    console.log('Re-simulating from genesis (checkpoint recovery TODO)');

    // 全Contributionを取得して再シミュレーション
    const allContributions = await fetchAllContributions();
    const targetGen = startGeneration - 1;

    startState = createEmptyBoard();
    let currentGen = 0;

    for (const contribution of allContributions) {
      if (currentGen >= targetGen) break;

      // 注入
      const result = simulateEpoch([contribution], startState, currentGen);
      startState = result.endState;
      currentGen = result.endGeneration;
    }

    console.log(`Re-simulated to generation ${currentGen}`);
  }

  // 3. 未処理のContributionを取得
  const contributions = await fetchUnprocessedContributions(lastProcessedBlock);
  console.log(`Found ${contributions.length} unprocessed contributions`);

  if (contributions.length === 0) {
    console.log('No contributions to process. Epoch generation skipped.');
    return null;
  }

  // 256世代分のContributionがあるか確認
  const totalGenerations = contributions.reduce((sum, c) => sum + c.nGenerations, 0);
  console.log(`Total generations from contributions: ${totalGenerations}`);

  if (totalGenerations < GENERATIONS_PER_EPOCH) {
    console.log(
      `Not enough generations for an epoch (need ${GENERATIONS_PER_EPOCH}, have ${totalGenerations})`
    );
    console.log('Epoch generation skipped. Waiting for more contributions.');
    return null;
  }

  // 4. シミュレーション実行
  console.log('Starting simulation...');
  const startStateSnapshot = cloneBoard(startState);

  const { frames, endState, contributorInfos, usedContributions, endGeneration, startBlock, endBlock, injectionFrameIndices } =
    simulateEpoch(contributions, startState, startGeneration);

  console.log(`Simulation complete: ${frames.length} frames`);
  console.log(`Used ${usedContributions} contributions`);
  console.log(`Generation range: ${startGeneration} - ${endGeneration}`);
  console.log(`Block range: ${startBlock} - ${endBlock}`);
  console.log(`Injection frames: ${injectionFrameIndices.length} (indices: ${injectionFrameIndices.join(', ')})`);

  // 5. Contributors JSON作成
  const contributorsJson: ContributorsJson = {
    epochId: nextEpochId,
    absStartGen: startGeneration,
    absEndGen: startGeneration + GENERATIONS_PER_EPOCH - 1,
    contributors: contributorInfos,
    generatedAt: new Date().toISOString(),
  };

  // 6. State rootを計算
  const startStateRoot = calculateStateRoot(startStateSnapshot);
  const endStateRoot = calculateStateRoot(endState);
  console.log(`Start state root: ${startStateRoot}`);
  console.log(`End state root: ${endStateRoot}`);

  // 7. Contributors rootを計算
  const contributorsRoot = calculateContributorsRoot(contributorsJson);
  console.log(`Contributors root: ${contributorsRoot}`);

  if (dryRun) {
    console.log('Dry run mode: Skipping video generation, upload, and mint');
    return null;
  }

  // 8. GIF生成
  console.log('Generating GIF...');
  const videoBuffer = await generateVideo(frames, injectionFrameIndices);

  // 9. アップロード
  console.log('Uploading to GitHub Release...');
  const artifactURI = await uploadEpochVideo(nextEpochId, videoBuffer);
  const contributorsCID = await uploadContributorsJson(nextEpochId, contributorsJson);

  // State checkpointもアップロード
  await uploadStateCheckpoint(nextEpochId, 'start', boardStateToBytes(startStateSnapshot));
  const endStateCID = await uploadStateCheckpoint(nextEpochId, 'end', boardStateToBytes(endState));

  // NFTメタデータ作成・アップロード
  const metadata = {
    name: `Infinite Life Epoch #${nextEpochId}`,
    description: `Shared timeline archive: Generations ${startGeneration}-${startGeneration + GENERATIONS_PER_EPOCH - 1}. ${contributorInfos.length} contributors.`,
    image: artifactURI,
    animation_url: artifactURI,
    attributes: [
      { trait_type: 'Epoch', value: nextEpochId },
      { trait_type: 'Start Generation', value: startGeneration },
      { trait_type: 'End Generation', value: startGeneration + GENERATIONS_PER_EPOCH - 1 },
      { trait_type: 'Contributors', value: contributorInfos.length },
      { trait_type: 'Start Block', value: Number(startBlock) },
      { trait_type: 'End Block', value: Number(endBlock) },
    ],
  };
  const metadataURI = await uploadEpochMetadata(nextEpochId, metadata);

  // 10. Mint
  console.log('Minting EpochArchiveNFT...');
  const mintParams: MintEpochParams = {
    epochId: BigInt(nextEpochId),
    startStateRoot,
    startStateCID: artifactURI, // GitHub Release URLを使用
    endStateRoot,
    endStateCID,
    artifactURI,
    metadataURI,
    contributorsCID,
    contributorsRoot,
    startBlock,
    endBlock,
  };

  const txHash = await mintEpoch(mintParams);
  console.log(`Epoch ${nextEpochId} minted! TX: ${txHash}`);

  return {
    epochId: nextEpochId,
    videoBuffer,
    startState: startStateSnapshot,
    endState,
    contributors: contributorsJson,
    params: mintParams,
  };
}

/**
 * CLI実行用エントリーポイント
 */
export async function main() {
  const dryRun = process.argv.includes('--dry-run');

  try {
    const result = await generateEpoch(dryRun);

    if (result) {
      console.log('\n' + '='.repeat(50));
      console.log('Epoch Generation Complete!');
      console.log('='.repeat(50));
      console.log(`Epoch ID: ${result.epochId}`);
      console.log(`Video Size: ${result.videoBuffer.length} bytes`);
      console.log(`Contributors: ${result.contributors.contributors.length}`);
    } else {
      console.log('\nNo epoch generated.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Epoch generation failed:', error);
    process.exit(1);
  }
}

// CLI実行の場合
if (require.main === module) {
  main();
}
