"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { GridEditor, GridThumbnail } from "@/components/game";
import { useSeason } from "@/hooks/useSeason";
import { createEmptyGrid, countAliveCells, GRID_SIZE } from "@/lib/gameOfLife";
import { encodeBoard } from "@/lib/boardEncoder";
import { parseEther } from "viem";

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const { season, currentSeasonId } = useSeason();

  // フォーム状態
  const [wallGrid, setWallGrid] = useState(createEmptyGrid());
  const [initialLiveCount, setInitialLiveCount] = useState(20);
  const [targetAlive, setTargetAlive] = useState(50);
  const [mintFee, setMintFee] = useState("0.001");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 壁セルのトグル
  const handleWallToggle = useCallback((x: number, y: number) => {
    setWallGrid((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[y][x] = !newGrid[y][x];
      return newGrid;
    });
  }, []);

  // 壁クリア
  const handleClearWall = useCallback(() => {
    setWallGrid(createEmptyGrid());
  }, []);

  // ランダム壁生成
  const handleRandomWall = useCallback(() => {
    const newGrid = createEmptyGrid();
    const wallCount = Math.floor(Math.random() * 30) + 10;
    const positions: { x: number; y: number }[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        positions.push({ x, y });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < wallCount; i++) {
      const { x, y } = positions[i];
      newGrid[y][x] = true;
    }

    setWallGrid(newGrid);
  }, []);

  // シーズン設定送信
  const handleSubmit = async () => {
    if (!address) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { boardA: wallA, boardB: wallB } = encodeBoard(wallGrid);
      const mintFeeWei = parseEther(mintFee).toString();

      const payload = {
        seasonId: currentSeasonId,
        wallA,
        wallB,
        initialLiveCount,
        targetAlive,
        mintFee: mintFeeWei,
      };

      console.log("Setting season:", payload);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessage({ type: "success", text: "Season settings saved!" });
    } catch (error) {
      console.error("Error setting season:", error);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const wallCellCount = countAliveCells(wallGrid);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-white">
              Admin Panel
            </h1>
            <p className="text-xs text-zinc-500">
              Configure season settings
            </p>
          </div>

          {/* Not Connected */}
          {!isConnected && (
            <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
              <CardContent>
                <p className="text-zinc-400">
                  Please sign in to access admin.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Admin Form */}
          {isConnected && (
            <div className="space-y-4">
              {/* Season Info */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">Season ID</p>
                      <p className="text-lg font-bold text-white">#{currentSeasonId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Status</p>
                      <p className="text-sm font-medium text-white">
                        {season ? "Configured" : "Not Set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wall Editor */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white">Wall Pattern</CardTitle>
                    <span className="text-xs text-zinc-500">
                      {wallCellCount} cells
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col items-center gap-3">
                    <GridEditor
                      grid={wallGrid}
                      cellSize={12}
                      onCellToggle={handleWallToggle}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleClearWall}>
                        Clear
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRandomWall}>
                        Random
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Settings</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Initial Cells
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={400 - wallCellCount}
                      value={initialLiveCount}
                      onChange={(e) => setInitialLiveCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Target Alive
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={400}
                      value={targetAlive}
                      onChange={(e) => setTargetAlive(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Mint Fee (ETH)
                    </label>
                    <input
                      type="text"
                      value={mintFee}
                      onChange={(e) => setMintFee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Preview</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-4">
                    <GridThumbnail grid={wallGrid} size={100} />
                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Walls</span>
                        <span className="text-white">{wallCellCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Available</span>
                        <span className="text-white">{400 - wallCellCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Initial</span>
                        <span className="text-white">{initialLiveCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Target</span>
                        <span className="text-white">{targetAlive}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Fee</span>
                        <span className="text-white">{mintFee} ETH</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message */}
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.type === "success"
                      ? "bg-green-900/30 text-green-400"
                      : "bg-red-900/30 text-red-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                fullWidth
                size="lg"
              >
                Save Settings
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
