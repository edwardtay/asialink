"use client";

import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDefiYields, type Pool } from "@/hooks/use-defi-yields";
import {
  ExternalLink,
  Info,
  Landmark,
  Radio,
} from "lucide-react";

const FALLBACK_MARKETS: Pool[] = [
  {
    pool: "superlend-usdc",
    chain: "Etherlink",
    project: "superlend",
    symbol: "USDC",
    tvlUsd: 12400000,
    apy: 3.82,
    apyBase: 3.82,
    apyReward: null,
    rewardTokens: null,
    underlyingTokens: null,
  },
  {
    pool: "superlend-usdt",
    chain: "Etherlink",
    project: "superlend",
    symbol: "USDT",
    tvlUsd: 8700000,
    apy: 3.56,
    apyBase: 3.56,
    apyReward: null,
    rewardTokens: null,
    underlyingTokens: null,
  },
  {
    pool: "superlend-xtz",
    chain: "Etherlink",
    project: "superlend",
    symbol: "XTZ",
    tvlUsd: 4100000,
    apy: 2.41,
    apyBase: 2.41,
    apyReward: null,
    rewardTokens: null,
    underlyingTokens: null,
  },
];

const PROTOCOL_URLS: Record<string, string> = {
  superlend: "https://app.superlend.xyz/?chain=etherlink",
  gearbox: "https://app.gearbox.fi/",
  hanji: "https://www.hanji.io/",
};

const PROTOCOL_COLORS: Record<string, string> = {
  superlend: "bg-blue-100 text-blue-700",
  gearbox: "bg-amber-100 text-amber-700",
  hanji: "bg-violet-100 text-violet-700",
};

function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function MarketRow({ pool }: { pool: Pool }) {
  const protocolUrl = PROTOCOL_URLS[pool.project] ?? "#";
  const colorClass = PROTOCOL_COLORS[pool.project] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/30 transition-colors rounded-lg group">
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="size-9 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold">
          {pool.symbol.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium">{pool.symbol}</p>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${colorClass} border-0`}
          >
            {capitalize(pool.project)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 text-center hidden sm:block">
        <p className="text-sm font-medium text-success">
          {pool.apy.toFixed(2)}%
        </p>
        <p className="text-[10px] text-muted-foreground">APY</p>
      </div>

      <div className="flex-1 text-center hidden md:block">
        <p className="text-sm font-medium">{formatTVL(pool.tvlUsd)}</p>
        <p className="text-[10px] text-muted-foreground">TVL</p>
      </div>

      <div className="flex-1 text-center hidden lg:block">
        {pool.apyBase !== null && (
          <div>
            <p className="text-sm font-medium">
              {pool.apyBase.toFixed(2)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Base APY</p>
          </div>
        )}
      </div>

      <div className="ml-auto">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          asChild
        >
          <a href={protocolUrl} target="_blank" rel="noopener noreferrer">
            Supply on {capitalize(pool.project)}
            <ExternalLink className="size-3 ml-1" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-[140px]">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="flex-1 h-4 hidden sm:block" />
          <Skeleton className="flex-1 h-4 hidden md:block" />
          <Skeleton className="flex-1 h-4 hidden lg:block" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function LendPage() {
  const { data: pools, isLoading, isError } = useDefiYields();

  const markets = pools && pools.length > 0 ? pools : isError ? FALLBACK_MARKETS : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6">
        <div className="pt-10 pb-8 animate-fade-up">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Markets</p>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight">
                Lend & Borrow
              </h1>
            </div>
            {!isLoading && !isError && pools && pools.length > 0 && (
              <Badge
                variant="outline"
                className="ml-auto text-xs border-success/30 text-success bg-success/5"
              >
                <Radio className="size-3 mr-1" />
                Live data
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Supply assets to earn interest on Etherlink lending protocols
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          <div className="lg:col-span-2">
            <Card className="animate-fade-up stagger-1">
              <CardHeader className="pb-0">
                <CardDescription>
                  Live yields from Etherlink lending protocols
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground font-medium">
                  <div className="min-w-[140px]">Asset</div>
                  <div className="flex-1 text-center hidden sm:block">
                    APY
                  </div>
                  <div className="flex-1 text-center hidden md:block">
                    TVL
                  </div>
                  <div className="flex-1 text-center hidden lg:block">
                    Base APY
                  </div>
                  <div className="w-[180px]" />
                </div>

                {isLoading ? (
                  <LoadingRows />
                ) : (
                  <div className="space-y-0.5">
                    {markets.map((pool, i) => (
                      <div
                        key={pool.pool}
                        className={`animate-fade-up stagger-${Math.min(i + 2, 8)}`}
                      >
                        <MarketRow pool={pool} />
                      </div>
                    ))}
                    {markets.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No lending markets found on Etherlink yet.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="animate-fade-up stagger-3">
              <CardContent className="py-12 text-center">
                <div className="size-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <Landmark className="size-6 text-orange-600" />
                </div>
                <h3 className="font-display text-lg mb-1">
                  Earn yield on Etherlink
                </h3>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                  Supply assets to lending protocols and earn interest
                  automatically
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-up stagger-4">
              <CardContent className="pt-6 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Protocols
                </p>
                {[
                  {
                    name: "Superlend",
                    desc: "Lending protocol on Etherlink",
                    color: "bg-blue-100 text-blue-700",
                    url: PROTOCOL_URLS.superlend,
                  },
                  {
                    name: "Gearbox",
                    desc: "Composable leverage protocol",
                    color: "bg-amber-100 text-amber-700",
                    url: PROTOCOL_URLS.gearbox,
                  },
                ].map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:bg-secondary/30 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div
                      className={`size-7 rounded-lg ${p.color} flex items-center justify-center text-xs font-bold`}
                    >
                      {p.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.desc}
                      </p>
                    </div>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Yield data sourced from DeFiLlama. Click any market to supply
                directly on the protocol.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
