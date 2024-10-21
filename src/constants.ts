import { ChainSymbol, Asset, TransactionStatus } from "./types";

export const ASSETS: { [key: string]: Asset } = {
  [ChainSymbol.ETH]: { assetId: 'ETH_ETH', rpcUrl: "https://cloudflare-eth.com" },
  [ChainSymbol.BNB]: { assetId: 'BNB_BNB', rpcUrl: 'https://bsc-dataseed.binance.org' },
  [ChainSymbol.POLYGON]: { assetId: 'MATIC_POLYGON', rpcUrl: 'https://polygon-rpc.com' },
  [ChainSymbol.ARBITRUM]: { assetId: 'ETH_ARBITRUM', rpcUrl: 'https://rpc.ankr.com/arbitrum' },
  [ChainSymbol.OPTIMISM]: { assetId: 'ETH_OPTIMISM', rpcUrl: 'https://rpc.ankr.com/optimism' },
  [ChainSymbol.AVALANCHE]: { assetId: 'AVAX_AVALANCHE', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc' },
  [ChainSymbol.SCROLL]: { assetId: 'ETH_SCROLL', rpcUrl: 'https://rpc.scroll.io' },

  [ChainSymbol.SEPOLIA]: { assetId: 'ETH_SEPOLIA', rpcUrl: "https://rpc.sepolia.org" },
  [ChainSymbol.BNB_TEST]: { assetId: 'BNB_BNB_TEST', rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545' }
}

export const SIGNER_METHODS = [
  "eth_sendTransaction",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_requestAccounts",
  "eth_accounts",
  "eth_sign",
  "eth_signTransaction",
]

export const FINAL_SUCCESSFUL_TRANSACTION_STATES = [
  TransactionStatus.COMPLETED,
  TransactionStatus.BROADCASTING,
  TransactionStatus.ROLLBACK,
]

export const DEBUG_NAMESPACE = 'sinohope-web3-provider'
export const DEBUG_NAMESPACE_TX_STATUS_CHANGES = `${DEBUG_NAMESPACE}:status`
export const DEBUG_NAMESPACE_ENHANCED_ERROR_HANDLING = `${DEBUG_NAMESPACE}:error`
export const DEBUG_NAMESPACE_REQUESTS_AND_RESPONSES = `${DEBUG_NAMESPACE}:req_res`
