# AsiaLink

**Send money home for less. Save in USD.** Asia's remittance and DeFi savings app built on Etherlink.

**Live demo:** [asialink-hq.vercel.app](https://asialink-hq.vercel.app)

## The Problem

300 million migrant workers across Asia-Pacific send $300B+ home annually. They pay **5-10% in fees** through services like Western Union, Wise, and local money transfer operators. A Filipino worker in Singapore sending $500 home loses $25-50 per transaction — that's $300-600/year their families desperately need.

Meanwhile, their savings sit in local bank accounts earning 0.1-1% APY, steadily losing value against the dollar.

## The Solution

AsiaLink combines **near-zero fee remittances** ($0.01 per transfer) with **USD savings via an ERC-4626 vault**, all accessible through familiar payment methods like GCash, GrabPay, PromptPay, and PayNow.

### How it works

1. **Send** — Transfer USDC to family for $0.01 (vs $8-15 traditional). Sub-500ms finality on Etherlink.
2. **Buy** — Receive USDC through P2P on-ramp. Pay with GCash, GrabPay, PromptPay, Dana, or PayNow.
3. **Earn** — Deposit USDC into our ERC-4626 vault. Yield strategies pluggable (currently testnet with simulated yield).
4. **Sell** — Cash out USDC to local currency through P2P off-ramp. Liquidity providers earn yield while waiting.

### What makes it different

**YieldEscrow** — Our novel P2P escrow contract routes idle USDC into yield vaults while waiting for payment matches. Traditional escrow locks funds doing nothing; ours earns yield for both parties. When a buyer deposits USDC to sell, it immediately starts earning in our vault. When a seller confirms payment, the yield is split between maker and protocol.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                 │
├──────────┬───────────┬──────────┬───────────┬────────┤
│  Send    │  Buy/Sell │   Earn   │   Swap    │ Bridge │
│  (USDC   │  (P2P     │ (ERC-4626│ (LI.FI    │ (LI.FI │
│  transfer│  Escrow)  │  Vault)  │  Widget)  │ Widget)│
├──────────┴───────────┴──────────┴───────────┴────────┤
│              Smart Contracts (Etherlink)              │
├──────────────────┬───────────────────────────────────┤
│   YieldEscrow    │      StableNestVault (eUSDC)      │
│   - P2P orders   │      - Multi-strategy yield       │
│   - Yield routing│      - ERC-4626 standard          │
│   - Payment      │      - Pluggable strategies        │
│     verification │      - Auto-compound               │
└──────────────────┴───────────────────────────────────┘
```

### Pages

| Page | Function | Status |
|------|----------|--------|
| `/` | Homepage with cost comparison, corridors, dashboard | Live |
| `/send` | Send USDC to family (direct transfer) | Live |
| `/buy` | Buy USDC via P2P (pay with local payment apps) | Live |
| `/earn` | Save in USD (ERC-4626 vault) | Live |
| `/swap` | Token swap (LI.FI aggregated DEX liquidity) | Live |
| `/bridge` | Cross-chain bridge (LI.FI multi-chain routes) | Live |
| `/lend` | Lending markets (live DeFiLlama yield data) | Live |
| `/sell` | Cash out USDC to local currency via P2P | Live |

### Smart Contracts

| Contract | Source | Purpose |
|----------|--------|---------|
| YieldEscrow | [`src/core/YieldEscrow.sol`](contracts/src/core/YieldEscrow.sol) | P2P escrow with yield routing (the novel piece) |
| StableNestVault | [`src/vault/StableNestVault.sol`](contracts/src/vault/StableNestVault.sol) | ERC-4626 multi-strategy yield aggregator |
| BaseStrategy | [`src/vault/strategies/BaseStrategy.sol`](contracts/src/vault/strategies/BaseStrategy.sol) | Pluggable strategy adapter |
| MockVerifier | [`src/verifier/MockVerifier.sol`](contracts/src/verifier/MockVerifier.sol) | Payment verification (mock for testnet, Reclaim Protocol for production) |

**Tests:** 9/9 passing (`forge test -v`)

## Etherlink Integration

AsiaLink is built natively on Etherlink, leveraging its unique properties for remittance:

- **Sub-500ms finality** — Transfers confirm before the user blinks. Critical for payments.
- **Near-zero gas fees** — $0.01 per transaction makes micro-remittances viable ($10-50 sends).
- **EVM compatible** — Standard Solidity contracts, familiar tooling, massive DeFi ecosystem.
- **Tezos L1 security** — Bridge and consensus secured by Tezos proof-of-stake.

### DeFi Ecosystem Integration

- **Swap**: Aggregated liquidity via LI.FI across Etherlink DEXs (Curve, IguanaDEX, Hanji)
- **Bridge**: Cross-chain transfers from Ethereum, Arbitrum, Base, Optimism, Polygon via LI.FI
- **Lend**: Live yield data from Superlend and Gearbox via DeFiLlama API
- **Earn**: Custom ERC-4626 vault with pluggable strategy architecture (testnet uses IdleStrategy)

## Supported Payment Methods

| Region | Methods |
|--------|---------|
| Philippines | GCash |
| Singapore | PayNow, GrabPay |
| Thailand | PromptPay |
| Indonesia | Dana, OVO, GoPay |
| Malaysia | GrabPay, Touch 'n Go |
| Cross-border | Wise, Revolut |

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin v4.9.6
- **DeFi**: LI.FI SDK (swap + bridge), DeFiLlama API (yield data), ERC-4626 (vault standard)
- **Chain**: Etherlink Mainnet (Chain ID 42793) + Shadownet Testnet (Chain ID 127823)
- **Wallet**: RainbowKit + wagmi + viem

## Getting Started

```bash
git clone https://github.com/edwardtay/asialink.git
cd asialink

# Frontend
cd frontend
cp .env.example .env.local   # edit with your WalletConnect project ID
pnpm install
pnpm dev                     # http://localhost:3000

# Contracts
cd ../contracts
forge build
forge test -v                # 9 tests pass

# Deploy to Etherlink Shadownet testnet
forge script script/Deploy.s.sol --rpc-url https://node.shadownet.etherlink.com --broadcast
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WC_PROJECT_ID` | Optional | WalletConnect project ID (falls back to `demo`) |
| `NEXT_PUBLIC_TESTNET_RPC` | Optional | Etherlink testnet RPC (defaults to Shadownet) |
| `NEXT_PUBLIC_USDC_ADDRESS` | Optional | MockUSDC contract address |
| `NEXT_PUBLIC_VAULT_ADDRESS` | Optional | StableNestVault contract address |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Optional | YieldEscrow contract address |
| `NEXT_PUBLIC_VERIFIER_ADDRESS` | Optional | MockVerifier contract address |
