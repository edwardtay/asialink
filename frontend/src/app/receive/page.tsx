"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TransactionSuccess } from "@/components/transaction-success";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  USDC_ABI,
  formatUSDC,
  parseUSDC,
} from "@/config/contracts";
import { useBestUsdcYield } from "@/hooks/use-best-yield";
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
  Plus,
  TrendingUp,
  Pause,
  Play,
  LogOut,
  Wallet,
  X,
  Download,
  Banknote,
} from "lucide-react";
import { type Address, toHex } from "viem";

// ───── Shared types ─────

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
  GCash: "G", GrabPay: "G", PromptPay: "P", Dana: "D",
  OVO: "O", PayNow: "P", Venmo: "V", Revolut: "R", Wise: "W", PayPal: "P",
};

const SEED_DEPOSITS: Deposit[] = [
  { id: 1, depositor: "0x7a2F8C9d3B45e6fA1D0c8E7b2A94F3d5E6c1B890" as Address, amount: 5000000000n, sharesInVault: 5000000000n, payeeDetails: toHex("+63 917 XXX XXXX", { size: 32 }), paymentMethod: toHex("GCash", { size: 32 }), acceptingIntents: true },
  { id: 2, depositor: "0x3E1a9C5f7D2b8E4c6A0F1d3B5e7C9a2D4f6E8b01" as Address, amount: 3000000000n, sharesInVault: 3000000000n, payeeDetails: toHex("+65 8XXX XXXX", { size: 32 }), paymentMethod: toHex("GrabPay", { size: 32 }), acceptingIntents: true },
  { id: 3, depositor: "0x9B4d2F6a8C1e3A5D7b0E2c4F6a8D0B3e5C7a9F12" as Address, amount: 2500000000n, sharesInVault: 2500000000n, payeeDetails: toHex("+66 8X XXX XXXX", { size: 32 }), paymentMethod: toHex("PromptPay", { size: 32 }), acceptingIntents: true },
  { id: 4, depositor: "0x5C8e1A3d7B9f2E4a6D0c8F1b3A5e7C9D2f4B6a83" as Address, amount: 1500000000n, sharesInVault: 1500000000n, payeeDetails: toHex("+62 812 XXXX XXXX", { size: 32 }), paymentMethod: toHex("Dana", { size: 32 }), acceptingIntents: true },
  { id: 5, depositor: "0x2D7f4B6a8E1c3A5e9C0d2F4b6A8D0e3C5f7B9a24" as Address, amount: 8000000000n, sharesInVault: 8000000000n, payeeDetails: toHex("+65 9XXX XXXX", { size: 32 }), paymentMethod: toHex("PayNow", { size: 32 }), acceptingIntents: true },
];

// ───── Buy tab components ─────

function OfferCard({ deposit, onBuy }: { deposit: Deposit; onBuy: (d: Deposit) => void }) {
  const { data: currentValue } = useContractRead<bigint>({
    address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "getDepositValue", args: [BigInt(deposit.id)],
  });
  const paymentMethod = decodeBytes32(deposit.paymentMethod);
  const payeeDetails = decodeBytes32(deposit.payeeDetails);
  const icon = PAYMENT_ICONS[paymentMethod] || "$";

  return (
    <Card className="card-hover group overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-display text-3xl tracking-tight">${formatUSDC(currentValue ?? deposit.amount)}</p>
            <p className="text-sm text-muted-foreground mt-0.5">USDC available</p>
          </div>
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">{icon}</div>
        </div>
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center gap-2.5 text-sm">
            <User className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Seller</span>
            <span className="font-mono text-xs ml-auto">{deposit.depositor.slice(0, 6)}...{deposit.depositor.slice(-4)}</span>
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
        <Button className="w-full group-hover:bg-primary" variant="outline" onClick={() => onBuy(deposit)} disabled={!deposit.acceptingIntents}>
          {deposit.acceptingIntents ? (<>Buy USDC <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" /></>) : "Not accepting orders"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DepositLoader({ id, onLoaded }: { id: number; onLoaded: (id: number, deposit: Deposit | null) => void }) {
  const { data } = useContractRead<[Address, bigint, bigint, `0x${string}`, `0x${string}`, boolean]>({
    address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "deposits", args: [BigInt(id)],
  });
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  useEffect(() => {
    if (!data) { onLoadedRef.current(id, null); return; }
    const deposit: Deposit = { id, depositor: data[0], amount: data[1], sharesInVault: data[2], payeeDetails: data[3], paymentMethod: data[4], acceptingIntents: data[5] };
    const isValid = deposit.acceptingIntents && deposit.depositor !== "0x0000000000000000000000000000000000000000";
    onLoadedRef.current(id, isValid ? deposit : null);
  }, [id, data]);
  return null;
}

// ───── Cash Out tab components ─────

function MyDepositCard({ deposit, onRefetch }: { deposit: Deposit; onRefetch: () => void }) {
  const { data: currentValue } = useContractRead<bigint>({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "getDepositValue", args: [BigInt(deposit.id)] });
  const { data: yieldEarned } = useContractRead<bigint>({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "getDepositYield", args: [BigInt(deposit.id)] });
  const { write: toggleAccepting, isPrompting: isToggling } = useContractWrite({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "setAcceptingIntents", onSuccess: onRefetch });
  const { write: withdrawDeposit, isPrompting: isWithdrawing } = useContractWrite({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "withdrawDeposit", onSuccess: onRefetch });
  const paymentMethod = decodeBytes32(deposit.paymentMethod);

  return (
    <Card className="card-hover overflow-hidden">
      {deposit.acceptingIntents && <div className="h-0.5 yield-bar" />}
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-mono">#{deposit.id}</p>
            <p className="font-display text-3xl tracking-tight mt-0.5">${formatUSDC(currentValue ?? deposit.amount)}</p>
          </div>
          <Badge variant={deposit.acceptingIntents ? "secondary" : "outline"} className={deposit.acceptingIntents ? "bg-success/10 text-success border-success/20" : ""}>{deposit.acceptingIntents ? "Active" : "Paused"}</Badge>
        </div>
        {yieldEarned !== undefined && yieldEarned > 0n && (
          <div className="flex items-center gap-1.5 text-sm mb-4 bg-success/5 text-success px-3 py-1.5 rounded-lg w-fit">
            <TrendingUp className="size-3.5" /><span className="font-medium">+${formatUSDC(yieldEarned)} earned</span>
          </div>
        )}
        <div className="space-y-2 text-sm mb-5">
          {paymentMethod && (<div className="flex items-center justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{paymentMethod}</span></div>)}
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{deposit.acceptingIntents ? "Accepting buyers" : "Not accepting"}</span></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleAccepting({ args: [BigInt(deposit.id), !deposit.acceptingIntents] })} disabled={isToggling}>
            {deposit.acceptingIntents ? (<><Pause className="size-3.5" /> Pause</>) : (<><Play className="size-3.5" /> Resume</>)}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => withdrawDeposit({ args: [BigInt(deposit.id)] })} disabled={isWithdrawing}>
            <LogOut className="size-3.5" /> Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SellDepositLoader({ id, onLoaded }: { id: number; onLoaded: (id: number, deposit: Deposit | null) => void }) {
  const { data } = useContractRead<[Address, bigint, bigint, `0x${string}`, `0x${string}`, boolean]>({
    address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "deposits", args: [BigInt(id)],
  });
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  useEffect(() => {
    if (!data) { onLoadedRef.current(id, null); return; }
    onLoadedRef.current(id, { id, depositor: data[0], amount: data[1], sharesInVault: data[2], payeeDetails: data[3], paymentMethod: data[4], acceptingIntents: data[5] });
  }, [id, data]);
  return null;
}

// ───── Main page ─────

export default function ReceivePageWrapper() {
  return (
    <Suspense>
      <ReceivePage />
    </Suspense>
  );
}

function ReceivePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "cashout" ? "cashout" : "buy";
  const { address, isConnected } = useAccount();
  const { bestApy, apyDisplay } = useBestUsdcYield();

  // ── Buy state ──
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [showBuySuccess, setShowBuySuccess] = useState(false);
  const [buyValidationError, setBuyValidationError] = useState("");

  const { data: depositCounter } = useContractRead<bigint>({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "depositCounter", args: [] });
  const depositCount = Number(depositCounter ?? 0n);
  const buyDepositIds = Array.from({ length: Math.min(depositCount, 20) }, (_, i) => depositCount - i).filter((id) => id > 0);
  const buyDepositsMapRef = useRef<Map<number, Deposit | null>>(new Map());
  const [onChainDeposits, setOnChainDeposits] = useState<Deposit[]>([]);
  const handleBuyDepositLoaded = useCallback((id: number, deposit: Deposit | null) => {
    buyDepositsMapRef.current.set(id, deposit);
    setOnChainDeposits(Array.from(buyDepositsMapRef.current.values()).filter((d): d is Deposit => d !== null));
  }, []);
  const activeDeposits = onChainDeposits.length > 0 ? onChainDeposits : SEED_DEPOSITS;

  const { write: signalIntent, isPrompting: isBuyPrompting, isConfirming: isBuyConfirming } = useContractWrite({
    address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "signalIntent",
    onSuccess: () => { setSelectedDeposit(null); setBuyAmount(""); setFiatAmount(""); setShowBuySuccess(true); },
  });

  const validateBuyAmount = (usdcVal: string, deposit: Deposit | null): string => {
    if (!usdcVal || !deposit) return "";
    const parsed = parseFloat(usdcVal);
    if (parsed <= 0) return "Amount must be greater than zero";
    const maxAvailable = Number(deposit.amount) / 1e6;
    if (parsed > maxAvailable) return `Max available: ${maxAvailable.toFixed(2)} USDC`;
    return "";
  };

  const handleBuyAmountChange = (val: string) => { setBuyAmount(val); setFiatAmount(val); setBuyValidationError(validateBuyAmount(val, selectedDeposit)); };
  const handleSignalIntent = () => {
    if (!selectedDeposit || !address) return;
    const err = validateBuyAmount(buyAmount, selectedDeposit);
    if (err) { setBuyValidationError(err); return; }
    signalIntent({ args: [BigInt(selectedDeposit.id), parseUSDC(buyAmount), address, parseUSDC(fiatAmount), toHex("USD", { size: 32 })] });
  };
  const isBuyBusy = isBuyPrompting || isBuyConfirming;

  // ── Cash Out state ──
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [payeeDetails, setPayeeDetails] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showSellSuccess, setShowSellSuccess] = useState(false);
  const [sellValidationError, setSellValidationError] = useState("");
  const apyRate = bestApy !== null ? bestApy / 100 : 0.03;

  const { data: accountDeposits, refetch: refetchDeposits } = useContractRead<bigint[]>({ address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "getAccountDeposits", args: [address], enabled: !!address });
  const { data: usdcBalance, refetch: refetchUsdc } = useContractRead<bigint>({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "balanceOf", args: [address], enabled: !!address });
  const { data: allowance, refetch: refetchAllowance } = useContractRead<bigint>({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "allowance", args: [address, CONTRACTS.escrow], enabled: !!address });

  const refetchAll = useCallback(() => { refetchDeposits(); refetchUsdc(); refetchAllowance(); }, [refetchDeposits, refetchUsdc, refetchAllowance]);
  const sellDepositIds = (accountDeposits ?? []).map(Number);
  const sellDepositsMapRef = useRef<Map<number, Deposit | null>>(new Map());
  const [myDeposits, setMyDeposits] = useState<Deposit[]>([]);
  const handleSellDepositLoaded = useCallback((id: number, deposit: Deposit | null) => {
    sellDepositsMapRef.current.set(id, deposit);
    setMyDeposits(Array.from(sellDepositsMapRef.current.values()).filter((d): d is Deposit => d !== null));
  }, []);

  const { write: approve, isPrompting: isApproving, isConfirming: isApproveConfirming } = useContractWrite({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "approve", onSuccess: refetchAll });
  const { write: createDeposit, isPrompting: isCreating, isConfirming: isCreateConfirming } = useContractWrite({
    address: CONTRACTS.escrow, abi: ESCROW_ABI, functionName: "createDeposit",
    onSuccess: () => { setAmount(""); setPayeeDetails(""); setShowCreate(false); setShowSellSuccess(true); refetchAll(); },
  });

  const parsedAmount = parseUSDC(amount);
  const needsApproval = (allowance ?? 0n) < parsedAmount;
  const isSellBusy = isApproving || isApproveConfirming || isCreating || isCreateConfirming;

  const validateSellAmount = (val: string): string => {
    if (!val) return "";
    const parsed = parseFloat(val);
    if (parsed <= 0) return "Amount must be greater than zero";
    const maxBalance = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
    if (parsed > maxBalance) return `Insufficient balance (${maxBalance.toFixed(2)} USDC)`;
    return "";
  };

  const handleSellAmountChange = (val: string) => { setAmount(val); setSellValidationError(validateSellAmount(val)); };
  const handleCreate = () => {
    if (!parsedAmount) return;
    const err = validateSellAmount(amount);
    if (err) { setSellValidationError(err); return; }
    if (needsApproval) { approve({ args: [CONTRACTS.escrow, parsedAmount] }); }
    else { createDeposit({ args: [parsedAmount, toHex(payeeDetails || "contact-seller", { size: 32 }), toHex(paymentMethod, { size: 32 })] }); }
  };

  // ── Success screens ──
  if (showBuySuccess) {
    return (
      <div className="flex flex-col min-h-screen"><Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess title="Intent submitted" description="Your buy order is confirmed on-chain. Send fiat to the seller within 24 hours to complete the trade."
            nextStep={{ label: "Deposit into savings vault", href: "/earn", description: `Once you receive USDC, deposit it to start earning ${apyDisplay} APY` }}
            onDismiss={() => setShowBuySuccess(false)} />
        </main>
      </div>
    );
  }
  if (showSellSuccess) {
    return (
      <div className="flex flex-col min-h-screen"><Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess title="Deposit created" description="Your USDC is now in the escrow vault, earning yield while waiting for buyers to match."
            nextStep={{ label: "View your savings", href: "/", description: "Track your yield earnings from the dashboard" }}
            onDismiss={() => setShowSellSuccess(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      {/* Hidden loaders */}
      {buyDepositIds.map((id) => (<DepositLoader key={`buy-${id}`} id={id} onLoaded={handleBuyDepositLoaded} />))}
      {sellDepositIds.map((id) => (<SellDepositLoader key={`sell-${id}`} id={id} onLoaded={handleSellDepositLoaded} />))}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6">
        <div className="pt-10 pb-6 animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">Receive</h1>
          <p className="text-muted-foreground mt-1">Buy USDC with local payments or provide liquidity to cash out</p>
        </div>

        <Tabs defaultValue={initialTab} className="animate-fade-up stagger-1">
          <TabsList className="w-full sm:w-auto mb-6">
            <TabsTrigger value="buy" className="flex-1 sm:flex-initial gap-1.5">
              <Download className="size-3.5" /> Buy USDC
            </TabsTrigger>
            <TabsTrigger value="cashout" className="flex-1 sm:flex-initial gap-1.5">
              <Banknote className="size-3.5" /> Cash Out
            </TabsTrigger>
          </TabsList>

          {/* ── Buy USDC tab ── */}
          <TabsContent value="buy">
            {activeDeposits.length === 0 ? (
              <div className="pb-12 space-y-8">
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5"><Clock className="size-7 text-blue-600" /></div>
                    <h2 className="font-display text-2xl mb-2">No offers yet</h2>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">Liquidity providers are setting up. Check back shortly for available USDC offers.</p>
                  </CardContent>
                </Card>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">How buying works</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { step: "01", title: "Choose an offer", desc: "Browse available USDC offers from liquidity providers.", icon: CreditCard },
                      { step: "02", title: "Pay with local app", desc: "Signal your intent and pay via GCash, GrabPay, or PromptPay within 24 hours.", icon: ArrowRight },
                      { step: "03", title: "Receive USDC", desc: "Once payment is verified, USDC is released from escrow to your wallet.", icon: Shield },
                    ].map((item) => (
                      <Card key={item.step} className="card-hover"><CardContent className="pt-6">
                        <div className="p-2.5 rounded-xl bg-blue-50 w-fit mb-3"><item.icon className="size-4 text-blue-600" /></div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{item.step}</p>
                        <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent></Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">{activeDeposits.length} offer{activeDeposits.length > 1 ? "s" : ""} available</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                  {activeDeposits.map((deposit) => (
                    <OfferCard key={deposit.id} deposit={deposit} onBuy={setSelectedDeposit} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Cash Out tab ── */}
          <TabsContent value="cashout">
            <div className="flex items-end justify-between mb-6">
              <p className="text-sm text-muted-foreground">Provide USDC liquidity and earn yield while waiting for buyers</p>
              <Button onClick={() => setShowCreate(!showCreate)} className="hidden sm:flex" size="sm">
                {showCreate ? (<><X className="size-4" /> Cancel</>) : (<><Plus className="size-4" /> New deposit</>)}
              </Button>
            </div>
            <div className="sm:hidden mb-6">
              <Button onClick={() => setShowCreate(!showCreate)} className="w-full">
                {showCreate ? (<><X className="size-4" /> Cancel</>) : (<><Plus className="size-4" /> New deposit</>)}
              </Button>
            </div>

            {showCreate && (
              <Card className="mb-8 animate-scale-in overflow-hidden">
                <div className="h-0.5 bg-foreground" />
                <CardHeader><CardTitle className="font-display text-xl">Create a deposit</CardTitle><CardDescription>Your USDC goes into the yield vault and earns while waiting for buyers.</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">USDC amount</label>
                        <button onClick={() => handleSellAmountChange(usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "0")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Balance: {formatUSDC(usdcBalance)} USDC</button>
                      </div>
                      <div className="relative">
                        <Input type="number" placeholder="0.00" value={amount} onChange={(e) => handleSellAmountChange(e.target.value)} min="0" step="0.01" className={`h-14 text-xl font-display pr-16 ${sellValidationError ? "border-destructive" : ""}`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
                      </div>
                      {sellValidationError && (<p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="size-3" />{sellValidationError}</p>)}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Accepted payment method</label>
                      <div className="flex flex-wrap gap-2">
                        {["GCash", "GrabPay", "PromptPay", "Dana", "OVO", "PayNow", "Wise", "Revolut"].map((method) => (
                          <button key={method} onClick={() => setPaymentMethod(method)} className={`px-4 py-2.5 text-sm rounded-xl border-2 transition-all ${paymentMethod === method ? "border-foreground bg-foreground text-background font-medium" : "border-border text-muted-foreground hover:text-foreground hover:border-ring"}`}>{method}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Your {paymentMethod} handle</label>
                      <Input placeholder={`@your-${paymentMethod.toLowerCase()}-handle`} value={payeeDetails} onChange={(e) => setPayeeDetails(e.target.value)} className="h-12" />
                    </div>
                    {parsedAmount > 0n && !sellValidationError && (
                      <div className="rounded-xl bg-success/5 border border-success/10 p-4 space-y-2 animate-scale-in">
                        <div className="flex items-center gap-2 text-sm text-success font-medium"><TrendingUp className="size-4" />While you wait, you earn</div>
                        <p className="text-2xl font-display text-success">~${(parseFloat(amount || "0") * apyRate).toFixed(2)}<span className="text-sm text-success/70 ml-1">/year ({apyDisplay} APY)</span></p>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="size-3.5 mt-0.5 shrink-0" /><span>Your USDC is deposited into the ERC-4626 yield vault. When a buyer matches, verified fiat payment triggers USDC release from escrow.</span></div>
                    <Button className="w-full h-12 text-base" onClick={handleCreate} disabled={!isConnected || !parsedAmount || !!sellValidationError || isSellBusy}>
                      {!isConnected ? "Connect wallet" : isSellBusy ? <><Loader2 className="size-4 animate-spin" /> Confirming...</> : needsApproval ? "Approve USDC" : "Create deposit"}
                      {!isSellBusy && isConnected && parsedAmount > 0n && !sellValidationError && <ChevronRight className="size-4 ml-1" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {myDeposits.length > 0 ? (
              <div className="pb-12">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Your deposits</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myDeposits.map((deposit) => (<MyDepositCard key={deposit.id} deposit={deposit} onRefetch={refetchAll} />))}
                </div>
              </div>
            ) : !showCreate && (
              <div className="pb-12 space-y-8">
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5"><Wallet className="size-7 text-amber-600" /></div>
                    <h2 className="font-display text-2xl mb-2">Start earning while you sell</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">Deposit USDC into the escrow to start providing liquidity. Your capital earns yield while waiting for buyers.</p>
                    <Button className="mt-6" onClick={() => setShowCreate(true)}><Plus className="size-4" />Create your first deposit</Button>
                  </CardContent>
                </Card>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">How selling works</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { step: "01", title: "Deposit USDC", desc: `Create a deposit into the yield-bearing escrow. Your USDC earns ${apyDisplay} APY while waiting.`, icon: Plus, color: "bg-amber-50 text-amber-600" },
                      { step: "02", title: "Get matched", desc: "Buyers browse your offer and signal intent to purchase. You receive fiat via GCash, GrabPay, or other local apps.", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
                      { step: "03", title: "Confirm & release", desc: "Verify the fiat payment was received. USDC is released from escrow to the buyer.", icon: LogOut, color: "bg-blue-50 text-blue-600" },
                    ].map((item) => (
                      <Card key={item.step} className="card-hover"><CardContent className="pt-6">
                        <div className={`p-2.5 rounded-xl w-fit mb-3 ${item.color}`}><item.icon className="size-4" /></div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{item.step}</p>
                        <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent></Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Buy dialog */}
      <Dialog open={!!selectedDeposit} onOpenChange={(open) => { if (!open) { setSelectedDeposit(null); setBuyAmount(""); setFiatAmount(""); setBuyValidationError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Buy USDC</DialogTitle>
            <DialogDescription>Signal your intent to buy. Once you send fiat and payment is verified, USDC is released to your wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isConnected && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm"><p className="font-medium text-amber-900">Wallet not connected</p><p className="text-amber-700 mt-0.5">Connect your wallet first to signal an intent to buy.</p></div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">USDC amount</label>
              <div className="relative">
                <Input type="number" placeholder="0.00" value={buyAmount} onChange={(e) => handleBuyAmountChange(e.target.value)} min="0" step="0.01" className={`h-12 text-lg font-display pr-16 ${buyValidationError ? "border-destructive" : ""}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
              </div>
              {buyValidationError && (<p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="size-3" />{buyValidationError}</p>)}
              {selectedDeposit && !buyValidationError && (
                <button onClick={() => handleBuyAmountChange((Number(selectedDeposit.amount) / 1e6).toFixed(2))} className="text-xs text-muted-foreground hover:text-foreground mt-1.5 transition-colors">Max: {(Number(selectedDeposit.amount) / 1e6).toFixed(2)} USDC</button>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fiat amount (USD)</label>
              <div className="relative">
                <Input type="number" placeholder="0.00" value={fiatAmount} onChange={(e) => setFiatAmount(e.target.value)} min="0" step="0.01" className="h-12 text-lg font-display pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USD</span>
              </div>
            </div>
            {selectedDeposit && (
              <div className="rounded-xl bg-secondary/40 border border-border/60 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-mono text-xs">{selectedDeposit.depositor.slice(0, 6)}...{selectedDeposit.depositor.slice(-4)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{decodeBytes32(selectedDeposit.paymentMethod) || "Fiat"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-medium">${formatUSDC(selectedDeposit.amount)}</span></div>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="size-3.5 mt-0.5 shrink-0" /><span>After signaling intent, you have 24 hours to send fiat. The seller verifies payment and USDC is released from escrow.</span></div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-base" onClick={handleSignalIntent} disabled={!isConnected || !buyAmount || !fiatAmount || !!buyValidationError || isBuyBusy}>
              {isBuyBusy ? (<><Loader2 className="size-4 animate-spin" />Confirming...</>) : !isConnected ? "Connect wallet first" : (<>Signal intent to buy<ChevronRight className="size-4 ml-1" /></>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
