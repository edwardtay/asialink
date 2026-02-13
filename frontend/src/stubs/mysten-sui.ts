// Comprehensive stub for @mysten/sui, @mysten/dapp-kit, @mysten/wallet-standard
// LI.FI Widget imports these for Sui chain support, but we only use EVM (Etherlink).
// Turbopack requires all imports to resolve, so we provide empty stubs.

// @mysten/sui/client
export const SuiClient = class {};
export const getFullnodeUrl = () => "";

// @mysten/sui/jsonRpc
export const getJsonRpcFullnodeUrl = () => "";
export const isSuiJsonRpcClient = () => false;
export const SuiJsonRpcClient = class {};

// @mysten/sui/utils
export const isValidSuiAddress = () => false;

// @mysten/sui/transactions
export const Transaction = class {};

// @mysten/dapp-kit
export const SuiClientContext = null;
export const createNetworkConfig = () => ({});
export const SuiClientProvider = ({ children }: any) => children;
export const WalletProvider = ({ children }: any) => children;
export const useCurrentAccount = () => null;
export const useCurrentWallet = () => ({ wallet: null, isConnected: false });
export const useSignTransaction = () => ({});
export const useDisconnectWallet = () => ({});
export const useConnectWallet = () => ({});
export const useWallets = () => [];
export const useSuiClient = () => ({});

// @mysten/wallet-standard
export const signAndExecuteTransaction = async () => ({});
export type WalletWithRequiredFeatures = any;
