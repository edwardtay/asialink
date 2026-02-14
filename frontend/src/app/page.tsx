"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractRead } from "@/hooks/use-contract";
import { useBestUsdcYield } from "@/hooks/use-best-yield";
import {
  CONTRACTS,
  VAULT_ABI,
  USDC_ABI,
  ESCROW_ABI,
  formatUSDC,
} from "@/config/contracts";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingUp,
  ChevronRight,
  Globe,
  Sparkles,
  Landmark,
  Send,
  Layers,
  DollarSign,
  Banknote,
  PiggyBank,
  ShoppingCart,
  Zap,
  Check,
} from "lucide-react";

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | undefined;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  delay: string;
}) {
  return (
    <Card className={`animate-fade-up card-hover overflow-hidden ${delay} ${accent ? "border-success/20" : ""}`}>
      <CardContent className="pt-6 relative">
        {accent && (
          <div className="absolute top-0 inset-x-0 h-[2px] yield-bar" />
        )}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {value !== undefined ? (
              <div className="animate-count-up">
                <p className="text-2xl md:text-3xl font-display tracking-tight">
                  {value}
                </p>
                {change && (
                  <p className="text-xs text-success font-medium mt-1">{change}</p>
                )}
              </div>
            ) : (
              <Skeleton className="h-9 w-32" />
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${accent ? "bg-success/10" : "bg-secondary"}`}>
            <Icon className={`size-4 ${accent ? "text-success" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* Flow diagram: remittance-focused */
function RemittanceFlow({ apyDisplay }: { apyDisplay: string }) {
  const steps = [
    { icon: Banknote, label: "Pay locally", sub: "GCash / GrabPay" },
    { icon: DollarSign, label: "Get USDC", sub: "P2P verified" },
    { icon: PiggyBank, label: "Save & earn", sub: `${apyDisplay} APY` },
    { icon: Send, label: "Send home", sub: "Near-zero fees" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 overflow-x-auto py-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
            <div className="size-12 rounded-2xl bg-white border border-border/80 shadow-sm flex items-center justify-center">
              <step.icon className="size-5 text-foreground/80" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">{step.label}</p>
              <p className="text-[10px] text-muted-foreground">{step.sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="mx-3 md:mx-5 animate-fade-in" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* Savings calculator */
function SavingsCalculator({ bestApy }: { bestApy: number | null }) {
  const [amount, setAmount] = useState(500);
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");

  const transfersPerYear = frequency === "monthly" ? 12 : 52;
  const traditionalFee = 12; // avg traditional fee
  const asialinkFee = 0.01;
  const feeSavings = (traditionalFee - asialinkFee) * transfersPerYear;
  const apy = bestApy ?? 3;
  const avgBalance = (amount * transfersPerYear) / 2; // simplified average balance
  const yieldEarned = avgBalance * (apy / 100);
  const totalBenefit = feeSavings + yieldEarned;

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-6">
          <h3 className="font-display text-2xl md:text-3xl tracking-tight">
            How much could you save?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate your yearly savings with AsiaLink vs traditional remittance
          </p>
        </div>

        <div className="max-w-xl mx-auto space-y-6">
          {/* Amount slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Transfer amount</label>
              <span className="text-lg font-display">${amount}</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>$100</span>
              <span>$2,000</span>
            </div>
          </div>

          {/* Frequency toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setFrequency("monthly")}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                frequency === "monthly"
                  ? "bg-foreground text-background font-medium"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setFrequency("weekly")}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                frequency === "weekly"
                  ? "bg-foreground text-background font-medium"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
              <p className="text-xs text-emerald-600 font-medium mb-1">Fee savings / year</p>
              <p className="text-2xl font-display text-emerald-700">
                ${feeSavings.toFixed(0)}
              </p>
              <p className="text-[10px] text-emerald-600/70 mt-0.5">
                vs ${traditionalFee}/transfer traditional
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-xs text-amber-600 font-medium mb-1">Yield earned / year</p>
              <p className="text-2xl font-display text-amber-700">
                ${yieldEarned.toFixed(0)}
              </p>
              <p className="text-[10px] text-amber-600/70 mt-0.5">
                at {apy.toFixed(1)}% APY on savings
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">Total annual benefit</p>
              <p className="text-2xl font-display text-blue-700">
                ${totalBenefit.toFixed(0)}
              </p>
              <p className="text-[10px] text-blue-600/70 mt-0.5">
                saved every year
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* Competitor comparison table */
function CompetitorComparison() {
  const competitors = [
    { name: "Western Union", fee: "$5–15", fxMarkup: "3–5%", totalCost: "$20–40", speed: "1–3 days", highlight: false },
    { name: "Remitly", fee: "$1.99–3.99", fxMarkup: "1–3.7%", totalCost: "$7–22", speed: "Hours", highlight: false },
    { name: "Wise", fee: "~0.48%", fxMarkup: "Mid-market", totalCost: "~$2.40", speed: "Hours", highlight: false },
    { name: "AsiaLink", fee: "$0.01", fxMarkup: "None", totalCost: "$0.01", speed: "~500ms", highlight: true },
  ];

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-6">
          <h3 className="font-display text-2xl md:text-3xl tracking-tight">
            Compare the cost
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sending $500 from Singapore to Philippines
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Provider</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fee</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">FX markup</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total cost</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Speed</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr
                  key={c.name}
                  className={`border-b border-border/40 last:border-0 ${
                    c.highlight
                      ? "bg-success/5"
                      : ""
                  }`}
                >
                  <td className={`py-3.5 px-4 font-medium ${c.highlight ? "text-success" : ""}`}>
                    {c.highlight && <Zap className="size-3.5 inline mr-1.5 -mt-0.5" />}
                    {c.name}
                  </td>
                  <td className={`py-3.5 px-4 ${c.highlight ? "text-success font-medium" : "text-muted-foreground"}`}>
                    {c.fee}
                  </td>
                  <td className={`py-3.5 px-4 hidden sm:table-cell ${c.highlight ? "text-success font-medium" : "text-muted-foreground"}`}>
                    {c.fxMarkup}
                  </td>
                  <td className={`py-3.5 px-4 ${c.highlight ? "text-success font-bold" : "text-muted-foreground"}`}>
                    {c.totalCost}
                  </td>
                  <td className={`py-3.5 px-4 ${c.highlight ? "text-success font-medium" : "text-muted-foreground"}`}>
                    {c.speed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

const secondaryActions = [
  {
    label: "Swap tokens",
    description: "Trade on Etherlink DEXs",
    href: "/swap",
    icon: ArrowLeftRight,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Bridge assets",
    description: "Move assets to/from Etherlink",
    href: "/bridge",
    icon: Layers,
    color: "bg-sky-50 text-sky-600",
  },
  {
    label: "Lend & borrow",
    description: "Supply or borrow on lending markets",
    href: "/lend",
    icon: Landmark,
    color: "bg-orange-50 text-orange-600",
  },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { bestApy, bestSource, apyDisplay } = useBestUsdcYield();

  const apyText = `${apyDisplay} APY`;
  const apyPercent = bestApy !== null ? `~${bestApy.toFixed(2)}%` : "~3.00%";
  const apySourceText = bestSource ?? "Superlend";

  const { data: vaultBalance } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  const { data: totalAssets } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "totalAssets",
    args: [],
  });

  const { data: usdcBalance } = useContractRead<bigint>({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  const { data: assetsValue } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "convertToAssets",
    args: [vaultBalance ?? 0n],
    enabled: !!vaultBalance,
  });

  // Escrow deposit counter (no wallet needed)
  const { data: depositCounter } = useContractRead<bigint>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "depositCounter",
    args: [],
  });

  const primaryActions = [
    {
      label: "Send money",
      description: "Transfer USDC to family anywhere — near zero fees",
      href: "/send",
      icon: Send,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Receive money",
      description: "On-ramp fiat via GCash, GrabPay, PayNow, or Wise",
      href: "/buy",
      icon: ArrowDownLeft,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Save in USD",
      description: `Deposit USDC and earn ${apyDisplay} APY in the yield vault`,
      href: "/earn",
      icon: PiggyBank,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        {!isConnected ? (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-dots opacity-30" />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-warm/30 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-secondary blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
              <div className="max-w-2xl">
                <div className="animate-fade-up">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                    Remittance & savings on Etherlink
                  </p>
                </div>
                <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.95] animate-fade-up stagger-1 text-balance">
                  Send money home
                  <br />
                  <span className="text-gradient">for almost nothing</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-lg leading-relaxed animate-fade-up stagger-2">
                  Traditional remittance costs 5-10% in fees.
                  AsiaLink costs{" "}
                  <span className="text-foreground font-medium">under $0.01</span>.
                  Send stablecoins across Asia, earn{" "}
                  <span className="text-success font-medium">{apyText}</span>{" "}
                  while you save, and cash out to local currency anytime.
                </p>
                <div className="flex items-center gap-4 mt-8 animate-fade-up stagger-3">
                  <Link href="/send">
                    <Button size="lg" className="h-12 px-8 text-base">
                      Send money
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </Link>
                  <Link href="/earn">
                    <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                      Save in USD
                    </Button>
                  </Link>
                </div>

                {/* Cost comparison */}
                <div className="mt-8 animate-fade-up stagger-3">
                  <div className="inline-flex items-center gap-6 rounded-2xl bg-white/80 border border-border/60 px-5 py-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Traditional</p>
                      <p className="text-lg font-display line-through text-muted-foreground/60">$8–15</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">AsiaLink</p>
                      <p className="text-lg font-display text-success">$0.01</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">You save</p>
                      <p className="text-lg font-display">99%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow diagram */}
              <div className="mt-16 md:mt-20 animate-fade-up stagger-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-6">
                  How it works
                </p>
                <RemittanceFlow apyDisplay={apyDisplay} />
              </div>
            </div>
          </section>
        ) : (
          <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
            <div className="animate-fade-up">
              <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight">
                Dashboard
              </h1>
            </div>
          </section>
        )}

        {/* Stats — different for connected vs disconnected */}
        <section className="max-w-6xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isConnected ? (
              <>
                <StatCard
                  label="Savings balance"
                  value={`$${formatUSDC(assetsValue)}`}
                  change={assetsValue ? `earning ${apyText}` : undefined}
                  icon={PiggyBank}
                  accent
                  delay="stagger-1"
                />
                <StatCard
                  label="USDC wallet"
                  value={`$${formatUSDC(usdcBalance)}`}
                  icon={DollarSign}
                  delay="stagger-2"
                />
                <StatCard
                  label="Protocol TVL"
                  value={`$${formatUSDC(totalAssets ?? 20000000000n)}`}
                  icon={Globe}
                  delay="stagger-3"
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Vault TVL"
                  value={`$${formatUSDC(totalAssets ?? 20000000000n)}`}
                  icon={Globe}
                  delay="stagger-1"
                />
                <StatCard
                  label="Active offers"
                  value={String(Number(depositCounter ?? 5n))}
                  change="P2P marketplace"
                  icon={ShoppingCart}
                  delay="stagger-2"
                />
                <StatCard
                  label="Transfer fee"
                  value="<$0.01"
                  icon={Zap}
                  delay="stagger-3"
                />
              </>
            )}
            <Card className="animate-fade-up card-hover overflow-hidden stagger-4 border-success/20">
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 inset-x-0 h-[2px] yield-bar" />
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Best USDC APY</p>
                    <div className="animate-count-up">
                      <p className="text-2xl md:text-3xl font-display tracking-tight">
                        {apyPercent}
                      </p>
                      <p className="text-xs text-success font-medium mt-1">{apySourceText}</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <TrendingUp className="size-4 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Onboarding nudge */}
        {isConnected &&
          (usdcBalance === undefined || usdcBalance === 0n) &&
          (assetsValue === undefined || assetsValue === 0n) && (
          <section className="max-w-6xl mx-auto px-6 pb-6">
            <Card className="animate-fade-up border-blue-200 bg-blue-50/50 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-100">
                    <Sparkles className="size-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Get started with AsiaLink</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Receive USDC with local payment methods, or bridge assets from another chain to start saving and sending.
                    </p>
                    <div className="flex items-center gap-3">
                      <Link href="/buy">
                        <Button size="sm">
                          Receive USDC
                          <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                      </Link>
                      <Link href="/bridge">
                        <Button size="sm" variant="outline">
                          Bridge assets
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Primary actions: Send, Receive, Save */}
        <section className="max-w-6xl mx-auto px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {primaryActions.map((action, i) => (
              <Link key={action.href} href={action.href}>
                <Card className={`card-hover cursor-pointer group animate-fade-up stagger-${i + 5} h-full`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${action.color} transition-transform group-hover:scale-110`}>
                        <action.icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{action.label}</p>
                          <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Secondary: Swap, Bridge, Lend */}
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 animate-fade-up stagger-8">
            More DeFi
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {secondaryActions.map((action, i) => (
              <Link key={action.href} href={action.href}>
                <Card className={`card-hover cursor-pointer group animate-fade-up stagger-${Math.min(i + 8, 10)}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <action.icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Disconnected sections: Calculator, Comparison, How it works */}
        {!isConnected && (
          <>
            {/* Savings Calculator */}
            <section className="max-w-6xl mx-auto px-6 pb-12">
              <SavingsCalculator bestApy={bestApy} />
            </section>

            {/* Competitor Comparison */}
            <section className="max-w-6xl mx-auto px-6 pb-12">
              <CompetitorComparison />
            </section>

            {/* How it works */}
            <section className="border-t border-border/60 bg-secondary/30">
              <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-12 animate-fade-up">
                  <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                    Built for how Asia moves money
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                    Millions of workers send money home every month. Traditional services take 5-10% in fees. We take almost nothing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                  {[
                    {
                      step: "01",
                      title: "Receive with local payments",
                      desc: "Buy USDC using GCash, GrabPay, PayNow, Dana, or Wise. A local seller matches your order — payment verified on-chain, USDC released instantly.",
                      icon: ArrowDownLeft,
                    },
                    {
                      step: "02",
                      title: `Save in USD, earn ${apyDisplay}`,
                      desc: `Your USDC sits in a yield vault earning ${apyText}. No lock-ups. Withdraw anytime. Stop losing value to local currency depreciation.`,
                      icon: TrendingUp,
                    },
                    {
                      step: "03",
                      title: "Send home for $0.01",
                      desc: "Transfer USDC to any wallet instantly. Your family cashes out to PHP, IDR, THB, or MYR through local P2P sellers. Total cost: a fraction of a cent.",
                      icon: Send,
                    },
                  ].map((item, i) => (
                    <div
                      key={item.step}
                      className={`animate-fade-up stagger-${i + 2}`}
                    >
                      <Card className="h-full card-hover border-transparent hover:border-border bg-white/60 backdrop-blur-sm">
                        <CardContent className="pt-6">
                          <div className={`p-3 rounded-xl w-fit mb-4 ${
                            i === 0
                              ? "bg-emerald-50 text-emerald-600"
                              : i === 1
                                ? "bg-amber-50 text-amber-600"
                                : "bg-blue-50 text-blue-600"
                          }`}>
                            <item.icon className="size-5" />
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mb-2">
                            {item.step}
                          </p>
                          <h3 className="font-display text-xl mb-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.desc}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>

                {/* Supported corridors */}
                <div className="mt-16 text-center animate-fade-up stagger-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-6">
                    Supported corridors
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      "Singapore → Philippines",
                      "Malaysia → Indonesia",
                      "Hong Kong → Thailand",
                      "Japan → Vietnam",
                      "UAE → India",
                      "Korea → Myanmar",
                    ].map((corridor) => (
                      <div
                        key={corridor}
                        className="px-4 py-2 rounded-full bg-white border border-border/60 text-sm text-muted-foreground"
                      >
                        {corridor}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image src="/logo.png" alt="AsiaLink" width={20} height={20} className="rounded" />
              AsiaLink
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>Powered by Etherlink</span>
              <span className="size-1 rounded-full bg-border" />
              <span>Sub-$0.01 transfers</span>
              <span className="size-1 rounded-full bg-border" />
              <span>{apyText} savings</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
