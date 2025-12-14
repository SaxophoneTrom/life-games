"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import type { Season } from "@/types/game";

/**
 * 現在のシーズン計算（JSTベース）
 */
function getCurrentSeasonId(): number {
  const JST_OFFSET = 9 * 60 * 60 * 1000; // 9時間（ミリ秒）
  const WEEK = 7 * 24 * 60 * 60 * 1000; // 1週間（ミリ秒）

  const now = Date.now();
  const jstTime = now + JST_OFFSET;
  const seasonId = Math.floor(jstTime / WEEK);

  return seasonId;
}

/**
 * シーズン終了までの残り時間計算
 */
function getTimeUntilSeasonEnd(): number {
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  const now = Date.now();
  const jstTime = now + JST_OFFSET;
  const currentWeekStart = Math.floor(jstTime / WEEK) * WEEK;
  const nextWeekStart = currentWeekStart + WEEK;
  const remainingMs = nextWeekStart - jstTime;

  return remainingMs;
}

/**
 * 残り時間をフォーマット
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * シーズン情報取得API
 */
async function fetchCurrentSeason(): Promise<Season | null> {
  try {
    const response = await fetch("/api/season");

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch season");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching season:", error);
    return null;
  }
}

/**
 * シーズン情報フック
 */
export function useSeason() {
  const { currentSeason, setSeason } = useGameStore();

  const {
    data: season,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["season", "current"],
    queryFn: fetchCurrentSeason,
    staleTime: 5 * 60 * 1000, // 5分
    refetchInterval: 60 * 1000, // 1分ごとに再取得
  });

  // シーズン情報をストアに反映
  useEffect(() => {
    if (season !== undefined) {
      setSeason(season);
    }
  }, [season, setSeason]);

  const currentSeasonId = getCurrentSeasonId();
  const remainingTime = getTimeUntilSeasonEnd();
  const remainingTimeFormatted = formatRemainingTime(remainingTime);

  return {
    season: currentSeason || season,
    isLoading,
    isError,
    error,
    refetch,
    currentSeasonId,
    remainingTime,
    remainingTimeFormatted,
    hasActiveSeason: !!currentSeason || !!season,
  };
}

/**
 * 過去のシーズン取得フック
 */
export function usePastSeasons() {
  return useQuery({
    queryKey: ["seasons", "past"],
    queryFn: async (): Promise<Season[]> => {
      const response = await fetch("/api/seasons?past=true");
      if (!response.ok) {
        throw new Error("Failed to fetch past seasons");
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10分
  });
}

/**
 * 特定シーズン取得フック
 */
export function useSeasonById(seasonId: number | null) {
  return useQuery({
    queryKey: ["season", seasonId],
    queryFn: async (): Promise<Season | null> => {
      if (seasonId === null) return null;

      const response = await fetch(`/api/season?id=${seasonId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch season");
      }
      return response.json();
    },
    enabled: seasonId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
