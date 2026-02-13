import { useQuery } from "@tanstack/react-query";

export type Pool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  rewardTokens: string[] | null;
  underlyingTokens: string[] | null;
};

type PoolsResponse = {
  status: string;
  data: Pool[];
};

const ETHERLINK_PROJECTS = ["superlend", "gearbox", "hanji"];

async function fetchEtherlinkYields(): Promise<Pool[]> {
  const res = await fetch("https://yields.llama.fi/pools");
  if (!res.ok) throw new Error("Failed to fetch yields");
  const json: PoolsResponse = await res.json();
  return json.data.filter(
    (p) =>
      p.chain === "Etherlink" && ETHERLINK_PROJECTS.includes(p.project)
  );
}

export function useDefiYields() {
  return useQuery({
    queryKey: ["defi-yields", "etherlink"],
    queryFn: fetchEtherlinkYields,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
