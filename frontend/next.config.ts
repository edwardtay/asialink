import type { NextConfig } from "next";

const stub = "./src/stubs/mysten-sui.ts";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      // Stub out Sui/wallet modules that @lifi/widget imports internally.
      // We only use EVM chains (Etherlink), so these are never called at runtime.
      "@mysten/sui/client": stub,
      "@mysten/sui/jsonRpc": stub,
      "@mysten/sui/transactions": stub,
      "@mysten/sui/utils": stub,
      "@mysten/dapp-kit": stub,
      "@mysten/wallet-standard": stub,
    },
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
