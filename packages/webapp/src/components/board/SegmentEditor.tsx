'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoardState, Cell, BOARD_SIZE, PALETTE } from '@/types';
import {
  isAlive,
  getColor,
  setCell,
  cloneBoard,
  injectCells,
  runGenerations,
  countAliveCells,
} from '@/lib/life-engine';

type Mode = 'edit' | 'play';
type PlaySpeed = 1 | 2 | 4;

// タップ判定の閾値（ピクセル）
const TAP_THRESHOLD = 10;

interface SegmentEditorProps {
  baseState: BoardState;
  injectedCells: Cell[];
  onCellsChange: (cells: Cell[]) => void;
  selectedColorIndex: number;
  maxCells: number;
  nGenerations: number;
  cellSize?: number;
  className?: string;
  enableZoom?: boolean;
}

/**
 * 統合セグメントエディタ - 編集とシミュレーション再生を1つのコンポーネントで
 */
export const SegmentEditor = memo(function SegmentEditor({
  baseState,
  injectedCells,
  onCellsChange,
  selectedColorIndex,
  maxCells,
  nGenerations,
  cellSize = 4,
  className = '',
  enableZoom = true,
}: SegmentEditorProps) {
  // モード管理
  const [mode, setMode] = useState<Mode>('edit');

  // 再生関連
  const [history, setHistory] = useState<BoardState[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const [isLooping, setIsLooping] = useState(false); // 無限ループ再生
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ズーム・パン関連
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number | null>(null);

  // ドラッグモード関連
  const [isDragMode, setIsDragMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPaintMode, setDragPaintMode] = useState<boolean | null>(null); // true=追加, false=削除
  const visitedCellsRef = useRef<Set<string>>(new Set());

  // injectedCellsの最新値を保持するref（useEffect内のイベントハンドラ用）
  const injectedCellsRef = useRef<Cell[]>(injectedCells);
  useEffect(() => {
    injectedCellsRef.current = injectedCells;
  }, [injectedCells]);

  // キャンバス参照
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasSize = BOARD_SIZE * cellSize;

  // 現在表示するボード状態
  const displayState = useMemo(() => {
    if (mode === 'play' && history.length > 0) {
      return history[currentGeneration] || history[0];
    }
    // 編集モード: ベース状態 + 注入セル
    return injectCells(baseState, injectedCells);
  }, [mode, history, currentGeneration, baseState, injectedCells]);

  const aliveCells = countAliveCells(displayState);
  const canSimulate = injectedCells.length > 0 && mode === 'edit';

  // 再生間隔（ミリ秒）
  const intervalMs = 150 / speed;

  // ========== 描画 ==========
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 背景
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    if (mode === 'edit') {
      // 編集モード: baseStateを薄く + 注入セルを強調
      // 既存セル（薄く表示）
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (isAlive(baseState, x, y)) {
            const colorIndex = getColor(baseState, x, y);
            ctx.fillStyle = PALETTE[colorIndex] + '60'; // 薄く
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
      // 注入セル（強調）
      for (const cell of injectedCells) {
        ctx.fillStyle = PALETTE[cell.colorIndex];
        ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
        // 白枠
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          cell.x * cellSize + 0.5,
          cell.y * cellSize + 0.5,
          cellSize - 1,
          cellSize - 1
        );
      }
    } else {
      // 再生モード: displayState（シミュレーション結果）のみを描画
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (isAlive(displayState, x, y)) {
            const colorIndex = getColor(displayState, x, y);
            ctx.fillStyle = PALETTE[colorIndex];
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  }, [baseState, injectedCells, displayState, mode, cellSize, canvasSize]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  // ========== シミュレーション制御 ==========
  const runSim = useCallback(() => {
    if (!canSimulate) return;

    const withInjected = injectCells(baseState, injectedCells);
    const states = runGenerations(withInjected, nGenerations);
    setHistory(states);
    setCurrentGeneration(0);
    setMode('play');
    setIsPlaying(true);
  }, [canSimulate, baseState, injectedCells, nGenerations]);

  const handleReset = useCallback(() => {
    setMode('edit');
    setHistory([]);
    setCurrentGeneration(0);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const nextGen = useCallback(() => {
    setCurrentGeneration((prev) =>
      prev < history.length - 1 ? prev + 1 : prev
    );
  }, [history.length]);

  const prevGen = useCallback(() => {
    setCurrentGeneration((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToStart = useCallback(() => {
    setCurrentGeneration(0);
    setIsPlaying(false);
  }, []);

  const goToEnd = useCallback(() => {
    setCurrentGeneration(history.length - 1);
    setIsPlaying(false);
  }, [history.length]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentGeneration(Number(e.target.value));
    },
    []
  );

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

  // 再生ループ
  useEffect(() => {
    if (isPlaying && mode === 'play') {
      intervalRef.current = setInterval(() => {
        setCurrentGeneration((prev) => {
          if (prev >= history.length - 1) {
            if (isLooping) {
              // ループ再生: 先頭に戻る
              return 0;
            } else {
              // 通常再生: 停止
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, mode, intervalMs, history.length, isLooping]);

  // ========== 編集機能 ==========
  // タッチイベント処理済みフラグ（タッチとクリックの二重発火防止）
  const touchHandledRef = useRef(false);

  // 座標からセル位置を計算
  const getCellFromPosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const canvasRect = canvas.getBoundingClientRect();
      const clickXInCanvas = clientX - canvasRect.left;
      const clickYInCanvas = clientY - canvasRect.top;
      const displayToLogicalScale = canvasSize / canvasRect.width;
      const canvasX = clickXInCanvas * displayToLogicalScale;
      const canvasY = clickYInCanvas * displayToLogicalScale;

      const cellX = Math.floor(canvasX / cellSize);
      const cellY = Math.floor(canvasY / cellSize);

      if (cellX >= 0 && cellX < BOARD_SIZE && cellY >= 0 && cellY < BOARD_SIZE) {
        return { x: cellX, y: cellY };
      }
      return null;
    },
    [canvasSize, cellSize]
  );

  // セルの操作実行（ドラッグモード用）
  const handleCellAction = useCallback(
    (x: number, y: number, isStart: boolean) => {
      if (mode !== 'edit') return;

      const cellKey = `${x}-${y}`;
      if (visitedCellsRef.current.has(cellKey)) return;

      const existingIndex = injectedCells.findIndex((c) => c.x === x && c.y === y);
      const cellExists = existingIndex !== -1;

      if (isStart) {
        // 最初のセルでペイントモードを決定
        const newMode = !cellExists;
        setDragPaintMode(newMode);
        visitedCellsRef.current.clear();
        visitedCellsRef.current.add(cellKey);

        if (cellExists) {
          // 削除
          const newCells = [...injectedCells];
          newCells.splice(existingIndex, 1);
          onCellsChange(newCells);
        } else if (injectedCells.length < maxCells && !isAlive(baseState, x, y)) {
          // 追加
          const newCells = [...injectedCells, { x, y, colorIndex: selectedColorIndex }];
          onCellsChange(newCells);
        }
      } else if (dragPaintMode !== null) {
        visitedCellsRef.current.add(cellKey);

        if (dragPaintMode && !cellExists && injectedCells.length < maxCells && !isAlive(baseState, x, y)) {
          // 追加モード
          const newCells = [...injectedCells, { x, y, colorIndex: selectedColorIndex }];
          onCellsChange(newCells);
        } else if (!dragPaintMode && cellExists) {
          // 削除モード
          const newCells = [...injectedCells];
          newCells.splice(existingIndex, 1);
          onCellsChange(newCells);
        }
      }
    },
    [mode, injectedCells, onCellsChange, selectedColorIndex, maxCells, baseState, dragPaintMode]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // タッチイベントで処理済みの場合はスキップ（二重発火防止）
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }
      if (mode !== 'edit') return;
      // ドラッグモードON時はhandleMouseDown/Upで処理するのでスキップ
      if (isDragMode) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Canvasの実際の位置とサイズを取得（CSS transform適用後）
      const canvasRect = canvas.getBoundingClientRect();
      // クリック座標をCanvas内座標に変換
      const clickXInCanvas = e.clientX - canvasRect.left;
      const clickYInCanvas = e.clientY - canvasRect.top;
      // Canvas表示サイズから論理サイズへのスケール
      const displayToLogicalScale = canvasSize / canvasRect.width;
      const canvasX = clickXInCanvas * displayToLogicalScale;
      const canvasY = clickYInCanvas * displayToLogicalScale;

      const cellX = Math.floor(canvasX / cellSize);
      const cellY = Math.floor(canvasY / cellSize);

      if (cellX < 0 || cellX >= BOARD_SIZE || cellY < 0 || cellY >= BOARD_SIZE) {
        return;
      }

      // 既に注入されているセルか確認
      const existingIndex = injectedCells.findIndex(
        (c) => c.x === cellX && c.y === cellY
      );

      if (existingIndex !== -1) {
        // 削除
        const newCells = [...injectedCells];
        newCells.splice(existingIndex, 1);
        onCellsChange(newCells);
      } else {
        // 追加（上限チェック）
        if (injectedCells.length >= maxCells) {
          return;
        }
        // ベース状態で既に生きているセルには配置不可
        if (isAlive(baseState, cellX, cellY)) {
          return;
        }
        const newCells = [
          ...injectedCells,
          { x: cellX, y: cellY, colorIndex: selectedColorIndex },
        ];
        onCellsChange(newCells);
      }
    },
    [mode, baseState, injectedCells, onCellsChange, selectedColorIndex, maxCells, cellSize, canvasSize, isDragMode]
  );

  const handleClear = useCallback(() => {
    onCellsChange([]);
  }, [onCellsChange]);

  // ========== マウスドラッグ処理（ドラッグモード時） ==========
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'edit' || !isDragMode) return;
      e.preventDefault();
      setIsDragging(true);

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, true);
      }
    },
    [mode, isDragMode, getCellFromPosition, handleCellAction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || mode !== 'edit' || !isDragMode) return;

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell) {
        handleCellAction(cell.x, cell.y, false);
      }
    },
    [isDragging, mode, isDragMode, getCellFromPosition, handleCellAction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragPaintMode(null);
    visitedCellsRef.current.clear();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setDragPaintMode(null);
    visitedCellsRef.current.clear();
  }, []);

  // ========== ズーム・パン処理（ドラッグモードOFF時のみ） ==========
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // ドラッグモードON時はuseEffectのネイティブイベントで処理するのでスキップ
    if (mode === 'edit' && isDragMode) return;

    if (!enableZoom) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // ピンチズーム開始
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      setIsPanning(true);
    }
  }, [enableZoom, mode, isDragMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // ドラッグモードON時はuseEffectのネイティブイベントで処理するのでスキップ
    if (mode === 'edit' && isDragMode) return;

    if (!enableZoom) return;

    if (e.touches.length === 1 && lastTouchRef.current && touchStartRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const moved = Math.sqrt(dx * dx + dy * dy);

      // 移動量が閾値を超えたらパンモード
      if (moved > TAP_THRESHOLD) {
        setIsPanning(true);
        const moveDx = touch.clientX - lastTouchRef.current.x;
        const moveDy = touch.clientY - lastTouchRef.current.y;
        setOffset((prev) => ({
          x: prev.x + moveDx,
          y: prev.y + moveDy,
        }));
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      }
    } else if (e.touches.length === 2 && lastDistanceRef.current) {
      // ピンチズーム
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const delta = distance / lastDistanceRef.current;

      setScale((prev) => Math.max(0.5, Math.min(5, prev * delta)));
      lastDistanceRef.current = distance;
    }
  }, [enableZoom, mode, isDragMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // ドラッグモードON時はuseEffectのネイティブイベントで処理するのでスキップ
    if (mode === 'edit' && isDragMode) return;

    // タップ判定（編集モードでセル配置）- ドラッグモードOFF時のみ
    if (mode === 'edit' && !isDragMode && touchStartRef.current && !isPanning && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const elapsed = Date.now() - touchStartRef.current.time;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const moved = Math.sqrt(dx * dx + dy * dy);

      // 300ms以内、10px以内の移動ならタップとして処理
      if (elapsed < 300 && moved < TAP_THRESHOLD) {
        // タッチで処理したことをマーク（onClick二重発火防止）
        touchHandledRef.current = true;

        const cell = getCellFromPosition(touch.clientX, touch.clientY);
        if (cell) {
          const existingIndex = injectedCells.findIndex(
            (c) => c.x === cell.x && c.y === cell.y
          );

          if (existingIndex !== -1) {
            const newCells = [...injectedCells];
            newCells.splice(existingIndex, 1);
            onCellsChange(newCells);
          } else if (injectedCells.length < maxCells && !isAlive(baseState, cell.x, cell.y)) {
            const newCells = [
              ...injectedCells,
              { x: cell.x, y: cell.y, colorIndex: selectedColorIndex },
            ];
            onCellsChange(newCells);
          }
        }
      }
    }

    setIsPanning(false);
    setIsDragging(false);
    setDragPaintMode(null);
    visitedCellsRef.current.clear();
    touchStartRef.current = null;
    lastTouchRef.current = null;
    lastDistanceRef.current = null;
  }, [mode, isDragMode, isPanning, injectedCells, maxCells, baseState, selectedColorIndex, onCellsChange, getCellFromPosition]);

  // マウスホイールズーム（ネイティブイベントで登録してページスクロールを防止）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableZoom) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(0.5, Math.min(5, prev * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [enableZoom]);

  // ドラッグモード時のタッチイベント（canvasに直接登録、passive: false）
  // dragPaintModeをrefで管理（イベントハンドラ内でリアルタイムに参照するため）
  const dragPaintModeRef = useRef<boolean | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'edit' || !isDragMode) return;

    const handleDragTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      visitedCellsRef.current.clear();

      const cell = getCellFromPosition(touch.clientX, touch.clientY);
      if (cell) {
        const cellKey = `${cell.x}-${cell.y}`;
        visitedCellsRef.current.add(cellKey);

        const currentCells = injectedCellsRef.current;
        const existingIndex = currentCells.findIndex(
          (c) => c.x === cell.x && c.y === cell.y
        );

        if (existingIndex !== -1) {
          // 削除モード
          dragPaintModeRef.current = false;
          setDragPaintMode(false);
          const newCells = [...currentCells];
          newCells.splice(existingIndex, 1);
          onCellsChange(newCells);
        } else if (currentCells.length < maxCells && !isAlive(baseState, cell.x, cell.y)) {
          // 追加モード
          dragPaintModeRef.current = true;
          setDragPaintMode(true);
          const newCells = [...currentCells, { x: cell.x, y: cell.y, colorIndex: selectedColorIndex }];
          onCellsChange(newCells);
        }
      }
    };

    const handleDragTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const cell = getCellFromPosition(touch.clientX, touch.clientY);

      if (cell && dragPaintModeRef.current !== null) {
        const cellKey = `${cell.x}-${cell.y}`;
        if (visitedCellsRef.current.has(cellKey)) return;
        visitedCellsRef.current.add(cellKey);

        const currentCells = injectedCellsRef.current;
        const existingIndex = currentCells.findIndex(
          (c) => c.x === cell.x && c.y === cell.y
        );
        const cellExists = existingIndex !== -1;

        if (dragPaintModeRef.current && !cellExists && currentCells.length < maxCells && !isAlive(baseState, cell.x, cell.y)) {
          // 追加モード
          const newCells = [...currentCells, { x: cell.x, y: cell.y, colorIndex: selectedColorIndex }];
          onCellsChange(newCells);
        } else if (!dragPaintModeRef.current && cellExists) {
          // 削除モード
          const newCells = [...currentCells];
          newCells.splice(existingIndex, 1);
          onCellsChange(newCells);
        }
      }
    };

    const handleDragTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      visitedCellsRef.current.clear();
      touchStartRef.current = null;
      lastTouchRef.current = null;
      dragPaintModeRef.current = null;
      setDragPaintMode(null);
    };

    canvas.addEventListener('touchstart', handleDragTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleDragTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleDragTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleDragTouchStart);
      canvas.removeEventListener('touchmove', handleDragTouchMove);
      canvas.removeEventListener('touchend', handleDragTouchEnd);
    };
  }, [mode, isDragMode, getCellFromPosition, maxCells, baseState, selectedColorIndex, onCellsChange]);

  // ダブルクリック/ダブルタップでリセット
  const handleDoubleClick = useCallback(() => {
    if (!enableZoom) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [enableZoom]);

  // ========== レンダリング ==========
  const cellCountValid = injectedCells.length > 0 && injectedCells.length <= maxCells;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* ボード表示 */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative inline-block rounded-lg overflow-hidden bg-[#0B0F14] border border-white/20"
          style={{ touchAction: enableZoom ? 'none' : 'auto' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className={`block ${mode === 'edit' ? (isDragMode ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}`}
              style={{
                imageRendering: 'pixelated',
                width: canvasSize,
                height: canvasSize,
              }}
            />
          </div>
          {/* ズームインジケータ */}
          {enableZoom && scale !== 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
              {Math.round(scale * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* 情報表示 */}
      <div className="flex items-center justify-between text-sm px-1">
        <div className="flex items-center gap-3">
          <span className="text-white/60">
            Gen:{' '}
            <span className="font-mono font-medium text-white">
              {mode === 'play' ? currentGeneration : 0}
            </span>
            <span className="text-white/40">/{nGenerations}</span>
          </span>
          <span className="text-white/60">
            Alive:{' '}
            <span className="font-mono font-medium text-white">{aliveCells}</span>
          </span>
          {/* ドラッグモードトグル */}
          {mode === 'edit' && (
            <button
              onClick={() => setIsDragMode(!isDragMode)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                isDragMode
                  ? 'bg-[#F67280] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title={isDragMode ? 'Drag mode: ON (pinch zoom disabled)' : 'Drag mode: OFF (tap to place)'}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              Draw
            </button>
          )}
        </div>

        <span
          className={`text-sm font-medium ${
            cellCountValid ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {injectedCells.length}{' '}
          <span className="text-white/40">(max {maxCells})</span>
        </span>
      </div>

      {/* スライダー */}
      <input
        type="range"
        min={0}
        max={mode === 'play' && history.length > 0 ? history.length - 1 : nGenerations}
        value={mode === 'play' ? currentGeneration : 0}
        onChange={handleSliderChange}
        disabled={mode === 'edit'}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-[#F67280]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer"
      />

      {/* 再生コントロール */}
      <div className="flex items-center justify-center gap-1">
        {/* ループトグル */}
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded transition-colors ${
            isLooping
              ? 'bg-[#F67280] text-white hover:bg-[#e5616f]'
              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
          }`}
          aria-label={isLooping ? 'Loop on' : 'Loop off'}
          title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
          </svg>
        </button>

        <button
          onClick={goToStart}
          disabled={mode === 'edit'}
          className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          aria-label="Go to start"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          onClick={prevGen}
          disabled={mode === 'edit' || currentGeneration === 0}
          className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          aria-label="Previous"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* 再生/シミュレーションボタン */}
        <button
          onClick={mode === 'edit' ? runSim : togglePlay}
          disabled={mode === 'edit' && !cellCountValid}
          className="p-3 rounded-full bg-[#F67280] text-white hover:bg-[#e5616f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={mode === 'edit' ? 'Run simulation' : isPlaying ? 'Pause' : 'Play'}
        >
          {mode === 'edit' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={nextGen}
          disabled={mode === 'edit' || currentGeneration === history.length - 1}
          className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          aria-label="Next"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        <button
          onClick={goToEnd}
          disabled={mode === 'edit'}
          className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          aria-label="Go to end"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        <button
          onClick={cycleSpeed}
          className="ml-1 px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors text-white"
          aria-label={`Speed: ${speed}x`}
        >
          {speed}x
        </button>

        <button
          onClick={handleReset}
          disabled={mode === 'edit'}
          className="ml-1 p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white/60 hover:text-white"
          aria-label="Reset and edit"
          title="Reset & Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={handleClear}
          disabled={mode === 'play' || injectedCells.length === 0}
          className="ml-1 px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          aria-label="Clear cells"
        >
          Clear
        </button>
      </div>
    </div>
  );
});
