"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { TransactionSuccess } from "@/components/transaction-success";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useContractRead, useContractWrite } from "@/hooks/use-contract";
import {
  CONTRACTS,
  ESCROW_ABI,
  formatUSDC,
  parseUSDC,
} from "@/config/contracts";
import {
  ArrowRight,
  Clock,
  CreditCard,
  User,
  ChevronRight,
  Shield,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { type Address, toHex } from "viem";

type Deposit = {
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
    return val.slice(0, 10) + "...";
  }
}

const PAYMENT_ICONS: Record<string, string> = {
  GCash: "G",
  GrabPay: "G",
  PromptPay: "P",
  Dana: "D",
  OVO: "O",
  PayNow: "P",
  Venmo: "V",
  Revolut: "R",
  Wise: "W",
  PayPal: "P",
};

function OfferCard({
  deposit,
  onBuy,
}: {
  deposit: Deposit;
  onBuy: (d: Deposit) => void;
}) {
  const { data: currentValue } = useContractRead<bigint>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "getDepositValue",
    args: [BigInt(deposit.id)],
  });

  const paymentMethod = decodeBytes32(deposit.paymentMethod);
  const payeeDetails = decodeBytes32(deposit.payeeDetails);
  const icon = PAYMENT_ICONS[paymentMethod] || "$";

  return (
    <Card className="card-hover group overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-display text-3xl tracking-tight">
              ${formatUSDC(currentValue ?? deposit.amount)}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">USDC available</p>
          </div>
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
            {icon}
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          <div className="flex items-center gap-2.5 text-sm">
            <User className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Seller</span>
            <span className="font-mono text-xs ml-auto">
              {deposit.depositor.slice(0, 6)}...{deposit.depositor.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <CreditCard className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Pay via</span>
            <span className="ml-auto font-medium">{paymentMethod || "Fiat"}</span>
          </div>
          {payeeDetails && (
            <div className="flex items-center gap-2.5 text-sm">
              <Shield className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Send to</span>
              <span className="ml-auto font-medium">{payeeDetails}</span>
            </div>
          )}
        </div>

        <Button
          className="w-full group-hover:bg-primary"
          variant="outline"
          onClick={() => onBuy(deposit)}
          disabled={!deposit.acceptingIntents}
        >
          {deposit.acceptingIntents ? (
            <>
              Buy USDC
              <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : (
            "Not accepting orders"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function BuyPage() {
  const { address, isConnected } = useAccount();
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { data: depositCounter } = useContractRead<bigint>({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "depositCounter",
    args: [],
  });

  const depositCount = Number(depositCounter ?? 0n);
  const depositIds = Array.from(
    { length: Math.min(depositCount, 20) },
    (_, i) => depositCount - i
  ).filter((id) => id > 0);

  const deposits = depositIds.map((id) => {
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
    } as Deposit;
  });

  const activeDeposits = deposits.filter(
    (d): d is Deposit =>
      d !== null &&
      d.acceptingIntents &&
      d.depositor !== "0x0000000000000000000000000000000000000000"
  );

  const { write: signalIntent, isPrompting, isConfirming } = useContractWrite({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: "signalIntent",
    onSuccess: () => {
      setSelectedDeposit(null);
      setBuyAmount("");
      setFiatAmount("");
      setShowSuccess(true);
    },
  });

  const validateAmount = (usdcVal: string, deposit: Deposit | null): string => {
    if (!usdcVal || !deposit) return "";
    const parsed = parseFloat(usdcVal);
    if (parsed <= 0) return "Amount must be greater than zero";
    const maxAvailable = Number(deposit.amount) / 1e6;
    if (parsed > maxAvailable) return `Max available: ${maxAvailable.toFixed(2)} USDC`;
    return "";
  };

  const handleAmountChange = (val: string) => {
    setBuyAmount(val);
    setFiatAmount(val);
    setValidationError(validateAmount(val, selectedDeposit));
  };

  const handleSignalIntent = () => {
    if (!selectedDeposit || !address) return;
    const err = validateAmount(buyAmount, selectedDeposit);
    if (err) {
      setValidationError(err);
      return;
    }
    const usdcAmount = parseUSDC(buyAmount);
    const fiat = parseUSDC(fiatAmount);
    const fiatCurrency = toHex("USD", { size: 32 });
    signalIntent({
      args: [BigInt(selectedDeposit.id), usdcAmount, address, fiat, fiatCurrency],
    });
  };

  const isBusy = isPrompting || isConfirming;

  if (showSuccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess
            title="Intent submitted"
            description="Your buy order is confirmed on-chain. Send fiat to the seller within 24 hours to complete the trade."
            nextStep={{
              label: "Deposit into savings vault",
              href: "/earn",
              description: "Once you receive USDC, deposit it to start earning ~4% APY",
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
        <div className="pt-10 pb-8 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-1">On-ramp</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Receive USDC
          </h1>
          <p className="text-muted-foreground mt-1 max-w-lg">
            Convert local currency to USDC via P2P. Pay with GCash, GrabPay,
            PromptPay, or your preferred payment app.
          </p>
        </div>

        {/* Offers */}
        {activeDeposits.length === 0 ? (
          <div className="pb-12 space-y-8">
            <Card className="animate-fade-up stagger-1">
              <CardContent className="py-16 text-center">
                <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                  <Clock className="size-7 text-blue-600" />
                </div>
                <h2 className="font-display text-2xl mb-2">No offers yet</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Liquidity providers are setting up. Check back shortly for available
                  USDC offers, or provide liquidity yourself.
                </p>
              </CardContent>
            </Card>

            {/* How buying works */}
            <div className="animate-fade-up stagger-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                How buying works
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "01", title: "Choose an offer", desc: "Browse available USDC offers from liquidity providers. Filter by your preferred payment app.", icon: CreditCard },
                  { step: "02", title: "Pay with local app", desc: "Signal your intent and pay via GCash, GrabPay, PromptPay, or other supported apps within 24 hours.", icon: ArrowRight },
                  { step: "03", title: "Receive USDC", desc: "Once payment is verified, USDC is released from escrow directly to your wallet.", icon: Shield },
                ].map((item) => (
                  <Card key={item.step} className="card-hover">
                    <CardContent className="pt-6">
                      <div className="p-2.5 rounded-xl bg-blue-50 w-fit mb-3">
                        <item.icon className="size-4 text-blue-600" />
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
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 animate-fade-up stagger-1">
              <p className="text-sm text-muted-foreground">
                {activeDeposits.length} offer{activeDeposits.length > 1 ? "s" : ""} available
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
              {activeDeposits.map((deposit, i) => (
                <div
                  key={deposit.id}
                  className={`animate-fade-up stagger-${Math.min(i + 2, 8)}`}
                >
                  <OfferCard deposit={deposit} onBuy={setSelectedDeposit} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Buy dialog */}
      <Dialog
        open={!!selectedDeposit}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDeposit(null);
            setBuyAmount("");
            setFiatAmount("");
            setValidationError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Buy USDC
            </DialogTitle>
            <DialogDescription>
              Signal your intent to buy. Once you send fiat and payment is verified,
              USDC is released to your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!isConnected && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Wallet not connected</p>
                  <p className="text-amber-700 mt-0.5">
                    Connect your wallet first to signal an intent to buy.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">USDC amount</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={buyAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`h-12 text-lg font-display pr-16 ${validationError ? "border-destructive" : ""}`}
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
              {selectedDeposit && !validationError && (
                <button
                  onClick={() => handleAmountChange((Number(selectedDeposit.amount) / 1e6).toFixed(2))}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
                >
                  Max: {(Number(selectedDeposit.amount) / 1e6).toFixed(2)} USDC
                </button>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fiat amount (USD)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="h-12 text-lg font-display pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </div>

            {selectedDeposit && (
              <div className="rounded-xl bg-secondary/40 border border-border/60 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller</span>
                  <span className="font-mono text-xs">
                    {selectedDeposit.depositor.slice(0, 6)}...
                    {selectedDeposit.depositor.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-medium">
                    {decodeBytes32(selectedDeposit.paymentMethod) || "Fiat"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">${formatUSDC(selectedDeposit.amount)}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                After signaling intent, you have 24 hours to send fiat. The seller
                verifies payment and USDC is released from escrow.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full h-12 text-base"
              onClick={handleSignalIntent}
              disabled={!isConnected || !buyAmount || !fiatAmount || !!validationError || isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming...
                </>
              ) : !isConnected ? (
                "Connect wallet first"
              ) : (
                <>
                  Signal intent to buy
                  <ChevronRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
