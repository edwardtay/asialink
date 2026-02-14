"use client";

import { useState, useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LiFiWidgetWrapper({ children, fallback }: Props) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Delay mount to ensure all providers are fully initialized
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message?.includes("_currentValue")) {
        event.preventDefault();
        setHasError(true);
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (!mounted) {
    return (
      fallback ?? (
        <div className="h-[440px] rounded-2xl bg-card border border-border animate-pulse" />
      )
    );
  }

  if (hasError) {
    return (
      fallback ?? (
        <div className="h-[440px] rounded-2xl bg-card border border-border animate-pulse" />
      )
    );
  }

  return <>{children}</>;
}
