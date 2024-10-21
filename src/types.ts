
export enum ChainSymbol {
  ETH = 'ETH',
  BNB = 'BNB',
  POLYGON = 'POLYGON',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  AVALANCHE = 'AVALANCHE',
  SCROLL = 'SCROLL',
  
  SEPOLIA = 'SEPOLIA',
  BNB_TEST = 'BNB_TEST',
}

export enum ApiBaseUrl {
  Production = "https://api.sinohope.com",
  Sandbox = "https://api-sandbox.sinohope.com",
  Pre = "https://api-pre.sinohope.com",
  Qa = "https://api-sandbox-qa1.newhuoapps.com",
}

export type Asset = {
  assetId: string,
  rpcUrl: string,
}

export enum RawMessageType {
  EIP712 = "EIP712",
  ETH_MESSAGE = "ETH_MESSAGE",
}

export enum TransactionStatus {
  SUBMITTED = 0,
  AUDITTED = 1,
  BROADCASTING = 2,
  BLOCKED = 4,
  FAILED = 5,
  BROADCAST_TIMEOUT = 6,
  COMPLETED = 10,
  ROLLBACK = 11,
  WAITAUDIT = 12,
  REJECTED = 13,
  CANCELLED = 14,
}

export type SinohopeProviderConfig = {
  // ------------- Mandatory fields -------------
  /** 
   * Learn more about creating API key here: 
   * https://docs.sinohope.com/docs/develop/mpc-waas-api/quick-start/qs-1-waas/
   */

  /** 
   * Sinohope API private & public key for signing requests
   */
  privateKey: string,
  publicKey: string,

  /** 
   * chainSymbol have a default rpcUrl but can override by rpcUrl
   */
  chainSymbol: ChainSymbol,

  // ------------- Optional fields --------------

  /** 
   * If not provided, it is inferred from the chainSymbol
   */
  rpcUrl?: string,
  /**
   * If you are not using native token, you can provide Sinohope assetId here
   */
  assetId?: string,
  /** 
   * By default, the first 10 vault accounts are dynamically loaded from the Sinohope API
   * It is recommended to provide the vault wallet account ids explicitly because it helps avoid unnecessary API calls
   * format: vaultId_walletId
   */
  vaultWalletIds?: string | string[],
  /** 
   * By default, it uses the Sinohope API production endpoint
   * When using a sandbox workspace, you should provide the ApiBaseUrl.Sandbox value
   */
  apiBaseUrl?: ApiBaseUrl | string,
  /**
   * By default, the note is set to "Created by Sinohope Web3 Provider"
   */
  note?: string,
  /**
   * By default, the polling interval is set to 3000ms (3 second)
   * It is the interval in which the Sinohope API is queried to check the status of transactions
   */
  pollingInterval?: number,
  /**
   * Default: false
   * By setting to true, every transaction status change will be logged to the console
   * Same as setting env var `DEBUG=sinohope-web3-provider:status`
   */
  logTransactionStatusChanges?: boolean,
  /**
   * Default: false
   * By setting to true, every request and response processed by the provider will be logged to the console
   * Same as setting env var `DEBUG=sinohope-web3-provider:req_res`
   */
  logRequestsAndResponses?: boolean,
  /**
   * Default: true
   * By setting to true, every failed transaction will print additional information
   * helpful for debugging, such as a link to simulate the transaction on Tenderly
   * Same as setting env var `DEBUG=sinohope-web3-provider:error`
   */
  enhancedErrorHandling?: boolean,

  /**
   * Proxy path in the format of `http(s)://user:pass@server`.
   * Note that all connections performed via the proxy will be done using CONNECT HTTP method.
   */
  proxyPath?: string,
}

export interface RequestArguments<T = any> {
  method: string;
  params?: T;
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
  payload: RequestArguments;
}
