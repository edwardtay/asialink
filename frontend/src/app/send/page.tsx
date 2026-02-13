"use client";

import { useState, useEffect } from "react";
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
import { useContractRead, useContractWrite } from "@/hooks/use-contract";
import {
  CONTRACTS,
  USDC_ABI,
  formatUSDC,
  parseUSDC,
} from "@/config/contracts";
import {
  Send,
  ChevronRight,
  AlertCircle,
  Loader2,
  Info,
  Clock,
  User,
  Trash2,
} from "lucide-react";
import { type Address, isAddress } from "viem";

type Recipient = {
  address: string;
  label: string;
  lastUsed: number;
};

const STORAGE_KEY = "asialink-recipients";

function loadRecipients(): Recipient[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecipient(address: string, label: string) {
  const recipients = loadRecipients().filter(
    (r) => r.address.toLowerCase() !== address.toLowerCase()
  );
  recipients.unshift({ address, label, lastUsed: Date.now() });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(recipients.slice(0, 10))
  );
}

function removeRecipient(address: string) {
  const recipients = loadRecipients().filter(
    (r) => r.address.toLowerCase() !== address.toLowerCase()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipients));
}

export default function SendPage() {
  const { address, isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    setRecipients(loadRecipients());
  }, []);

  const { data: usdcBalance, refetch: refetchBalance } =
    useContractRead<bigint>({
      address: CONTRACTS.usdc,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address],
      enabled: !!address,
    });

  const {
    write: transfer,
    isPrompting,
    isConfirming,
  } = useContractWrite({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "transfer",
    onSuccess: () => {
      saveRecipient(recipient, recipientLabel || recipient.slice(0, 8));
      setRecipients(loadRecipients());
      setShowSuccess(true);
    },
  });

  const maxBalance = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
  const parsedAmount = parseUSDC(amount);
  const isBusy = isPrompting || isConfirming;

  const validateAmount = (val: string): string => {
    if (!val) return "";
    const parsed = parseFloat(val);
    if (parsed <= 0) return "Amount must be greater than zero";
    if (parsed > maxBalance)
      return `Insufficient balance (${maxBalance.toFixed(2)} USDC)`;
    return "";
  };

  const validateAddress = (val: string): string => {
    if (!val) return "";
    if (!isAddress(val)) return "Invalid wallet address";
    if (address && val.toLowerCase() === address.toLowerCase())
      return "Cannot send to yourself";
    return "";
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setValidationError(validateAmount(val));
  };

  const handleRecipientChange = (val: string) => {
    setRecipient(val);
    setAddressError(validateAddress(val));
  };

  const handleSelectRecipient = (r: Recipient) => {
    setRecipient(r.address);
    setRecipientLabel(r.label);
    setAddressError("");
  };

  const handleRemoveRecipient = (addr: string) => {
    removeRecipient(addr);
    setRecipients(loadRecipients());
  };

  const handleSend = () => {
    if (!parsedAmount || !address) return;
    const amtErr = validateAmount(amount);
    const addrErr = validateAddress(recipient);
    if (amtErr) {
      setValidationError(amtErr);
      return;
    }
    if (addrErr) {
      setAddressError(addrErr);
      return;
    }
    transfer({ args: [recipient as Address, parsedAmount] });
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 flex items-center">
          <TransactionSuccess
            title="Money sent"
            description={`${amount} USDC sent to ${recipientLabel || recipient.slice(0, 6) + "..." + recipient.slice(-4)}. They can withdraw to local currency anytime.`}
            nextStep={{
              label: "Save your remaining USDC",
              href: "/earn",
              description:
                "Deposit into the savings vault to earn ~4% APY while you wait",
            }}
            onDismiss={() => {
              setShowSuccess(false);
              setAmount("");
              setRecipient("");
              setRecipientLabel("");
              refetchBalance();
            }}
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
          <p className="text-sm text-muted-foreground mb-1">Remittance</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Send money home
          </h1>
          <p className="text-muted-foreground mt-1 max-w-lg">
            Transfer USDC to anyone on Etherlink. Near-zero fees, instant
            settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-12">
          {/* Left column: recent recipients + cost comparison */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cost comparison */}
            <Card className="animate-fade-up stagger-1 overflow-hidden">
              <div className="h-1 bg-success" />
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  You save on every transfer
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Traditional</p>
                      <p className="text-xs text-muted-foreground">
                        Banks, Western Union
                      </p>
                    </div>
                    <p className="text-lg font-display text-muted-foreground line-through">
                      $8–15
                    </p>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">AsiaLink</p>
                      <p className="text-xs text-muted-foreground">
                        On Etherlink
                      </p>
                    </div>
                    <p className="text-lg font-display text-success">
                      {"<"}$0.01
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent recipients */}
            {recipients.length > 0 && (
              <Card className="animate-fade-up stagger-2">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Recent recipients
                  </p>
                  <div className="space-y-1">
                    {recipients.slice(0, 5).map((r) => (
                      <div
                        key={r.address}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                      >
                        <button
                          onClick={() => handleSelectRecipient(r)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {r.label}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {r.address.slice(0, 6)}...{r.address.slice(-4)}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleRemoveRecipient(r.address)}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* How it works */}
            <Card className="animate-fade-up stagger-3">
              <CardContent className="pt-6 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  How it works
                </p>
                {[
                  {
                    step: "01",
                    text: "Enter recipient wallet and amount",
                  },
                  {
                    step: "02",
                    text: "USDC transfers instantly on Etherlink",
                  },
                  {
                    step: "03",
                    text: "Recipient withdraws to local currency via P2P",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">
                      {item.step}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Send form */}
          <div className="lg:col-span-3">
            <Card className="animate-fade-up stagger-2">
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  Transfer USDC
                </CardTitle>
                <CardDescription>
                  Send stablecoins directly to any Etherlink wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {/* Recipient */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Recipient address
                    </label>
                    <Input
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => handleRecipientChange(e.target.value)}
                      className={`h-12 font-mono text-sm ${addressError ? "border-destructive" : ""}`}
                    />
                    {addressError && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        {addressError}
                      </p>
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Name{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </label>
                    <Input
                      placeholder="e.g. Mom, Lola, Family"
                      value={recipientLabel}
                      onChange={(e) => setRecipientLabel(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Amount</label>
                      <button
                        onClick={() =>
                          handleAmountChange(maxBalance.toFixed(2))
                        }
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Balance: {maxBalance.toFixed(2)} USDC
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
                        className={`h-14 text-xl font-display pr-20 ${validationError ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-blue-600">
                            $
                          </span>
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
                      {[25, 50, 100, 200].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleAmountChange(String(val))}
                          className="flex-1 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/60 hover:bg-secondary rounded-md transition-colors"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  {parsedAmount > 0n &&
                    !validationError &&
                    recipient &&
                    !addressError && (
                      <div className="rounded-xl bg-secondary/40 border border-border/60 p-4 space-y-2 animate-scale-in">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Sending
                          </span>
                          <span className="font-medium">{amount} USDC</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">To</span>
                          <span className="font-mono text-xs">
                            {recipient.slice(0, 6)}...{recipient.slice(-4)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Network fee
                          </span>
                          <span className="text-success font-medium">
                            {"<"}$0.01
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Arrives in
                          </span>
                          <span className="font-medium flex items-center gap-1">
                            <Clock className="size-3" />
                            ~500ms
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Send button */}
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleSend}
                    disabled={
                      !isConnected ||
                      !parsedAmount ||
                      !recipient ||
                      !!validationError ||
                      !!addressError ||
                      isBusy
                    }
                  >
                    {!isConnected ? (
                      "Connect wallet"
                    ) : isBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Send USDC
                        <ChevronRight className="size-4 ml-1" />
                      </>
                    )}
                  </Button>

                  {/* Info */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      Transfers settle in under a second on Etherlink with
                      near-zero gas fees. Your recipient can convert USDC to
                      local currency via the Receive tab.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
