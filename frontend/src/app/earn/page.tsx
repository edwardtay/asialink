"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Navbar } from "@/components/navbar";
import { TransactionSuccess } from "@/components/transaction-success";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractRead, useContractWrite } from "@/hooks/use-contract";
import {
  CONTRACTS,
  VAULT_ABI,
  USDC_ABI,
  formatUSDC,
  parseUSDC,
} from "@/config/contracts";
import { useBestUsdcYield } from "@/hooks/use-best-yield";
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
  Shield,
  Info,
  ChevronRight,
  AlertCircle,
  Loader2,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import { etherlinkTestnet } from "@/config/wagmi";

type Tab = "deposit" | "withdraw";
type SuccessState = { type: Tab; amount: string } | null;

export default function SavingsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongChain = isConnected && chainId !== etherlinkTestnet.id;
  const { bestApy, apyDisplay, usdcPools } = useBestUsdcYield();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [successState, setSuccessState] = useState<SuccessState>(null);
  const [validationError, setValidationError] = useState("");
  const apyRate = bestApy !== null ? bestApy / 100 : 0.03;

  const targetChain = etherlinkTestnet.id;

  const { data: usdcBalance, refetch: refetchUsdc } = useContractRead<bigint>({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
    chainId: targetChain,
  });

  const { data: vaultShares, refetch: refetchShares } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
    chainId: targetChain,
  });

  const { data: assetsValue, refetch: refetchAssets } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "convertToAssets",
    args: [vaultShares ?? 0n],
    enabled: !!vaultShares,
    chainId: targetChain,
  });

  const { data: totalAssets } = useContractRead<bigint>({
    address: CONTRACTS.vault,
    abi: VAULT_ABI,
    functionName: "totalAssets",
    args: [],
    chainId: targetChain,
  });

  const { data: allowance, refetch: refetchAllowance } = useContractRead<bigint>({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address, CONTRACTS.vault],
    enabled: !!address,
    chainId: targetChain,
  });

  const refetchAll = useCallback(() => {
    refetchUsdc();
    refetchShares();
    refetchAssets();
    refetchAllowance();
  }, [refetchUsdc, refetchShares, refetchAssets, refetchAllowance]);

  const { write: approve, isPrompting: isApproving, isConfirming: isApproveConfirming } =
    useContractWrite({
      address: CONTRACTS.usdc,
      abi: USDC_ABI,
      functionName: "approve",
      onSuccess: refetchAll,
    });

  const { write: deposit, isPrompting: isDepositing, isConfirming: isDepositConfirming } =
    useContractWrite({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: "deposit",
      onSuccess: () => {
        setSuccessState({ type: "deposit", amount });
        setAmount("");
        refetchAll();
      },
    });

  const { write: withdraw, isPrompting: isWithdrawing, isConfirming: isWithdrawConfirming } =
    useContractWrite({
      address: CONTRACTS.vault,
      abi: VAULT_ABI,
      functionName: "withdraw",
      onSuccess: () => {
        setSuccessState({ type: "withdraw", amount });
        setAmount("");
        refetchAll();
      },
    });

  // Testnet faucet: mint 1000 USDC
  const { write: mintUsdc, isPrompting: isMinting, isConfirming: isMintConfirming } =
    useContractWrite({
      address: CONTRACTS.usdc,
      abi: USDC_ABI,
      functionName: "mint",
      onSuccess: refetchAll,
    });

  const parsedAmount = parseUSDC(amount);
  const needsApproval = tab === "deposit" && (allowance ?? 0n) < parsedAmount;
  const isBusy = isApproving || isApproveConfirming || isDepositing || isDepositConfirming || isWithdrawing || isWithdrawConfirming;

  const maxAmount = tab === "deposit"
    ? usdcBalance ? Number(usdcBalance) / 1e6 : 0
    : assetsValue ? Number(assetsValue) / 1e6 : 0;

  const validateAmount = (val: string): string => {
    if (!val) return "";
    const parsed = parseFloat(val);
    if (parsed <= 0) return "Amount must be greater than zero";
    if (parsed > maxAmount) return `Insufficient balance (${maxAmount.toFixed(2)} USDC)`;
    return "";
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setValidationError(validateAmount(val));
  };

  const handleAction = () => {
    if (!parsedAmount || !address) return;
    const err = validateAmount(amount);
    if (err) {
      setValidationError(err);
      return;
    }
    if (tab === "deposit") {
      if (needsApproval) {
        approve({ args: [CONTRACTS.vault, parsedAmount] });
      } else {
        deposit({ args: [parsedAmount, address] });
      }
    } else {
      withdraw({ args: [parsedAmount, address, address] });
    }
  };

  if (successState) {
    const isDeposit = successState.type === "deposit";
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess
            title={isDeposit ? "Deposit confirmed" : "Withdrawal confirmed"}
            description={
              isDeposit
                ? `${successState.amount} USDC is now earning yield in the vault. Your eUSDC balance has been updated.`
                : `${successState.amount} USDC has been returned to your wallet.`
            }
            nextStep={
              isDeposit
                ? { label: "View dashboard", href: "/", description: "Track your savings growth over time" }
                : { label: "Cash out to fiat", href: "/receive?tab=cashout", description: "Off-ramp your USDC back to fiat via P2P" }
            }
            onDismiss={() => setSuccessState(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6">
        {/* Header */}
        <div className="pt-10 pb-8 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-1">Vault</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Earn
          </h1>
        </div>

        {/* Wrong chain warning */}
        {isWrongChain && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50 animate-fade-up">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertTriangle className="size-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Wrong network</p>
                  <p className="text-xs text-muted-foreground">Contracts are deployed on Etherlink Shadownet testnet</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => switchChain({ chainId: etherlinkTestnet.id })}
                >
                  Switch network
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Testnet faucet */}
        {isConnected && !isWrongChain && (usdcBalance === undefined || usdcBalance === 0n) && (assetsValue === undefined || assetsValue === 0n) && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50 animate-fade-up">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Droplets className="size-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Get test USDC</p>
                  <p className="text-xs text-muted-foreground">Mint 1,000 USDC on Etherlink Shadownet to try the vault</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => mintUsdc({ args: [address, 1000_000_000n] })}
                  disabled={isMinting || isMintConfirming}
                >
                  {isMinting || isMintConfirming ? (
                    <><Loader2 className="size-3.5 animate-spin mr-1" /> Minting...</>
                  ) : (
                    <>Mint 1,000 USDC</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-12">
          {/* Left: Stats + Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Balance card */}
            <Card className="animate-fade-up stagger-1 overflow-hidden">
              <div className="h-1 yield-bar" />
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Your savings</p>
                {isConnected ? (
                  <p className="text-4xl font-display tracking-tight mt-1 animate-count-up">
                    ${formatUSDC(assetsValue)}
                  </p>
                ) : (
                  <Skeleton className="h-10 w-36 mt-1" />
                )}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="size-3" />
                    {apyDisplay} APY
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Live yield
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Wallet balance */}
            <Card className="animate-fade-up stagger-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">USDC wallet</p>
                    {isConnected ? (
                      <p className="text-2xl font-display mt-0.5 animate-count-up">
                        ${formatUSDC(usdcBalance)}
                      </p>
                    ) : (
                      <Skeleton className="h-8 w-28 mt-0.5" />
                    )}
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary">
                    <Shield className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vault info */}
            <Card className="animate-fade-up stagger-3">
              <CardContent className="pt-6 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vault details
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "Total TVL", value: `$${formatUSDC(totalAssets)}` },
                    { label: "Token", value: "eUSDC" },
                    { label: "Withdraw fee", value: "None" },
                    { label: "Lock period", value: "None" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
                {/* Live yield breakdown */}
                {usdcPools.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                      Live yields
                    </p>
                    <div className="space-y-2">
                      {usdcPools.map((pool) => (
                        <div key={pool.pool} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {pool.project.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                          </span>
                          <span className="text-success font-medium">
                            {pool.apy.toFixed(2)}% APY
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Action card */}
          <div className="lg:col-span-3">
            <Card className="animate-fade-up stagger-2">
              <CardHeader className="pb-0">
                {/* Tab switcher */}
                <div className="flex items-center p-1 bg-secondary/60 rounded-lg w-fit">
                  <button
                    onClick={() => { setTab("deposit"); setAmount(""); setValidationError(""); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                      tab === "deposit"
                        ? "bg-white text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowDown className="size-3.5" />
                    Deposit
                  </button>
                  <button
                    onClick={() => { setTab("withdraw"); setAmount(""); setValidationError(""); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                      tab === "withdraw"
                        ? "bg-white text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowUp className="size-3.5" />
                    Withdraw
                  </button>
                </div>
                <CardDescription className="mt-3">
                  {tab === "deposit"
                    ? "Deposit USDC into the savings vault to start earning yield"
                    : "Withdraw your USDC from the savings vault"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {/* Amount input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Amount</label>
                      <button
                        onClick={() => handleAmountChange(maxAmount.toFixed(2))}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Balance: {maxAmount.toFixed(2)} USDC
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        min="0"
                        step="0.01"
                        className={`h-14 text-xl font-display pr-20 pl-4 ${validationError ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-blue-600">$</span>
                        </div>
                        USDC
                      </div>
                    </div>
                    {validationError && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        {validationError}
                      </p>
                    )}
                    {/* Quick amounts */}
                    <div className="flex gap-2 mt-3">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleAmountChange((maxAmount * pct / 100).toFixed(2))}
                          className="flex-1 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/60 hover:bg-secondary rounded-md transition-colors"
                        >
                          {pct === 100 ? "Max" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  {parsedAmount > 0n && !validationError && (
                    <div className="rounded-xl bg-secondary/40 border border-border/60 p-4 space-y-2 animate-scale-in">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">You {tab === "deposit" ? "deposit" : "receive"}</span>
                        <span className="font-medium">{amount} USDC</span>
                      </div>
                      {tab === "deposit" && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">You receive</span>
                            <span className="font-medium">~{amount} eUSDC</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Est. yearly yield ({apyDisplay})</span>
                            <span className="text-success font-medium">
                              +${(parseFloat(amount || "0") * apyRate).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  <Button
                    className="w-full h-12 text-base"
                    onClick={isWrongChain ? () => switchChain({ chainId: etherlinkTestnet.id }) : handleAction}
                    disabled={!isConnected || (!isWrongChain && (!parsedAmount || !!validationError || isBusy))}
                  >
                    {!isConnected
                      ? "Connect wallet to continue"
                      : isWrongChain
                        ? "Switch to Etherlink Shadownet"
                        : isBusy
                          ? <><Loader2 className="size-4 animate-spin" /> Confirming...</>
                          : tab === "deposit"
                            ? needsApproval
                              ? "Approve USDC"
                              : "Deposit USDC"
                            : "Withdraw USDC"}
                    {!isBusy && isConnected && parsedAmount > 0n && !validationError && (
                      <ChevronRight className="size-4 ml-1" />
                    )}
                  </Button>

                  {/* Info note */}
                  {tab === "deposit" && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="size-3.5 mt-0.5 shrink-0" />
                      <span>
                        Your USDC is deposited into the ERC-4626 vault and deployed
                        across yield strategies on Etherlink. Withdraw anytime with no lockup.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
