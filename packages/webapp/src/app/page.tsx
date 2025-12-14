"use client";

import Link from "next/link";
import { Header, BottomNav } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui";
import { GridThumbnail } from "@/components/game";
import { useSeason } from "@/hooks/useSeason";
import { decodeBoard } from "@/lib/boardEncoder";
import { formatEther } from "viem";

export default function HomePage() {
  const { season, isLoading, remainingTimeFormatted, hasActiveSeason } = useSeason();

  // 壁マスクのプレビュー用グリッド
  const wallGrid = season ? decodeBoard(season.wallA, season.wallB) : null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* No Active Season */}
          {!isLoading && !hasActiveSeason && (
            <Card className="text-center py-12 bg-zinc-900 border-zinc-800">
              <CardContent>
                <div className="text-zinc-400 mb-4">
                  <svg
                    className="mx-auto h-16 w-16 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium text-zinc-200">Coming Soon</p>
                  <p className="text-sm mt-2">
                    The next season hasn&apos;t started yet. Check back later!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Season */}
          {!isLoading && season && (
            <div className="space-y-4">
              {/* Season Header */}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">
                  Season #{season.id}
                </h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400">Ends in</span>
                  <span className="font-mono font-medium text-white bg-zinc-800 px-2 py-1 rounded">
                    {remainingTimeFormatted}
                  </span>
                </div>
              </div>

              {/* This Week's Challenge */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  {/* Wall Preview - 中央配置 */}
                  <div className="flex flex-col items-center mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Wall Pattern</p>
                    {wallGrid && (
                      <GridThumbnail
                        grid={wallGrid}
                        size={160}
                        className="rounded-lg"
                      />
                    )}
                  </div>

                  {/* Rules - コンパクト表示 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-zinc-500 text-xs">Initial</p>
                      <p className="font-bold text-white text-lg">{season.initialLiveCount}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-zinc-500 text-xs">Target</p>
                      <p className="font-bold text-white text-lg">{season.targetAlive}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-zinc-500 text-xs">Mint Fee</p>
                      <p className="font-medium text-white">{formatEther(BigInt(season.mintFee))} ETH</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-zinc-500 text-xs">Prize Pool</p>
                      <p className="font-medium text-green-400">{formatEther(BigInt(season.prizePool))} ETH</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Link href="/editor" className="w-full">
                    <Button fullWidth size="lg">
                      Create Your Board
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* How to Play - 簡略化 */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">How to Play</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ol className="space-y-2 text-sm text-zinc-400">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium">
                        1
                      </span>
                      <span>Design with up to {season.initialLiveCount} cells</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium">
                        2
                      </span>
                      <span>Run 128-gen simulation</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium">
                        3
                      </span>
                      <span>Target {season.targetAlive} surviving cells</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium">
                        4
                      </span>
                      <span>Mint &amp; claim rewards!</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
