# AsiaLink

**Send money home for less. Save in USD.** Asia's remittance and DeFi savings app on Etherlink.

[Live App](https://asialink-hq.vercel.app) &nbsp;|&nbsp; [Smart Contracts](contracts/src/)

## The Problem

300 million migrant workers across Asia-Pacific send $300B+ home annually. They pay **5-10% in fees** through Western Union, Wise, and local transfer operators. A Filipino worker in Singapore sending $500 home loses $25-50 per transaction — $300-600/year their families need.

Meanwhile, their savings sit in local bank accounts earning 0.1-1% APY, losing value against the dollar.

## How It Works

1. **Pay with local apps** — GCash, GrabPay, PromptPay, Dana, PayNow. A P2P seller matches your order and USDC is released from escrow on-chain.
2. **Save in USD** — Deposit into the ERC-4626 vault. Earn yield. No lock-ups. Withdraw anytime.
3. **Send home for $0.01** — Transfer USDC to any wallet with sub-500ms finality on Etherlink. Family cashes out locally through the same P2P marketplace.

## What Makes It Different

**YieldEscrow** — P2P escrow that routes idle USDC into a yield vault while waiting for payment matches. Traditional escrow locks funds doing nothing; ours earns yield for liquidity providers. LP deposits USDC → it enters the vault earning yield → buyer signals intent → LP confirms fiat payment → escrow releases USDC.

This turns **every pending remittance into a yield-generating position**.

## Architecture

```
User → Pay locally (GCash, GrabPay, PromptPay, Dana, PayNow)
         ↓
     YieldEscrow ←→ StableNestVault (ERC-4626)
         ↓                    ↓
   USDC released      IdleStrategy (testnet; pluggable for production strategies)
         ↓
   Send to family → Cash out locally
```

**Pages**: Send, Receive (buy + cash out tabs), Save, Trade (swap + bridge + lend tabs)
**Swap & Bridge**: LI.FI Widget aggregating Etherlink DEX liquidity and cross-chain routes
**Yield Data**: Live APY from DeFiLlama across Etherlink lending markets

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| [YieldEscrow](contracts/src/core/YieldEscrow.sol) | P2P escrow with yield routing — the core novel contract |
| [StableNestVault](contracts/src/vault/StableNestVault.sol) | ERC-4626 multi-strategy yield aggregator |
| [BaseStrategy](contracts/src/vault/strategies/BaseStrategy.sol) | Pluggable strategy adapter |
| [IdleStrategy](contracts/src/vault/strategies/IdleStrategy.sol) | Simulated yield strategy for testnet (4% APY) |
| [MockVerifier](contracts/src/verifier/MockVerifier.sol) | Payment verification mock (pluggable for Reclaim Protocol) |

9/9 tests passing &nbsp;|&nbsp; Solidity 0.8.24 &nbsp;|&nbsp; OpenZeppelin v4.9.6

### Deployed (Etherlink Shadownet — Chain 127823)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x3D101003b1f7E1dFe6f4ee7d1b587f656c3a651F` |
| StableNestVault | `0x674e8150f526eDFBAc93577b32A267aB39C1a920` |
| IdleStrategy | `0x51D3987A408BC7c24c5CB440B20DeD5E25d39CF7` |
| MockVerifier | `0xc60b9A9Cc250fE880493f33fF7106D9aCc386ef1` |
| YieldEscrow | `0x9510952EeE3a75769Eeb25791e3b9D7E8Eb964d2` |

### Verified Transactions

| Action | Tx Hash |
|--------|---------|
| Vault deposit (1000 USDC) | `0x3c546adef1c3cb5b23c2fc97f6b9897da665a33c3a3ae214387c9a584ea46b65` |
| YieldEscrow P2P deposit (500 USDC → GCash) | `0x062916fbd3bb91c6e1952bdc261023c4a4d8e681d286e89a6edcf5875db54eef` |

## Why Etherlink

- **Sub-500ms finality** — transfers confirm before the user blinks
- **Near-zero gas** — $0.01/tx makes micro-remittances ($10-50) viable
- **EVM compatible** — standard Solidity, full DeFi ecosystem
- **Tezos L1 security** — consensus secured by proof-of-stake

## Supported Corridors

Singapore → Philippines &nbsp;|&nbsp; Malaysia → Indonesia &nbsp;|&nbsp; Hong Kong → Thailand &nbsp;|&nbsp; Japan → Vietnam &nbsp;|&nbsp; UAE → India &nbsp;|&nbsp; Korea → Myanmar

Payment methods: GCash, GrabPay, PromptPay, Dana, OVO, PayNow, Wise, Revolut

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WC_PROJECT_ID` | Yes | WalletConnect project ID from [Reown](https://cloud.reown.com) |
| `NEXT_PUBLIC_TESTNET_RPC` | No | Etherlink Shadownet RPC (defaults to public endpoint) |
| `NEXT_PUBLIC_USDC_ADDRESS` | No | MockUSDC contract address |
| `NEXT_PUBLIC_VAULT_ADDRESS` | No | StableNestVault contract address |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | No | YieldEscrow contract address |
| `NEXT_PUBLIC_VERIFIER_ADDRESS` | No | MockVerifier contract address |

## Getting Started

```bash
git clone https://github.com/edwardtay/asialink.git && cd asialink

# Frontend
cd frontend && cp .env.example .env.local && pnpm install && pnpm dev

# Contracts
cd ../contracts && forge build && forge test -v
```
