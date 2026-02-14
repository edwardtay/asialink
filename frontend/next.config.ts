import type { NextConfig } from "next";
import path from "path";

const stub = "./src/stubs/mysten-sui.ts";

const nextConfig: NextConfig = {
  transpilePackages: ["@lifi/widget", "@lifi/wallet-management"],
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
    // Force all packages to use the same React instance
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
    };
    return config;
  },
};

export default nextConfig;
