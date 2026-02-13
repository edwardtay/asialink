"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { TransactionSuccess } from "@/components/transaction-success";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useContractRead, useContractWrite } from "@/hooks/use-contract";
import {
  CONTRACTS,
  ESCROW_ABI,
  USDC_ABI,
  formatUSDC,
  parseUSDC,
} from "@/config/contracts";
import {
  Plus,
  TrendingUp,
  Pause,
  Play,
  LogOut,
  Wallet,
  ChevronRight,
  Info,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { type Address, toHex } from "viem";

type DepositInfo = {
  id: number;
  depositor: Address;
  amount: bigint;
  sharesInVault: bigint;
  payeeDetails: `0x${string}`;
  paymentMethod: `0x${string}`;
  acceptingIntents: boolean;
};

function decodeBytes32(val: `0x${string}`): string {
  try {
    const hex = val.replace(/0+$/, "");
    if (hex.length <= 2) return "";
    const bytes = [];
    for (let i = 2; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return "";
  }
}

function MyDepositCard({
  deposit,
  onRefetch,
}: {
  deposit: DepositInfo;
  onRefetch: () => void;
}) {
  const { data: currentValue } = useContractRead<bigint>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "getDepositValue",
    args: [BigInt(deposit.id)],
  });

  const { data: yieldEarned } = useContractRead<bigint>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "getDepositYield",
    args: [BigInt(deposit.id)],
  });

  const { write: toggleAccepting, isPrompting: isToggling } = useContractWrite({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "setAcceptingIntents",
    onSuccess: onRefetch,
  });

  const { write: withdrawDeposit, isPrompting: isWithdrawing } = useContractWrite({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "withdrawDeposit",
    onSuccess: onRefetch,
  });

  const paymentMethod = decodeBytes32(deposit.paymentMethod);

  return (
    <Card className="card-hover overflow-hidden">
      {deposit.acceptingIntents && <div className="h-0.5 yield-bar" />}
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-mono">
              #{deposit.id}
            </p>
            <p className="font-display text-3xl tracking-tight mt-0.5">
              ${formatUSDC(currentValue ?? deposit.amount)}
            </p>
          </div>
          <Badge
            variant={deposit.acceptingIntents ? "secondary" : "outline"}
            className={deposit.acceptingIntents ? "bg-success/10 text-success border-success/20" : ""}
          >
            {deposit.acceptingIntents ? "Active" : "Paused"}
          </Badge>
        </div>

        {yieldEarned !== undefined && yieldEarned > 0n && (
          <div className="flex items-center gap-1.5 text-sm mb-4 bg-success/5 text-success px-3 py-1.5 rounded-lg w-fit">
            <TrendingUp className="size-3.5" />
            <span className="font-medium">+${formatUSDC(yieldEarned)} earned</span>
          </div>
        )}

        <div className="space-y-2 text-sm mb-5">
          {paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium">{paymentMethod}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">
              {deposit.acceptingIntents ? "Accepting buyers" : "Not accepting"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              toggleAccepting({
                args: [BigInt(deposit.id), !deposit.acceptingIntents],
              })
            }
            disabled={isToggling}
          >
            {deposit.acceptingIntents ? (
              <><Pause className="size-3.5" /> Pause</>
            ) : (
              <><Play className="size-3.5" /> Resume</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => withdrawDeposit({ args: [BigInt(deposit.id)] })}
            disabled={isWithdrawing}
          >
            <LogOut className="size-3.5" /> Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SellPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [payeeDetails, setPayeeDetails] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { data: accountDeposits, refetch: refetchDeposits } = useContractRead<bigint[]>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "getAccountDeposits",
    args: [address],
    enabled: !!address,
  });

  const { data: usdcBalance, refetch: refetchUsdc } = useContractRead<bigint>({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  const { data: allowance, refetch: refetchAllowance } = useContractRead<bigint>({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address, CONTRACTS.escrow],
    enabled: !!address,
  });

  const refetchAll = useCallback(() => {
    refetchDeposits();
    refetchUsdc();
    refetchAllowance();
  }, [refetchDeposits, refetchUsdc, refetchAllowance]);

  const depositIds = (accountDeposits ?? []).map(Number);
  const depositDetails = depositIds.map((id) => {
    const { data } = useContractRead<
      [Address, bigint, bigint, `0x${string}`, `0x${string}`, boolean]
    >({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: "deposits",
      args: [BigInt(id)],
    });
    if (!data) return null;
    return {
      id,
      depositor: data[0],
      amount: data[1],
      sharesInVault: data[2],
      payeeDetails: data[3],
      paymentMethod: data[4],
      acceptingIntents: data[5],
    } as DepositInfo;
  });

  const myDeposits = depositDetails.filter((d): d is DepositInfo => d !== null);

  const { write: approve, isPrompting: isApproving, isConfirming: isApproveConfirming } =
    useContractWrite({
      address: CONTRACTS.usdc,
      abi: USDC_ABI,
      functionName: "approve",
      onSuccess: refetchAll,
    });

  const { write: createDeposit, isPrompting: isCreating, isConfirming: isCreateConfirming } =
    useContractWrite({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: "createDeposit",
      onSuccess: () => {
        setAmount("");
        setPayeeDetails("");
        setShowCreate(false);
        setShowSuccess(true);
        refetchAll();
      },
    });

  const parsedAmount = parseUSDC(amount);
  const needsApproval = (allowance ?? 0n) < parsedAmount;
  const isBusy = isApproving || isApproveConfirming || isCreating || isCreateConfirming;

  const validateAmount = (val: string): string => {
    if (!val) return "";
    const parsed = parseFloat(val);
    if (parsed <= 0) return "Amount must be greater than zero";
    const maxBalance = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
    if (parsed > maxBalance) return `Insufficient balance (${maxBalance.toFixed(2)} USDC)`;
    return "";
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setValidationError(validateAmount(val));
  };

  const handleCreate = () => {
    if (!parsedAmount) return;
    const err = validateAmount(amount);
    if (err) {
      setValidationError(err);
      return;
    }
    if (needsApproval) {
      approve({ args: [CONTRACTS.escrow, parsedAmount] });
    } else {
      const payeeBytes = toHex(payeeDetails || "contact-seller", { size: 32 });
      const methodBytes = toHex(paymentMethod, { size: 32 });
      createDeposit({ args: [parsedAmount, payeeBytes, methodBytes] });
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess
            title="Deposit created"
            description="Your USDC is now in the escrow vault, earning yield while waiting for buyers to match."
            nextStep={{
              label: "View your savings",
              href: "/",
              description: "Track your yield earnings from the dashboard",
            }}
            onDismiss={() => setShowSuccess(false)}
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
        <div className="pt-10 pb-8 flex items-end justify-between animate-fade-up">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Off-ramp</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight">
              Cash out
            </h1>
            <p className="text-muted-foreground mt-1">
              Provide USDC liquidity and earn yield while waiting for buyers
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="hidden sm:flex"
          >
            {showCreate ? (
              <><X className="size-4" /> Cancel</>
            ) : (
              <><Plus className="size-4" /> New deposit</>
            )}
          </Button>
        </div>

        {/* Mobile button */}
        <div className="sm:hidden mb-6 animate-fade-up stagger-1">
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full"
          >
            {showCreate ? (
              <><X className="size-4" /> Cancel</>
            ) : (
              <><Plus className="size-4" /> New deposit</>
            )}
          </Button>
        </div>

        {/* Create deposit form */}
        {showCreate && (
          <Card className="mb-8 animate-scale-in overflow-hidden">
            <div className="h-0.5 bg-foreground" />
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Create a deposit
              </CardTitle>
              <CardDescription>
                Your USDC goes into the yield vault and earns while waiting for buyers.
                Withdraw anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">USDC amount</label>
                    <button
                      onClick={() => handleAmountChange(usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "0")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Balance: {formatUSDC(usdcBalance)} USDC
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
                      className={`h-14 text-xl font-display pr-16 ${validationError ? "border-destructive" : ""}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      USDC
                    </span>
                  </div>
                  {validationError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {validationError}
                    </p>
                  )}
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Accepted payment method
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["GCash", "GrabPay", "PromptPay", "Dana", "OVO", "PayNow", "Wise", "Revolut"].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`px-4 py-2.5 text-sm rounded-xl border-2 transition-all ${
                          paymentMethod === method
                            ? "border-foreground bg-foreground text-background font-medium"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-ring"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payee details */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Your {paymentMethod} handle
                  </label>
                  <Input
                    placeholder={`@your-${paymentMethod.toLowerCase()}-handle`}
                    value={payeeDetails}
                    onChange={(e) => setPayeeDetails(e.target.value)}
                    className="h-12"
                  />
                </div>

                {/* Yield info */}
                {parsedAmount > 0n && !validationError && (
                  <div className="rounded-xl bg-success/5 border border-success/10 p-4 space-y-2 animate-scale-in">
                    <div className="flex items-center gap-2 text-sm text-success font-medium">
                      <TrendingUp className="size-4" />
                      While you wait, you earn
                    </div>
                    <p className="text-2xl font-display text-success">
                      ~${(parseFloat(amount || "0") * 0.04).toFixed(2)}
                      <span className="text-sm text-success/70 ml-1">/year (target)</span>
                    </p>
                  </div>
                )}

                {/* Info note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    Your USDC is deposited into the ERC-4626 yield vault. When a buyer
                    matches, verified fiat payment triggers USDC release from escrow.
                  </span>
                </div>

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleCreate}
                  disabled={!isConnected || !parsedAmount || !!validationError || isBusy}
                >
                  {!isConnected
                    ? "Connect wallet"
                    : isBusy
                      ? <><Loader2 className="size-4 animate-spin" /> Confirming...</>
                      : needsApproval
                        ? "Approve USDC"
                        : "Create deposit"}
                  {!isBusy && isConnected && parsedAmount > 0n && !validationError && (
                    <ChevronRight className="size-4 ml-1" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing deposits */}
        {myDeposits.length > 0 ? (
          <div className="pb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 animate-fade-up">
              Your deposits
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myDeposits.map((deposit, i) => (
                <div
                  key={deposit.id}
                  className={`animate-fade-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <MyDepositCard deposit={deposit} onRefetch={refetchAll} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          !showCreate && (
            <div className="pb-12 space-y-8">
              <Card className="animate-fade-up stagger-2">
                <CardContent className="py-16 text-center">
                  <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                    <Wallet className="size-7 text-amber-600" />
                  </div>
                  <h2 className="font-display text-2xl mb-2">
                    Start earning while you sell
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Deposit USDC into the escrow to start providing liquidity.
                    Your capital earns yield in the savings vault while
                    waiting for buyers to match.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="size-4" />
                    Create your first deposit
                  </Button>
                </CardContent>
              </Card>

              {/* How selling works */}
              <div className="animate-fade-up stagger-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  How selling works
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { step: "01", title: "Deposit USDC", desc: "Create a deposit into the yield-bearing escrow. Your USDC earns ~4% APY while waiting.", icon: Plus, color: "bg-amber-50 text-amber-600" },
                    { step: "02", title: "Get matched", desc: "Buyers browse your offer and signal intent to purchase. You receive fiat via GCash, GrabPay, or other local apps.", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
                    { step: "03", title: "Confirm & release", desc: "Verify the fiat payment was received. USDC is released from escrow to the buyer.", icon: LogOut, color: "bg-blue-50 text-blue-600" },
                  ].map((item) => (
                    <Card key={item.step} className="card-hover">
                      <CardContent className="pt-6">
                        <div className={`p-2.5 rounded-xl w-fit mb-3 ${item.color}`}>
                          <item.icon className="size-4" />
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{item.step}</p>
                        <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
