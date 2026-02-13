"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";

type NextStep = {
  label: string;
  href: string;
  description: string;
};

export function TransactionSuccess({
  title,
  description,
  nextStep,
  onDismiss,
}: {
  title: string;
  description: string;
  nextStep?: NextStep;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center animate-scale-in">
      <div className="size-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="size-6 text-success" />
      </div>
      <h3 className="font-display text-xl mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      <div className="flex flex-col gap-2">
        {nextStep && (
          <Link href={nextStep.href}>
            <Button className="w-full">
              {nextStep.label}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </Link>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            {nextStep ? "Stay here" : "Done"}
          </Button>
        )}
      </div>
      {nextStep && (
        <p className="text-xs text-muted-foreground mt-3">
          {nextStep.description}
        </p>
      )}
    </div>
  );
}
