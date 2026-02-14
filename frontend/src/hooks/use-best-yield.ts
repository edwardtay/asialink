import { useMemo } from "react";
import { useDefiYields, type Pool } from "./use-defi-yields";

export type BestYieldData = {
  bestApy: number | null;
  bestSource: string | null;
  totalTvl: number | null;
  apyDisplay: string;
  usdcPools: Pool[];
  isLoading: boolean;
};

export function useBestUsdcYield(): BestYieldData {
  const { data: pools, isLoading } = useDefiYields();

  return useMemo(() => {
    if (!pools || pools.length === 0) {
      return {
        bestApy: null,
        bestSource: null,
        totalTvl: null,
        apyDisplay: "~3%",
        usdcPools: [],
        isLoading,
      };
    }

    // Filter to USDC pools only
    const usdcPools = pools.filter(
      (p) =>
        p.symbol.toUpperCase().includes("USDC") ||
        p.symbol.toUpperCase().includes("USD COIN")
    );

    if (usdcPools.length === 0) {
      return {
        bestApy: null,
        bestSource: null,
        totalTvl: null,
        apyDisplay: "~3%",
        usdcPools: [],
        isLoading,
      };
    }

    // Find best APY
    const sorted = [...usdcPools].sort((a, b) => b.apy - a.apy);
    const best = sorted[0];

    // Sum TVL across all USDC pools
    const totalTvl = usdcPools.reduce((sum, p) => sum + p.tvlUsd, 0);

    // Format source name
    const bestSource = best.project
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      bestApy: best.apy,
      bestSource,
      totalTvl,
      apyDisplay: `~${best.apy.toFixed(1)}%`,
      usdcPools: sorted,
      isLoading,
    };
  }, [pools, isLoading]);
}
