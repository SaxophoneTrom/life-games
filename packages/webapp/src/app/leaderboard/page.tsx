"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header, BottomNav } from "@/components/layout";
import { Card, CardContent, Modal } from "@/components/ui";
import { GridThumbnail, SimulationPreview } from "@/components/game";
import { useSeason } from "@/hooks/useSeason";
import { decodeBoard } from "@/lib/boardEncoder";
import { runSimulation } from "@/lib/gameOfLife";
import type { LeaderboardEntry } from "@/types/game";

// デモデータ（APIが実装されるまで）
const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    tokenId: "1",
    ownerAddress: "0x1234567890123456789012345678901234567890",
    ownerFid: 12345,
    ownerName: "alice.eth",
    boardA: "0x0000000000000000000000000000000000000000000000000000000000000000",
    boardB: "0x0000000000000000000000000000000000000000000000000000000000000000",
    score: 500,
    finalAlive: 50,
  },
  {
    rank: 2,
    tokenId: "2",
    ownerAddress: "0x2345678901234567890123456789012345678901",
    ownerFid: 23456,
    ownerName: "bob.eth",
    boardA: "0x0000000000000000000000000000000000000000000000000000000000000000",
    boardB: "0x0000000000000000000000000000000000000000000000000000000000000000",
    score: 398,
    finalAlive: 48,
  },
  {
    rank: 3,
    tokenId: "3",
    ownerAddress: "0x3456789012345678901234567890123456789012",
    ownerFid: 34567,
    ownerName: "charlie.eth",
    boardA: "0x0000000000000000000000000000000000000000000000000000000000000000",
    boardB: "0x0000000000000000000000000000000000000000000000000000000000000000",
    score: 395,
    finalAlive: 55,
  },
];

async function fetchLeaderboard(seasonId: number): Promise<LeaderboardEntry[]> {
  // TODO: APIから取得
  return mockLeaderboard;
}

export default function LeaderboardPage() {
  const { season, currentSeasonId, isLoading: isSeasonLoading } = useSeason();
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [selectedSeasonId] = useState<number | null>(null);

  const effectiveSeasonId = selectedSeasonId ?? currentSeasonId;

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["leaderboard", effectiveSeasonId],
    queryFn: () => fetchLeaderboard(effectiveSeasonId),
    enabled: !!effectiveSeasonId,
  });

  const isLoading = isSeasonLoading || isLeaderboardLoading;

  // 選択されたエントリーのシミュレーション履歴
  const selectedEntryHistory = selectedEntry
    ? (() => {
        const grid = decodeBoard(selectedEntry.boardA, selectedEntry.boardB);
        const wallMask = season ? decodeBoard(season.wallA, season.wallB) : undefined;
        return runSimulation(grid, 256, wallMask);
      })()
    : [];

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: "1", color: "bg-yellow-500" };
      case 2:
        return { icon: "2", color: "bg-zinc-400" };
      case 3:
        return { icon: "3", color: "bg-amber-600" };
      default:
        return { icon: String(rank), color: "bg-zinc-700" };
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">
              Leaderboard
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">
                Season #{effectiveSeasonId}
              </span>
              {season?.finalizedAt ? (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-900/50 text-green-400">
                  Finalized
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-900/50 text-blue-400">
                  Live
                </span>
              )}
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!leaderboard || leaderboard.length === 0) && (
            <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
              <CardContent>
                <p className="text-zinc-400">
                  No entries yet. Be the first to mint!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard List */}
          {!isLoading && leaderboard && leaderboard.length > 0 && (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const rankDisplay = getRankDisplay(entry.rank);
                return (
                  <Card
                    key={entry.tokenId}
                    className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      {/* Rank Badge */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${rankDisplay.color} text-white font-bold text-sm`}>
                        {rankDisplay.icon}
                      </div>

                      {/* Board Thumbnail */}
                      <GridThumbnail
                        grid={decodeBoard(entry.boardA, entry.boardB)}
                        wallMask={season ? decodeBoard(season.wallA, season.wallB) : undefined}
                        size={48}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">
                          {entry.ownerName || formatAddress(entry.ownerAddress)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {entry.finalAlive} cells
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            entry.score === 500
                              ? "text-green-400"
                              : "text-blue-400"
                          }`}
                        >
                          {entry.score}
                        </p>
                        {entry.score === 500 && (
                          <p className="text-[10px] text-green-400">
                            Perfect!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Entry Detail Modal */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={`Board #${selectedEntry?.tokenId}`}
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-4">
            {/* Score */}
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${
                  selectedEntry.score === 500
                    ? "text-green-400"
                    : "text-blue-400"
                }`}
              >
                Score: {selectedEntry.score}
              </p>
              {selectedEntry.score === 500 && (
                <p className="text-green-400 font-medium">
                  Perfect Match!
                </p>
              )}
            </div>

            {/* Simulation Preview */}
            <SimulationPreview
              history={selectedEntryHistory}
              wallMask={season ? decodeBoard(season.wallA, season.wallB) : undefined}
              cellSize={12}
              targetAlive={season?.targetAlive ?? 50}
            />

            {/* Info */}
            <div className="border-t border-zinc-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Owner</span>
                <span className="font-medium text-white">
                  {selectedEntry.ownerName || formatAddress(selectedEntry.ownerAddress)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Final Alive</span>
                <span className="font-medium text-white">
                  {selectedEntry.finalAlive} cells
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Rank</span>
                <span className="font-medium text-white">
                  #{selectedEntry.rank}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
