import { http, createStorage, cookieStorage } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { siteConfig } from "./site";

export const etherlink = defineChain({
  id: 42793,
  name: "Etherlink",
  nativeCurrency: { name: "Tez", symbol: "XTZ", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://node.mainnet.etherlink.com"] },
  },
  blockExplorers: {
    default: {
      name: "Etherlink Explorer",
      url: "https://explorer.etherlink.com",
    },
  },
});

export const etherlinkTestnet = defineChain({
  id: 127823,
  name: "Etherlink Shadownet Testnet",
  nativeCurrency: { name: "Tez", symbol: "XTZ", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_TESTNET_RPC || "https://node.shadownet.etherlink.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherlink Shadownet Explorer",
      url: "https://shadownet.explorer.etherlink.com",
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: siteConfig.name,
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [etherlink, etherlinkTestnet],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [etherlink.id]: http(),
    [etherlinkTestnet.id]: http(),
  },
});
