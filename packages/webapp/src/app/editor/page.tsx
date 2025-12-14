"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Header, BottomNav } from "@/components/layout";
import { Button, Card, CardContent, Modal, ModalFooter } from "@/components/ui";
import { GameBoard, type SimulationResult } from "@/components/game";
import { useGameStore } from "@/stores/gameStore";
import { useSeason } from "@/hooks/useSeason";

export default function EditorPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { season, isLoading: isSeasonLoading, hasActiveSeason } = useSeason();

  const {
    grid,
    wallMask,
    toggleCell,
    clearGrid,
    randomizeGrid,
    isValidBoard,
    getEncodedBoard,
  } = useGameStore();

  const [showMintModal, setShowMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const targetCellCount = season?.initialLiveCount ?? 100;
  const targetAlive = season?.targetAlive ?? 50;

  // ランダム配置
  const handleRandom = useCallback(() => {
    randomizeGrid(targetCellCount);
  }, [randomizeGrid, targetCellCount]);

  // クリア
  const handleClear = useCallback(() => {
    clearGrid();
    setSimulationResult(null);
  }, [clearGrid]);

  // シミュレーション完了時
  const handleSimulationComplete = useCallback((result: SimulationResult) => {
    setSimulationResult(result);
  }, []);

  // ミントモーダルを開く
  const handleOpenMintModal = useCallback(() => {
    if (!isConnected) {
      return;
    }
    setMintError(null);
    setShowMintModal(true);
  }, [isConnected]);

  // ミント実行（TODO: 実際のミント処理）
  const handleMint = useCallback(async () => {
    if (!address || !season) return;

    setIsMinting(true);
    setMintError(null);

    try {
      const { boardA, boardB } = getEncodedBoard();

      // TODO: ミント署名をサーバーから取得
      // TODO: コントラクトでミント実行

      console.log("Minting board:", { boardA, boardB, address });

      // デモ: 2秒後に成功
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setShowMintModal(false);
      router.push("/my");
    } catch (error) {
      console.error("Mint error:", error);
      setMintError("Failed to mint. Please try again.");
    } finally {
      setIsMinting(false);
    }
  }, [address, season, getEncodedBoard, router]);

  // ミント可能かどうか
  const canMint = isValidBoard() && isConnected && simulationResult !== null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {/* Loading / No Season */}
          {isSeasonLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!isSeasonLoading && !hasActiveSeason && (
            <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
              <CardContent>
                <p className="text-zinc-400">
                  No active season. Please check back later.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/")}
                >
                  Go Home
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Game Board */}
          {!isSeasonLoading && hasActiveSeason && (
            <div className="space-y-4">
              {/* 統合ゲームボード */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <GameBoard
                    grid={grid}
                    wallMask={wallMask}
                    cellSize={14}
                    targetCellCount={targetCellCount}
                    targetAlive={targetAlive}
                    onCellToggle={toggleCell}
                    onClear={handleClear}
                    onRandom={handleRandom}
                    onSimulationComplete={handleSimulationComplete}
                  />
                </CardContent>
              </Card>

              {/* Info & Mint */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="text-center text-sm">
                      <p className="text-zinc-400">
                        Target: <span className="font-medium text-white">{targetAlive}</span> cells after 128 generations
                      </p>
                      {simulationResult && (
                        <p className="text-zinc-400">
                          Result: <span className="font-medium text-white">{simulationResult.finalAlive}</span> cells
                          <span className="text-zinc-500"> (distance: {Math.abs(simulationResult.finalAlive - targetAlive)})</span>
                        </p>
                      )}
                    </div>

                    {!isConnected && (
                      <p className="text-sm text-amber-400 text-center">
                        Please sign in to mint
                      </p>
                    )}

                    <Button
                      onClick={handleOpenMintModal}
                      disabled={!canMint}
                      fullWidth
                      size="lg"
                    >
                      Mint NFT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Mint Confirmation Modal */}
      <Modal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        title="Mint Your Board"
        size="md"
      >
        <div className="space-y-4">
          {simulationResult && (
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">
                Score: {simulationResult.score}
              </p>
              {simulationResult.isPerfect && (
                <p className="text-green-400 font-medium">
                  Perfect Match Bonus!
                </p>
              )}
              <p className="text-sm text-zinc-400 mt-2">
                {simulationResult.finalAlive} cells survive after 128 generations
              </p>
            </div>
          )}

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Free mint today</span>
              <span className="font-medium text-white">1 remaining</span>
            </div>
          </div>

          {mintError && (
            <div className="p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
              {mintError}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowMintModal(false)}
            disabled={isMinting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMint}
            isLoading={isMinting}
          >
            Confirm Mint
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
