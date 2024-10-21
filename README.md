<div align="center">
  [<ins>Sinohope Web3 Provider Documentation</ins>](https://docs.sinohope.com/)
</div>

# Sinohope Web3 Provider

Sinohope [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Compatible Ethereum JavaScript Provider

## Installation
```bash
npm install @sinohope/sinohope-web3-provider
```

## Setup
```js
import { SinohopeWeb3Provider, ChainSymbol, ApiBaseUrl } from "@sinohope/sinohope-web3-provider";

const sinohopeProvider = new SinohopeWeb3Provider({
    // apiBaseUrl: ApiBaseUrl.Sandbox // If using a sandbox workspace
    privateKey: process.env.SINOHOPE_API_PRIVATE_KEY,
    publicKey: process.env.SINOHOPE_API_PUBLIC_KEY,
    vaultWalletIds: process.env.SINOHOPE_VAULT_WALLET_IDS,
    chainSymbol: ChainSymbol.SEPOLIA,

    logTransactionStatusChanges: true, // Verbose logging
})
```

## Usage with ethers.js
```sh
npm install ethers@5
```

```js
import * as ethers from "ethers"

const provider = new ethers.providers.Web3Provider(sinohopeProvider);
// const provider = new ethers.BrowserProvider(sinohopeProvider); // For ethers v6
```

## Usage with web3.js
```sh
npm install web3
```

```js
import Web3 from "web3";

const web3 = new Web3(sinohopeProvider);
```

## API Documentation

### new SinohopeWeb3Provider(config)

- `config` [SinohopeProviderConfig](#SinohopeProviderConfig)

This class is an [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Compatible Ethereum JavaScript Provider powered by the [Sinohope API](https://docs.sinohope.com/)

### SinohopeProviderConfig

```ts
type SinohopeProviderConfig = {
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
   * https://docs.sinohope.com/docs/develop/get-started/supported-coins/
   */
  assetId?: string,
  /** 
   * By default, the first 10 vault accounts are dynamically loaded from the Sinohope API
   * It is recommended to provide the vault account ids explicitly because it helps avoid unnecessary API calls
   * format: vaultId_walletId example: 559690280115781_571316952882629
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
```
