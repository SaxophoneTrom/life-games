import { NextResponse } from "next/server";
import type { Season } from "@/types/game";

// デモ用のシーズンデータ
// 実際にはSupabaseから取得する
function getDemoSeason(): Season {
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const seasonId = Math.floor((now + JST_OFFSET) / WEEK);

  return {
    id: seasonId,
    // デモ用の壁パターン（中央に十字の壁）
    wallA: "0x0000000000000000000000000000000000000000000000000000000000000000",
    wallB: "0x0000000000000000000000000000000000000000000000000000000000000000",
    initialLiveCount: 100,
    targetAlive: 50,
    mintFee: "1000000000000000", // 0.001 ETH
    prizePool: "0",
    createdAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // 特定のシーズンIDが指定された場合
    if (id) {
      // TODO: Supabaseから取得
      const season = getDemoSeason();
      if (season.id !== Number(id)) {
        return NextResponse.json(
          { error: "Season not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(season);
    }

    // 現在のシーズンを返す
    const season = getDemoSeason();
    return NextResponse.json(season);
  } catch (error) {
    console.error("Error fetching season:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // TODO: 管理者認証チェック
    const body = await request.json();

    const { seasonId, wallA, wallB, initialLiveCount, targetAlive, mintFee } = body;

    // バリデーション
    if (!seasonId || !wallA || !wallB || !initialLiveCount || !targetAlive || !mintFee) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Supabaseに保存
    console.log("Saving season:", {
      seasonId,
      wallA,
      wallB,
      initialLiveCount,
      targetAlive,
      mintFee,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving season:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
