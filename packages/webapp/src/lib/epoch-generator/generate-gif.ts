// ============================================
// Epoch Generator - GIF生成
// ============================================

import type { CanvasRenderingContext2D as NodeCanvasContext2D } from 'canvas';
import { BoardState, BOARD_SIZE, PALETTE_RGB } from '@/types';
import { isAlive, getColor } from '../life-engine';

// 注: このファイルはNode.js環境で実行される（GitHub Actions）
// gif-encoder-2とcanvasパッケージが必要

const GIF_FRAME_DELAY = 100; // 100ms per frame (10fps)
const CELL_SIZE = 4; // 4px per cell (64 * 4 = 256px)
const GIF_WIDTH = BOARD_SIZE * CELL_SIZE;
const GIF_HEIGHT = BOARD_SIZE * CELL_SIZE;

/**
 * BoardStateをRGBAデータ配列に変換
 */
function boardStateToRgbaData(state: BoardState): Uint8ClampedArray {
  const data = new Uint8ClampedArray(GIF_WIDTH * GIF_HEIGHT * 4);

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const alive = isAlive(state, x, y);
      const colorIndex = alive ? getColor(state, x, y) : 0;
      const rgb = PALETTE_RGB[colorIndex];

      // CELL_SIZE x CELL_SIZE のピクセルを塗る
      for (let dy = 0; dy < CELL_SIZE; dy++) {
        for (let dx = 0; dx < CELL_SIZE; dx++) {
          const px = x * CELL_SIZE + dx;
          const py = y * CELL_SIZE + dy;
          const idx = (py * GIF_WIDTH + px) * 4;

          data[idx] = rgb[0]; // R
          data[idx + 1] = rgb[1]; // G
          data[idx + 2] = rgb[2]; // B
          data[idx + 3] = 255; // A
        }
      }
    }
  }

  return data;
}

/**
 * 256フレームのBoardState配列からGIFを生成
 *
 * @param frames BoardState配列（256フレーム）
 * @returns GIF画像のBuffer
 */
export async function generateGif(frames: BoardState[]): Promise<Buffer> {
  // 動的インポート（Node.js環境でのみ利用可能）
  const GIFEncoder = (await import('gif-encoder-2')).default;
  const { createCanvas, createImageData } = await import('canvas');

  // Canvas準備
  const canvas = createCanvas(GIF_WIDTH, GIF_HEIGHT);
  const ctx = canvas.getContext('2d');

  // GIFエンコーダー準備
  const encoder = new GIFEncoder(GIF_WIDTH, GIF_HEIGHT);
  encoder.setDelay(GIF_FRAME_DELAY);
  encoder.setRepeat(0); // 無限ループ
  encoder.setQuality(10); // 品質（1-20、低いほど高品質）

  // エンコード開始
  encoder.start();

  // 各フレームを追加
  for (let i = 0; i < frames.length; i++) {
    const rgbaData = boardStateToRgbaData(frames[i]);
    const imageData = createImageData(rgbaData, GIF_WIDTH, GIF_HEIGHT);
    ctx.putImageData(imageData, 0, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encoder.addFrame(ctx as any);

    // 進行状況ログ
    if ((i + 1) % 64 === 0) {
      console.log(`GIF encoding: ${i + 1}/${frames.length} frames`);
    }
  }

  // エンコード完了
  encoder.finish();

  // Bufferとして取得
  const buffer = encoder.out.getData();
  console.log(`GIF generated: ${buffer.length} bytes`);

  return buffer;
}

/**
 * GIFのメタデータを生成
 */
export function generateGifMetadata(epochId: number, frames: BoardState[]): {
  width: number;
  height: number;
  frameCount: number;
  duration: number;
  fps: number;
} {
  return {
    width: GIF_WIDTH,
    height: GIF_HEIGHT,
    frameCount: frames.length,
    duration: frames.length * GIF_FRAME_DELAY,
    fps: 1000 / GIF_FRAME_DELAY,
  };
}
