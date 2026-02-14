"use client";

import { useState, useEffect, type ReactNode } from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

const emotionCache = createCache({ key: "lifi", prepend: true });

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LiFiWidgetWrapper({ children, fallback }: Props) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
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

  return (
    <CacheProvider value={emotionCache}>
      {children}
    </CacheProvider>
  );
}
