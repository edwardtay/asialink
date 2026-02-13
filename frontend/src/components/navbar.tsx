"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Send", href: "/send" },
  { label: "Receive", href: "/buy" },
  { label: "Save", href: "/earn" },
  { label: "Swap", href: "/swap" },
  { label: "Bridge", href: "/bridge" },
  { label: "Lend", href: "/lend" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="size-7 rounded-lg bg-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-background">
                  <path d="M7 1L12 4.5V9.5L7 13L2 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="7" cy="7" r="2" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-display text-lg tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm rounded-md transition-all duration-200",
                    pathname === item.href
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  {pathname === item.href && (
                    <span className="absolute inset-x-1 -bottom-[17px] h-[2px] bg-foreground rounded-full" />
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
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 bg-background border-b border-border md:hidden animate-fade-in">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-4 py-3 text-sm rounded-lg transition-colors",
                  pathname === item.href
                    ? "text-foreground font-medium bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
