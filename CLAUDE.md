# AsiaLink

Send money home for less. Save in USD. Asia's remittance + DeFi savings app on Etherlink.

## Positioning

- **Target user**: Migrant workers and families across APAC (Philippines, Indonesia, Thailand, Malaysia, Singapore, Vietnam)
- **Core value prop**: Near-zero fee remittances ($0.01 vs $8-15 traditional) + USD savings with ~4% APY
- **Novel tech**: P2P escrow that routes idle USDC into yield vaults while waiting for matches (YieldEscrow)
- **Supported payment methods**: GCash, GrabPay, PromptPay, Dana, OVO, PayNow, Wise, Revolut

## Architecture

```
Pages:
  /         → Homepage (remittance hero, cost comparison, corridors)
  /send     → Send USDC to family (primary action, USDC transfer)
  /buy      → Receive USDC (P2P on-ramp, pay with local apps → get USDC)
  /earn     → Save in USD (ERC-4626 vault, deposit USDC, earn ~4% APY)
  /swap     → Token swap (aggregated DEX: Curve, IguanaDEX, Hanji)
  /bridge   → Cross-chain bridge (Ethereum, Arbitrum, Base → Etherlink)
  /lend     → Lending markets (Superlend, Morpho supply/borrow)
  /sell     → Cash out (USDC → P2P → local currency, LP earns yield)

Contracts:
  YieldEscrow.sol       → P2P escrow with yield routing (THE novel piece)
  StableNestVault.sol   → ERC-4626 yield aggregator vault (eUSDC)
  BaseStrategy.sol      → Strategy adapter base
  IdleStrategy.sol      → Test strategy (simulated yield)
  MockVerifier.sol      → Mock payment verifier
```

## Chain: Etherlink

- Mainnet: Chain ID 42793, RPC https://node.mainnet.etherlink.com
- Testnet (Shadownet): Chain ID 127823, RPC https://node.shadownet.etherlink.com
- Solidity: 0.8.24, EVM: Shanghai
- OpenZeppelin: v4.9.6 (no Cancun opcodes)

## Commands

```bash
# Contracts
forge build --root contracts
forge test --root contracts -v

# Frontend
cd frontend && pnpm install && pnpm dev

# Deploy to Etherlink testnet
forge script script/Deploy.s.sol --root contracts --rpc-url https://node.ghostnet.etherlink.com --broadcast
```

## Fork References

- `.forks/zkp2p-contracts/` — ZKP2P V2 escrow + orchestrator (MIT license)
- `.forks/stable-yield-aggregator/` — ERC-4626 multi-strategy vault reference

## Key Design Decisions

- OZ v4.9.6 (not v5) — Etherlink uses Shanghai EVM, no Cancun opcodes (mcopy)
- Ownable (OZ v4) — owner is deployer (msg.sender), no constructor arg
- safeApprove instead of forceApprove — OZ v4 API
- IdleStrategy simulates yield for testing; production uses Curve/Gearbox/Superlend
- Payment verification is pluggable: MockVerifier for dev, ReclaimVerifier for production
- Asian payment methods first (GCash, GrabPay, PromptPay, Dana, OVO, PayNow) — matches APAC target market

## Deployed Contracts (Etherlink Testnet)

```
MockUSDC:         0x3D101003b1f7E1dFe6f4ee7d1b587f656c3a651F
StableNestVault:  0x674e8150f526eDFBAc93577b32A267aB39C1a920
YieldEscrow:      0x9510952EeE3a75769Eeb25791e3b9D7E8Eb964d2
MockVerifier:     0xA2A830924166af7Fe6B6b8A9E37Cce3D9F96FC37
```
