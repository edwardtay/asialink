import { type Address, parseAbi } from "viem";

// Contract addresses — set after deployment
export const CONTRACTS = {
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as Address | undefined,
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined,
  escrow: process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined,
  verifier: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as Address | undefined,
} as const;

export const USDC_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const VAULT_ABI = parseAbi([
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function maxDeposit(address) view returns (uint256)",
  "function maxWithdraw(address) view returns (uint256)",
  "function symbol() view returns (string)",
]);

export const ESCROW_ABI = parseAbi([
  "function createDeposit(uint256 amount, bytes32 payeeDetails, bytes32 paymentMethod) returns (uint256 depositId)",
  "function addFunds(uint256 depositId, uint256 amount)",
  "function withdrawDeposit(uint256 depositId)",
  "function setAcceptingIntents(uint256 depositId, bool accepting)",
  "function signalIntent(uint256 depositId, uint256 amount, address to, uint256 fiatAmount, bytes32 fiatCurrency) returns (bytes32 intentHash)",
  "function fulfillIntent(bytes32 intentHash, bytes paymentProof, bytes verificationData)",
  "function cancelIntent(bytes32 intentHash)",
  "function getDepositValue(uint256 depositId) view returns (uint256)",
  "function getDepositYield(uint256 depositId) view returns (uint256)",
  "function getAccountDeposits(address account) view returns (uint256[])",
  "function deposits(uint256) view returns (address depositor, uint256 amount, uint256 sharesInVault, bytes32 payeeDetails, bytes32 paymentMethod, bool acceptingIntents)",
  "function intents(bytes32) view returns (address buyer, address to, uint256 depositId, uint256 amount, uint256 fiatAmount, bytes32 fiatCurrency, uint256 expiryTime, bool fulfilled)",
  "function depositCounter() view returns (uint256)",
  "function protocolFeeBps() view returns (uint256)",
]);

export function formatUSDC(amount: bigint | undefined): string {
  if (amount === undefined) return "0.00";
  const num = Number(amount) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDC(amount: string): bigint {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0n;
  return BigInt(Math.floor(num * 1e6));
}
