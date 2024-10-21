import * as dotenv from 'dotenv'
dotenv.config()
import * as ethers from "ethers"
import { SinohopeWeb3Provider, ChainSymbol, ApiBaseUrl } from "../src"
import Web3 from "web3";

export function getSinohopeProviderForTesting(extraConfiguration?: any) {
  if (!process.env.SINOHOPE_API_PRIVATE_KEY || !process.env.SINOHOPE_API_PUBLIC_KEY) {
    throw new Error("Environment variables SINOHOPE_API_PRIVATE_KEY, SINOHOPE_API_PUBLIC_KEY must be set")
  }

  const providerConfig = {
    privateKey: process.env.SINOHOPE_API_PRIVATE_KEY,
    publicKey: process.env.SINOHOPE_API_PUBLIC_KEY,
    chainSymbol: ChainSymbol.SEPOLIA,
    assetId: process.env.SINOHOPE_ASSET_ID,
    vaultWalletIds: process.env.SINOHOPE_VAULT_WALLET_IDS,
    rpcUrl: process.env.SINOHOPE_RPC_URL,
    apiBaseUrl: ApiBaseUrl.Pre,
    ...extraConfiguration
  };

  if (process.env.PROXY_PATH) {
    providerConfig["proxyPath"] = process.env.PROXY_PATH
    if (process.env.PROXY_UNTRUSTED_CERT)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  }

  const provider = new SinohopeWeb3Provider(providerConfig)

  return provider
}

export function getEthersSinohopeProviderForTesting(extraConfiguration?: any) {
  return new ethers.providers.Web3Provider(getSinohopeProviderForTesting(extraConfiguration))
}

export function getWeb3SinohopeProviderForTesting(extraConfiguration?: any) {
  return new Web3(getSinohopeProviderForTesting(extraConfiguration))
}
