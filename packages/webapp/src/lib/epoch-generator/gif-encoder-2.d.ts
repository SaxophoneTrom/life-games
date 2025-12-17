// Type definitions for gif-encoder-2
// Project: https://github.com/benjaminadk/gif-encoder-2

declare module 'gif-encoder-2' {
  import { Writable } from 'stream';

  interface GIFEncoderOptions {
    highWaterMark?: number;
  }

  interface GIFEncoderOutput {
    getData(): Buffer;
  }

  class GIFEncoder extends Writable {
    constructor(width: number, height: number, algorithm?: string, useOptimizer?: boolean, totalFrames?: number);

    /**
     * Set the delay time for each frame (in milliseconds)
     */
    setDelay(ms: number): void;

    /**
     * Set frame rate (frames per second)
     */
    setFrameRate(fps: number): void;

    /**
     * Set disposal method (0-3)
     */
    setDispose(code: number): void;

    /**
     * Set number of repetitions (0 = infinite loop, -1 = no repeat)
     */
    setRepeat(repeat: number): void;

    /**
     * Set transparent color
     */
    setTransparent(color: number | string): void;

    /**
     * Set quality (1-20, lower is better quality but slower)
     */
    setQuality(quality: number): void;

    /**
     * Start the encoder
     */
    start(): void;

    /**
     * Add a frame to the GIF
     */
    addFrame(ctx: CanvasRenderingContext2D | ImageData | Uint8ClampedArray): void;

    /**
     * Finish encoding
     */
    finish(): void;

    /**
     * Get the output stream
     */
    out: GIFEncoderOutput;

    /**
     * Create a read stream of the GIF
     */
    createReadStream(): NodeJS.ReadableStream;
  }

  export default GIFEncoder;
}
