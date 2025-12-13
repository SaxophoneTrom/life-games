// ============================================
// Epoch Generator - GIF/MP4動画生成
// ============================================

import { BoardState, BOARD_SIZE, PALETTE_RGB } from '@/types';
import { isAlive, getColor } from '../life-engine';
import * as path from 'path';
// MP4生成用（現在未使用）
// import * as fs from 'fs';
// import * as os from 'os';
// import { execSync } from 'child_process';
import GIFEncoder from 'gif-encoder-2';

// 注: このファイルはNode.js環境で実行される（GitHub Actions）
// canvasパッケージが必要（GIF生成用）
// ffmpegはMP4生成時のみ必要

const VIDEO_FPS = 10; // 10fps
const INJECTION_FRAME_DURATION = 2; // セグメント注入直後のフレームは2秒間静止

// エポック用フレーム画像の設定（小サイズ版 - GIF用）
const EPOCH_FRAME_CONFIG_SMALL = {
  imagePath: 'nft-frame-ep-small.png', // publicフォルダ内のパス
  width: 341,
  height: 437,
  windowX: 40,
  windowY: 112,
  windowSize: 256,
};

// エポック用フレーム画像の設定（大サイズ版 - MP4用、将来利用予定）
// const EPOCH_FRAME_CONFIG_LARGE = {
//   imagePath: 'nft-frame-ep.png', // publicフォルダ内のパス
//   width: 686,
//   height: 876,
//   windowX: 80,
//   windowY: 225,
//   windowSize: 512,
// };

// 現在使用する設定
const EPOCH_FRAME_CONFIG = EPOCH_FRAME_CONFIG_SMALL;

// 出力動画サイズ（フレーム画像サイズ）
const VIDEO_WIDTH = EPOCH_FRAME_CONFIG.width;
const VIDEO_HEIGHT = EPOCH_FRAME_CONFIG.height;

// ボード描画サイズ（窓サイズ）
const BOARD_RENDER_SIZE = EPOCH_FRAME_CONFIG.windowSize;

/**
 * BoardStateを指定サイズのCanvasに描画
 */
function renderBoardToCanvas(
  createCanvas: (w: number, h: number) => ReturnType<typeof import('canvas').createCanvas>,
  state: BoardState,
  targetSize: number
): ReturnType<typeof import('canvas').createCanvas> {
  const cellSize = targetSize / BOARD_SIZE; // 512 / 64 = 8
  const canvas = createCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');

  // 背景を黒で塗りつぶし（死セルの色）
  ctx.fillStyle = `rgb(${PALETTE_RGB[0].join(',')})`;
  ctx.fillRect(0, 0, targetSize, targetSize);

  // 各セルを描画
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const alive = isAlive(state, x, y);
      if (alive) {
        const colorIndex = getColor(state, x, y);
        const rgb = PALETTE_RGB[colorIndex];
        ctx.fillStyle = `rgb(${rgb.join(',')})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas;
}

/**
 * 256フレームのBoardState配列からGIFを生成（フレーム合成版）
 *
 * @param frames BoardState配列（256フレーム）
 * @param injectionFrameIndices 各セグメント注入直後のフレームインデックス配列
 * @returns GIF画像のBuffer
 */
export async function generateVideo(
  frames: BoardState[],
  injectionFrameIndices: number[] = []
): Promise<Buffer> {
  // 注入フレームのインデックスをSetに変換（高速検索用）
  const injectionFrameSet = new Set(injectionFrameIndices);
  // 動的インポート（Node.js環境でのみ利用可能）
  const { createCanvas, loadImage } = await import('canvas');

  // フレーム画像を読み込む
  const frameImagePath = path.join(process.cwd(), 'public', EPOCH_FRAME_CONFIG.imagePath);
  console.log(`Loading frame image from: ${frameImagePath}`);
  const frameImage = await loadImage(frameImagePath);

  // GIFエンコーダー初期化
  const encoder = new GIFEncoder(VIDEO_WIDTH, VIDEO_HEIGHT, 'neuquant', true);
  encoder.setDelay(1000 / VIDEO_FPS); // フレーム間隔(ms)
  encoder.setRepeat(0); // 無限ループ
  encoder.setQuality(10); // 品質（1=最高、20=最低）
  encoder.start();

  // 合成用Canvas準備
  const compositeCanvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const compositeCtx = compositeCanvas.getContext('2d');

  let frameCount = 0;

  for (let i = 0; i < frames.length; i++) {
    // 1. フレーム画像を描画（背景）
    compositeCtx.drawImage(frameImage, 0, 0);

    // 2. ボードを描画
    const boardCanvas = renderBoardToCanvas(createCanvas, frames[i], BOARD_RENDER_SIZE);

    // 3. 窓の位置にボードを合成
    compositeCtx.drawImage(boardCanvas, EPOCH_FRAME_CONFIG.windowX, EPOCH_FRAME_CONFIG.windowY);

    // 4. GIFにフレームを追加
    // 注入直後のフレームは2秒間静止
    const isInjectionFrame = injectionFrameSet.has(i);
    const repeatCount = isInjectionFrame ? INJECTION_FRAME_DURATION * VIDEO_FPS : 1;

    for (let r = 0; r < repeatCount; r++) {
      // canvasパッケージのContextをany経由で渡す（型互換性のため）
      encoder.addFrame(compositeCtx as unknown as CanvasRenderingContext2D);
      frameCount++;
    }

    // 進行状況ログ
    if ((i + 1) % 64 === 0) {
      console.log(`Frame generation: ${i + 1}/${frames.length} frames`);
    }
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();
  console.log(`GIF generated: ${gifBuffer.length} bytes (${VIDEO_WIDTH}x${VIDEO_HEIGHT}), ${frameCount} frames`);

  return gifBuffer;
}

// ============================================
// MP4生成（将来利用予定 - 現在コメントアウト）
// ============================================
// /**
//  * 256フレームのBoardState配列からMP4動画を生成（フレーム合成版）
//  *
//  * @param frames BoardState配列（256フレーム）
//  * @param injectionFrameIndices 各セグメント注入直後のフレームインデックス配列
//  * @returns MP4動画のBuffer
//  */
// export async function generateVideoMP4(
//   frames: BoardState[],
//   injectionFrameIndices: number[] = []
// ): Promise<Buffer> {
//   // 注入フレームのインデックスをSetに変換（高速検索用）
//   const injectionFrameSet = new Set(injectionFrameIndices);
//   // 動的インポート（Node.js環境でのみ利用可能）
//   const { createCanvas, loadImage } = await import('canvas');
//
//   // フレーム画像を読み込む
//   const frameImagePath = path.join(process.cwd(), 'public', EPOCH_FRAME_CONFIG.imagePath);
//   console.log(`Loading frame image from: ${frameImagePath}`);
//   const frameImage = await loadImage(frameImagePath);
//
//   // 一時ディレクトリを作成
//   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epoch-video-'));
//   console.log(`Temporary directory: ${tmpDir}`);
//
//   // 合成用Canvas準備
//   const compositeCanvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
//   const compositeCtx = compositeCanvas.getContext('2d');
//
//   try {
//     // 各フレームをPNG画像として保存
//     let frameIndex = 0;
//
//     for (let i = 0; i < frames.length; i++) {
//       // 1. フレーム画像を描画（背景）
//       compositeCtx.drawImage(frameImage, 0, 0);
//
//       // 2. ボードを512x512で描画
//       const boardCanvas = renderBoardToCanvas(createCanvas, frames[i], BOARD_RENDER_SIZE);
//
//       // 3. 窓の位置にボードを合成
//       compositeCtx.drawImage(boardCanvas, EPOCH_FRAME_CONFIG.windowX, EPOCH_FRAME_CONFIG.windowY);
//
//       // 4. PNG画像として保存
//       // 注入直後のフレームは2秒間（= 20フレーム@10fps）複製
//       const isInjectionFrame = injectionFrameSet.has(i);
//       const repeatCount = isInjectionFrame ? INJECTION_FRAME_DURATION * VIDEO_FPS : 1;
//
//       for (let r = 0; r < repeatCount; r++) {
//         const framePath = path.join(tmpDir, `frame-${String(frameIndex).padStart(5, '0')}.png`);
//         const buffer = compositeCanvas.toBuffer('image/png');
//         fs.writeFileSync(framePath, buffer);
//         frameIndex++;
//       }
//
//       // 進行状況ログ
//       if ((i + 1) % 64 === 0) {
//         console.log(`Frame generation: ${i + 1}/${frames.length} frames`);
//       }
//     }
//
//     console.log(`Total frames generated: ${frameIndex}`);
//
//     // ffmpegでMP4に変換
//     const outputPath = path.join(tmpDir, 'output.mp4');
//
//     // ffmpegコマンド
//     // - H.264エンコード
//     // - yuv420pでブラウザ互換性を確保
//     // - CRF 23で品質/サイズバランス
//     // - ループ再生可能なMP4
//     const ffmpegCmd = [
//       'ffmpeg',
//       '-y', // 上書き許可
//       '-framerate',
//       String(VIDEO_FPS),
//       '-i',
//       path.join(tmpDir, 'frame-%05d.png'),
//       '-c:v',
//       'libx264',
//       '-preset',
//       'medium',
//       '-crf',
//       '23',
//       '-pix_fmt',
//       'yuv420p',
//       '-movflags',
//       '+faststart', // Web再生最適化
//       outputPath,
//     ].join(' ');
//
//     console.log(`Running ffmpeg: ${ffmpegCmd}`);
//     execSync(ffmpegCmd, { stdio: 'inherit' });
//
//     // MP4を読み込んで返す
//     const videoBuffer = fs.readFileSync(outputPath);
//     console.log(`Video generated: ${videoBuffer.length} bytes (${VIDEO_WIDTH}x${VIDEO_HEIGHT})`);
//
//     return videoBuffer;
//   } finally {
//     // 一時ファイルを削除
//     console.log('Cleaning up temporary files...');
//     const files = fs.readdirSync(tmpDir);
//     for (const file of files) {
//       fs.unlinkSync(path.join(tmpDir, file));
//     }
//     fs.rmdirSync(tmpDir);
//   }
// }

/**
 * 動画のメタデータを生成
 */
export function generateVideoMetadata(
  epochId: number,
  frames: BoardState[],
  injectionFrameCount: number = 1
): {
  width: number;
  height: number;
  frameCount: number;
  duration: number;
  fps: number;
} {
  // 注入フレームは2秒間静止するため、総フレーム数を調整
  const extraFrames = injectionFrameCount * (INJECTION_FRAME_DURATION * VIDEO_FPS - 1);
  const totalFrames = frames.length + extraFrames;
  return {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    frameCount: totalFrames,
    duration: (totalFrames / VIDEO_FPS) * 1000, // ms
    fps: VIDEO_FPS,
  };
}
