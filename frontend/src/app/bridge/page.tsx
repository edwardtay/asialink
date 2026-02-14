"use client";

import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Layers, Shield, Zap } from "lucide-react";

export default function BridgePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-6">
        <div className="pt-10 pb-8 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-1">Transfer</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Bridge
          </h1>
          <p className="text-muted-foreground mt-1">
            Move assets to and from Etherlink
          </p>
        </div>

        <div className="animate-fade-up stagger-1">
          <iframe
            src="https://jumper.exchange/widget?fromChain=1&toChain=42793&theme=light"
            width="100%"
            height="680"
            className="rounded-2xl border border-border bg-card"
            style={{ border: "none" }}
            allow="clipboard-write"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 pb-12 animate-fade-up stagger-4">
          {[
            { icon: Zap, label: "Fast finality", desc: "Sub-500ms on Etherlink" },
            { icon: Shield, label: "Secure", desc: "L1-verified bridge" },
            { icon: Layers, label: "Multi-chain", desc: "5+ chains supported" },
          ].map((item) => (
            <Card key={item.label} className="card-hover">
              <CardContent className="pt-5 pb-4 text-center">
                <item.icon className="size-4 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
