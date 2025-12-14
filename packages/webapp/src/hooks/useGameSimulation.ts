"use client";

import { useCallback, useMemo } from "react";
import { useGameStore } from "@/stores/gameStore";
import {
  countAliveCells,
  calculateScore,
  MAX_GENERATIONS,
} from "@/lib/gameOfLife";

/**
 * シミュレーション実行・管理フック
 */
export function useGameSimulation() {
  const {
    grid,
    wallMask,
    simulationHistory,
    isSimulating,
    currentSeason,
    runSimulation,
    clearSimulation,
  } = useGameStore();

  // シミュレーション実行
  const simulate = useCallback(() => {
    runSimulation();
  }, [runSimulation]);

  // シミュレーション結果
  const result = useMemo(() => {
    if (simulationHistory.length === 0) {
      return null;
    }

    const initialGrid = simulationHistory[0];
    const finalGrid = simulationHistory[simulationHistory.length - 1];
    const initialAlive = countAliveCells(initialGrid);
    const finalAlive = countAliveCells(finalGrid);
    const targetAlive = currentSeason?.targetAlive ?? 0;
    const score = calculateScore(finalAlive, targetAlive);
    const isPerfect = finalAlive === targetAlive;

    return {
      initialAlive,
      finalAlive,
      targetAlive,
      score,
      isPerfect,
      generations: simulationHistory.length - 1,
    };
  }, [simulationHistory, currentSeason]);

  // 現在の世代を取得
  const getGeneration = useCallback(
    (gen: number) => {
      if (gen < 0 || gen >= simulationHistory.length) {
        return null;
      }
      return simulationHistory[gen];
    },
    [simulationHistory]
  );

  return {
    grid,
    wallMask,
    history: simulationHistory,
    isSimulating,
    hasResult: simulationHistory.length > 0,
    result,
    simulate,
    clearSimulation,
    getGeneration,
    maxGenerations: MAX_GENERATIONS,
  };
}
