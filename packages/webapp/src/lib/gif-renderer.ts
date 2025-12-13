// ============================================
// クライアント側GIF生成
// ============================================
// ブラウザで動作するGIF生成
// gif.js を使用してアニメーションGIF生成

import { BoardState, BOARD_SIZE, PALETTE_RGB } from '@/types';
import { isAlive, getColor } from './life-engine';
// @ts-expect-error gif.js has no types
import GIF from 'gif.js';

// GIF生成の設定
const DEFAULT_CELL_SIZE = 4; // 4px per cell (64 * 4 = 256px)

// フレーム画像の設定
export const FRAME_CONFIG = {
  imagePath: '/nft-frame.png',
  width: 686,
  height: 876,
  windowX: 86,
  windowY: 231,
  windowSize: 512,
};

interface GifRendererOptions {
  cellSize?: number;
}

interface FramedGifOptions {
  frameDelay?: number; // ms per frame (default: 100)
  onProgress?: (progress: number) => void;
}

/**
 * BoardStateをCanvas ImageDataに変換
 */
function boardStateToImageData(
  ctx: CanvasRenderingContext2D,
  state: BoardState,
  cellSize: number
): ImageData {
  const width = BOARD_SIZE * cellSize;
  const height = BOARD_SIZE * cellSize;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const alive = isAlive(state, x, y);
      const colorIndex = alive ? getColor(state, x, y) : 0;
      const rgb = PALETTE_RGB[colorIndex];

      // CELL_SIZE x CELL_SIZE のピクセルを塗る
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = x * cellSize + dx;
          const py = y * cellSize + dy;
          const idx = (py * width + px) * 4;

          data[idx] = rgb[0]; // R
          data[idx + 1] = rgb[1]; // G
          data[idx + 2] = rgb[2]; // B
          data[idx + 3] = 255; // A
        }
      }
    }
  }

  return imageData;
}

/**
 * BoardState配列から最終フレームのPNG Blobを生成
 * （フル機能GIFはサーバーサイドで生成、クライアントは静止画プレビュー）
 *
 * @param frames BoardState配列
 * @param options 生成オプション
 * @returns PNG Blob
 */
export async function generatePreviewBlob(
  frames: BoardState[],
  options: GifRendererOptions = {}
): Promise<Blob> {
  const { cellSize = DEFAULT_CELL_SIZE } = options;
  const width = BOARD_SIZE * cellSize;
  const height = BOARD_SIZE * cellSize;

  // 最終フレームを使用
  const lastFrame = frames[frames.length - 1] || frames[0];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  const imageData = boardStateToImageData(ctx, lastFrame, cellSize);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

/**
 * GIF BlobをダウンロードURL形式で取得
 */
export function createGifDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * GIFをダウンロード
 */
export function downloadGif(blob: Blob, filename: string): void {
  const url = createGifDownloadUrl(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 簡易GIF生成（gif.jsなしで動作するフォールバック）
 * APNGまたは静止画として保存
 */
export function generateStaticImage(
  state: BoardState,
  cellSize: number = DEFAULT_CELL_SIZE
): string {
  const width = BOARD_SIZE * cellSize;
  const height = BOARD_SIZE * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  const imageData = boardStateToImageData(ctx, state, cellSize);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

/**
 * Canvas要素にBoardStateを描画
 */
export function renderBoardToCanvas(
  canvas: HTMLCanvasElement,
  state: BoardState,
  cellSize: number = DEFAULT_CELL_SIZE
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = BOARD_SIZE * cellSize;
  canvas.height = BOARD_SIZE * cellSize;

  const imageData = boardStateToImageData(ctx, state, cellSize);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * フレーム画像を読み込む
 */
export async function loadFrameImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load frame image'));
    img.src = FRAME_CONFIG.imagePath;
  });
}

/**
 * BoardStateを指定サイズのCanvasに描画（エクスポート版）
 */
export function renderBoardToSizedCanvas(
  state: BoardState,
  targetSize: number
): HTMLCanvasElement {
  return renderBoardToSize(state, targetSize);
}

/**
 * BoardStateを指定サイズのCanvasに描画（スケールアップ対応）
 */
function renderBoardToSize(
  state: BoardState,
  targetSize: number
): HTMLCanvasElement {
  const cellSize = targetSize / BOARD_SIZE; // 512 / 64 = 8
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

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
        ctx.fillRect(
          x * cellSize,
          y * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }

  return canvas;
}

/**
 * フレーム付きのアニメーションGIFを生成
 *
 * @param frames BoardState配列（シミュレーション結果）
 * @param options 生成オプション
 * @returns GIF Blob
 */
export async function generateFramedGif(
  frames: BoardState[],
  options: FramedGifOptions = {}
): Promise<Blob> {
  const { frameDelay = 100, onProgress } = options;

  // フレーム画像を読み込む
  const frameImage = await loadFrameImage();

  // GIFエンコーダーを初期化
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: FRAME_CONFIG.width,
    height: FRAME_CONFIG.height,
    workerScript: '/gif.worker.js',
  });

  // 合成用キャンバス
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = FRAME_CONFIG.width;
  compositeCanvas.height = FRAME_CONFIG.height;
  const compositeCtx = compositeCanvas.getContext('2d');

  if (!compositeCtx) {
    throw new Error('Failed to create composite canvas context');
  }

  // 各フレームを合成してGIFに追加
  for (let i = 0; i < frames.length; i++) {
    // 1. フレーム画像を描画（背景）
    compositeCtx.drawImage(frameImage, 0, 0);

    // 2. ボードを512x512で描画
    const boardCanvas = renderBoardToSize(frames[i], FRAME_CONFIG.windowSize);

    // 3. 窓の位置にボードを合成
    compositeCtx.drawImage(
      boardCanvas,
      FRAME_CONFIG.windowX,
      FRAME_CONFIG.windowY
    );

    // 4. GIFフレームとして追加
    gif.addFrame(compositeCtx, { copy: true, delay: frameDelay });

    // 進捗通知
    if (onProgress) {
      onProgress((i + 1) / frames.length * 0.5); // 前半50%はフレーム追加
    }
  }

  // GIFをレンダリング
  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });

    gif.on('progress', (p: number) => {
      if (onProgress) {
        onProgress(0.5 + p * 0.5); // 後半50%はエンコード
      }
    });

    gif.on('error', (err: Error) => {
      reject(err);
    });

    gif.render();
  });
}

/**
 * フレームなしのアニメーションGIFを生成
 *
 * @param frames BoardState配列
 * @param options 生成オプション
 * @returns GIF Blob
 */
export async function generateAnimatedGif(
  frames: BoardState[],
  options: { cellSize?: number; frameDelay?: number; onProgress?: (progress: number) => void } = {}
): Promise<Blob> {
  const { cellSize = DEFAULT_CELL_SIZE, frameDelay = 100, onProgress } = options;
  const width = BOARD_SIZE * cellSize;
  const height = BOARD_SIZE * cellSize;

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: '/gif.worker.js',
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  for (let i = 0; i < frames.length; i++) {
    const imageData = boardStateToImageData(ctx, frames[i], cellSize);
    ctx.putImageData(imageData, 0, 0);
    gif.addFrame(ctx, { copy: true, delay: frameDelay });

    if (onProgress) {
      onProgress((i + 1) / frames.length * 0.5);
    }
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => resolve(blob));
    gif.on('progress', (p: number) => {
      if (onProgress) onProgress(0.5 + p * 0.5);
    });
    gif.on('error', (err: Error) => reject(err));
    gif.render();
  });
}
