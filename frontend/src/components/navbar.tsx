"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Send,
  Download,
  PiggyBank,
  ArrowLeftRight,
} from "lucide-react";

const navItems = [
  { label: "Send", href: "/send", icon: Send },
  { label: "Receive", href: "/receive", icon: Download },
  { label: "Save", href: "/earn", icon: PiggyBank },
  { label: "Trade", href: "/trade", icon: ArrowLeftRight },
];

const mobileDescriptions: Record<string, string> = {
  "/send": "Transfer USDC to family",
  "/receive": "Buy USDC or cash out",
  "/earn": "Deposit & earn yield",
  "/trade": "Swap, bridge & lend",
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt={siteConfig.name}
                width={28}
                height={28}
                className="rounded-lg group-hover:scale-105 transition-transform"
              />
              <span className="font-display text-lg tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
            <nav className="hidden md:flex items-center">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md transition-all duration-200",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                  {(pathname === item.href || pathname.startsWith(item.href + "/")) && (
                    <span className="absolute inset-x-1 -bottom-[13px] h-[2px] bg-foreground rounded-full" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            >
              {mobileOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-40 bg-background border-b border-border md:hidden animate-fade-in">
          <nav className="max-w-6xl mx-auto px-6 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  pathname === item.href
                    ? "text-foreground font-medium bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <div>
                  <p className="text-sm">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mobileDescriptions[item.href]}
                  </p>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
