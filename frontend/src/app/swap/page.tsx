"use client";

import type { WidgetConfig } from "@lifi/widget";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { WidgetErrorBoundary } from "@/components/widget-error-boundary";
import { LiFiWidgetWrapper } from "@/components/lifi-widget-wrapper";
import { lifiWidgetConfig } from "@/config/lifi-theme";
import { Info, Zap } from "lucide-react";

const LiFiWidget = dynamic(
  () => import("@lifi/widget").then((mod) => mod.LiFiWidget),
  { ssr: false, loading: () => <div className="h-[440px] rounded-2xl bg-card border border-border animate-pulse" /> }
);

export default function SwapPage() {
  const config: Partial<WidgetConfig> = useMemo(
    () => ({
      ...lifiWidgetConfig,
      fromChain: 42793,
      toChain: 42793,
    }),
    []
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-6">
        <div className="pt-10 pb-8 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-1">Trade</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Swap
          </h1>
          <p className="text-muted-foreground mt-1">
            Trade tokens with aggregated Etherlink liquidity
          </p>
        </div>

        <div className="animate-fade-up stagger-1">
          <WidgetErrorBoundary
            fallbackUrl="https://jumper.exchange/?fromChain=42793&toChain=42793"
            fallbackLabel="Open Swap on Jumper.exchange"
          >
            <LiFiWidgetWrapper>
              <LiFiWidget
                config={config as WidgetConfig}
                integrator="asialink"
              />
            </LiFiWidgetWrapper>
          </WidgetErrorBoundary>
        </div>

        <div className="mt-6 pb-12 animate-fade-up stagger-3 space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Zap className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Trades execute on Etherlink with sub-500ms finality and near-zero
              gas fees.
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 mt-0.5 shrink-0" />
            <span>
              AsiaLink aggregates liquidity from multiple Etherlink DEXs to find
              the best rate for your trade.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
