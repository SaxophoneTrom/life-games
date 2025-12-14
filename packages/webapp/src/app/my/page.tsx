"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header, BottomNav } from "@/components/layout";
import { Button, Card, CardContent, Modal } from "@/components/ui";
import { GridThumbnail, SimulationPreview } from "@/components/game";
import { useSeason } from "@/hooks/useSeason";
import { decodeBoard } from "@/lib/boardEncoder";
import { runSimulation } from "@/lib/gameOfLife";
import { formatEther } from "viem";
import type { Submission, ClaimInfo } from "@/types/game";

// デモデータ
const mockSubmissions: Submission[] = [];

async function fetchMySubmissions(address: string): Promise<Submission[]> {
  // TODO: APIから取得
  return mockSubmissions;
}

async function fetchClaimInfo(address: string): Promise<ClaimInfo[]> {
  // TODO: APIから取得
  return [];
}

export default function MyPage() {
  const { address, isConnected } = useAccount();
  const { season } = useSeason();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: submissions, isLoading: isSubmissionsLoading } = useQuery({
    queryKey: ["my-submissions", address],
    queryFn: () => fetchMySubmissions(address!),
    enabled: !!address,
  });

  const { data: claimInfo } = useQuery({
    queryKey: ["claim-info", address],
    queryFn: () => fetchClaimInfo(address!),
    enabled: !!address,
  });

  // 未クレーム報酬計算
  const unclaimedRewards = claimInfo?.filter((c) => !c.claimed) ?? [];
  const totalUnclaimed = unclaimedRewards.reduce(
    (sum, c) => sum + BigInt(c.amount),
    0n
  );

  // 選択された提出物のシミュレーション履歴
  const selectedHistory = selectedSubmission
    ? (() => {
        const grid = decodeBoard(selectedSubmission.boardA, selectedSubmission.boardB);
        const wallMask = season ? decodeBoard(season.wallA, season.wallB) : undefined;
        return runSimulation(grid, 256, wallMask);
      })()
    : [];

  // クレーム実行（TODO: 実装）
  const handleClaim = async () => {
    if (!address || unclaimedRewards.length === 0) return;

    setIsClaiming(true);
    try {
      // TODO: claimBatch実行
      console.log("Claiming rewards...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {/* Header */}
          <h1 className="text-xl font-bold text-white mb-4">
            My NFTs
          </h1>

          {/* Not Connected */}
          {!isConnected && (
            <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
              <CardContent>
                <p className="text-zinc-400 mb-4">
                  Please sign in to view your NFTs.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connected */}
          {isConnected && (
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-3 text-center">
                    <p className="text-xl font-bold text-white">
                      {submissions?.length ?? 0}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      NFTs
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-3 text-center">
                    <p className="text-xl font-bold text-white">
                      0/1
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Free Mints
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-3 text-center">
                    <p className="text-xl font-bold text-green-400">
                      {formatEther(totalUnclaimed)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Unclaimed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Claim Button */}
              {totalUnclaimed > 0n && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-white text-sm">
                        Unclaimed rewards!
                      </p>
                      <p className="text-xs text-zinc-500">
                        {unclaimedRewards.length} NFT(s)
                      </p>
                    </div>
                    <Button onClick={handleClaim} isLoading={isClaiming} size="sm">
                      Claim {formatEther(totalUnclaimed)} ETH
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Loading */}
              {isSubmissionsLoading && (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              )}

              {/* Empty State */}
              {!isSubmissionsLoading && (!submissions || submissions.length === 0) && (
                <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
                  <CardContent>
                    <svg
                      className="mx-auto h-12 w-12 text-zinc-700 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="text-zinc-400 mb-4 text-sm">
                      No boards minted yet
                    </p>
                    <Link href="/editor">
                      <Button>Create Your First Board</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* NFT List */}
              {!isSubmissionsLoading && submissions && submissions.length > 0 && (
                <div className="space-y-2">
                  {submissions.map((submission) => (
                    <Card
                      key={submission.id}
                      className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <GridThumbnail
                          grid={decodeBoard(submission.boardA, submission.boardB)}
                          wallMask={season ? decodeBoard(season.wallA, season.wallB) : undefined}
                          size={56}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">
                            Token #{submission.tokenId}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Season #{submission.seasonId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              submission.score === 500
                                ? "text-green-400"
                                : "text-blue-400"
                            }`}
                          >
                            {submission.score}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {submission.finalAlive} cells
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Submission Detail Modal */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title={`Board #${selectedSubmission?.tokenId}`}
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            {/* Score */}
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${
                  selectedSubmission.score === 500
                    ? "text-green-400"
                    : "text-blue-400"
                }`}
              >
                Score: {selectedSubmission.score}
              </p>
            </div>

            {/* Simulation Preview */}
            <SimulationPreview
              history={selectedHistory}
              wallMask={season ? decodeBoard(season.wallA, season.wallB) : undefined}
              cellSize={12}
              targetAlive={season?.targetAlive ?? 50}
            />

            {/* Info */}
            <div className="border-t border-zinc-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Season</span>
                <span className="font-medium text-white">
                  #{selectedSubmission.seasonId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Final Alive</span>
                <span className="font-medium text-white">
                  {selectedSubmission.finalAlive} cells
                </span>
              </div>
              {selectedSubmission.txHash && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Transaction</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${selectedSubmission.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View on Basescan
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
