import * as util from "util";
import { nanoid } from 'nanoid'
// @ts-ignore
import { GetVaults, ListWallets, ListAddresses, CreateTransfer, CreateTransaction, TransactionsByRequestIds, SignMessage, SignResult } from '@sinohope/js-sdk';
import { getAssetByChain, promiseToFunction } from "./utils";
import { ApiBaseUrl, ChainSymbol, SinohopeProviderConfig, ProviderRpcError, RawMessageType, RequestArguments, TransactionStatus } from "./types";
import { formatEther, formatUnits, parseEther } from "@ethersproject/units";
import { DEBUG_NAMESPACE_ENHANCED_ERROR_HANDLING, DEBUG_NAMESPACE_REQUESTS_AND_RESPONSES, DEBUG_NAMESPACE_TX_STATUS_CHANGES, FINAL_SUCCESSFUL_TRANSACTION_STATES } from "./constants";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatJsonRpcRequest, formatJsonRpcResult } from "./jsonRpcUtils";
import Debug from "debug";
import { AxiosProxyConfig } from "axios";
import * as web3_http_providers from "web3-providers-http";
const HttpProvider= (web3_http_providers as any )['default'];
const logTransactionStatusChange = Debug(DEBUG_NAMESPACE_TX_STATUS_CHANGES);
const logEnhancedErrorHandling = Debug(DEBUG_NAMESPACE_ENHANCED_ERROR_HANDLING);
const logRequestsAndResponses = Debug(DEBUG_NAMESPACE_REQUESTS_AND_RESPONSES);


export class SinohopeWeb3Provider extends HttpProvider {
  private config: SinohopeProviderConfig;
  private apiParams: [string, string, string];
  private accounts: { [vaultWalletId: string]: string } = {};
  private vaultWalletIds?: string[];
  private assetId?: string;
  private chainId?: number;
  private chainSymbol: ChainSymbol;
  private note: string;
  private pollingInterval: number;
  private assetAndChainIdPopulatedPromise: () => Promise<void>;
  private accountsPopulatedPromise: () => Promise<void>;
  private requestCounter = 0;

  constructor(config: SinohopeProviderConfig) {
    if (!config.privateKey || !config.publicKey) {
      throw Error(`privateKey and publicKey is required in the sinohope-web3-provider config`)
    }
    if (!config.apiBaseUrl) {
      config.apiBaseUrl = ApiBaseUrl.Production
    }
    const asset = getAssetByChain(config.chainSymbol);
    if (!asset) {
      throw Error(`Unsupported chain symbol: ${config.chainSymbol}.\nSupported chains ids: ${Object.keys(ChainSymbol).join(', ')}`);
    }

    const debugNamespaces = [process.env.DEBUG || '']
    if (config.logTransactionStatusChanges) {
      debugNamespaces.push(DEBUG_NAMESPACE_TX_STATUS_CHANGES)
    }
    if (config.enhancedErrorHandling || config.enhancedErrorHandling == undefined) {
      debugNamespaces.push(DEBUG_NAMESPACE_ENHANCED_ERROR_HANDLING)
    }
    if (config.logRequestsAndResponses) {
      debugNamespaces.push(DEBUG_NAMESPACE_REQUESTS_AND_RESPONSES)
    }
    Debug.enable(debugNamespaces.join(','))
    const headers: { name: string, value: string }[] = []
    if (config.rpcUrl && config.rpcUrl.includes("@") && config.rpcUrl.includes(":")) {
      const [creds, url] = config.rpcUrl.replace("https://", "").replace("http://", "").split("@");
      config.rpcUrl = `${config.rpcUrl.startsWith("https") ? "https://" : "http://"}${url}`;
      headers.push(
        {
          name: "Authorization",
          value: Buffer.from(creds).toString('base64')
        }
      );
    }

    super(config.rpcUrl || asset.rpcUrl)

    this.config = config
    this.headers = headers;
    if (config.proxyPath) {
      const proxyAgent = new HttpsProxyAgent(config.proxyPath);
      this.agent = {
        http: proxyAgent,
        https: proxyAgent
      }
    }
    this.apiParams = [this.config.apiBaseUrl!, this.config.privateKey, this.config.publicKey]
    this.note = config.note ?? 'Created by Sinohope Web3 Provider'
    this.vaultWalletIds = this.parseVaultWalletIds(config.vaultWalletIds)
    this.pollingInterval = config.pollingInterval || 3000
    this.chainSymbol = config.chainSymbol
    this.assetId = config.assetId || asset.assetId

    this.assetAndChainIdPopulatedPromise = promiseToFunction(async () => { if (!this.chainId) return await this.populateAssetAndChainId() })
    this.accountsPopulatedPromise = promiseToFunction(async () => { return await this.populateAccounts() })
  }

  private parseVaultWalletIds(vaultWalletIds: string | string[] | undefined): string[] | undefined {
    if (typeof vaultWalletIds == 'string') {
      return [vaultWalletIds]
    } else {
      return vaultWalletIds
    }
  }

  private async getVaultAccounts(): Promise<string[]> {
    await this.assetAndChainIdPopulatedPromise()
    let wallets: string[] = []
    let api = new GetVaults(...this.apiParams);
    let data = await api.request();
    if (!data.data) {
      return [];
    }
    for (const vault of data.data[0].vaultInfoOfOpenApiList) {
      api = new ListWallets(...this.apiParams)
      data = await api.request({vaultId: vault.vaultId, pageIndex: 1, pageSize: 10});
      data.data.list.map((wallet: { walletId: string; }) => wallets.push(vault.vaultId + '_' + wallet.walletId))
    }
    return wallets;
  }

  private async populateAssetAndChainId() {
    const chainId = (await util.promisify<any, any>(super.send).bind(this)(formatJsonRpcRequest('eth_chainId', []))).result
    this.chainId = Number(chainId)
  }

  private async populateAccounts() {
    if (Object.keys(this.accounts).length > 0) {
      throw this.createError({ message: "Accounts already populated" })
    }

    if (!this.vaultWalletIds) {
      this.vaultWalletIds = await this.getVaultAccounts()
    }

    await this.assetAndChainIdPopulatedPromise()

    for (const vaultWalletId of this.vaultWalletIds) {
      const [vaultId, walletId, hdPath] = vaultWalletId.split('_')
      try {
        const api = new ListAddresses(...this.apiParams)
        const data = await api.request({vaultId: vaultId, walletId: walletId, chainSymbol: this.chainSymbol, pageIndex: 1, pageSize: 50})
        for (const addrInfo of data.data.list) {
          this.accounts[vaultWalletId + '_' + addrInfo.hdPath] = addrInfo.address
        }
      } catch (error) {
        throw this.createSinohopeError(error)
      }
    }
    if (this.config.vaultWalletIds && Object.keys(this.accounts).length == 0) {
      throw this.createError({ message: `No ${this.assetId} asset wallet found for vault account` })
    }

    // console.log(this.accounts)
  }

  private createSinohopeError(e: any) {
    console.error(e)
    const code = e?.response?.status == 401 ? 4100 : undefined
    let message = e?.response?.data?.message || e?.message || 'Unknown error'
    message = `Sinohope SDK Error: ${message}`
    message = e?.response?.data?.code ? `${message} (Error code: ${e.response.data.code})` : message
    message = e?.response?.headers?.['x-request-id'] ? `${message} (Request ID: ${e.response.headers['x-request-id']})` : message

    return this.createError({ message, code })
  }

  private async initialized() {
    await Promise.all(
      [
        this.assetAndChainIdPopulatedPromise(),
        this.accountsPopulatedPromise(),
      ]
    )
  }

  public send(
    payload: any,
    callback: (error: any, response: any) => void
  ): void {
    (async () => {
      let result;
      let error: any = null;
      const requestNumber = ++this.requestCounter;
      
      try {
        logRequestsAndResponses(`Request #${requestNumber}: method=${payload.method} params=${JSON.stringify(payload.params, undefined, 4)}`)

        if (payload?.params?.[0]?.input && !payload?.params?.[0]?.data) {
          payload.params[0].data = payload.params?.[0].input
          delete payload.params?.[0].input
        }

        switch (payload.method) {
          case "eth_requestAccounts":
          case "eth_accounts":
            await this.accountsPopulatedPromise()
            result = Object.values(this.accounts)
            break;

          case "eth_sendTransaction":
            try {
              result = await this.createContractCall(payload.params[0]);
            } catch (error) {
              logEnhancedErrorHandling(`Simulate the failed transaction on Tenderly: ${this.createTenderlySimulationLink(payload.params[0])}`)
              throw error
            }
            break;

          case "personal_sign":
          case "eth_sign":
            result = await this.createPersonalSign(payload.method, payload.params[1], payload.params[0], RawMessageType.ETH_MESSAGE);
            break;

          case "eth_signTypedData":
          case "eth_signTypedData_v3":
          case "eth_signTypedData_v4":
            result = await this.createPersonalSign(payload.method, payload.params[0], payload.params[1], RawMessageType.EIP712);
            break;

          case "eth_signTypedData_v1":
          case "eth_signTypedData_v2":
          case "eth_signTransaction":
            throw this.createError({
              message: `JSON-RPC method (${payload.method}) is not implemented in SinohopeWeb3Provider`,
              code: 4200,
              payload,
            })

          default:
            const jsonRpcResponse = await util.promisify<any, any>(super.send).bind(this)(payload)

            if (jsonRpcResponse.error) {
              if (payload.method == 'eth_estimateGas') {
                logEnhancedErrorHandling(`Simulate the failed transaction on Tenderly: ${this.createTenderlySimulationLink(payload.params[0])}`)
              }
              throw this.createError({
                message: jsonRpcResponse.error.message,
                code: jsonRpcResponse.error.code,
                data: jsonRpcResponse.error.data,
                payload,
              })
            }

            result = jsonRpcResponse.result
        }
      } catch (e) {
        error = e;
      }

      if (error) {
        logRequestsAndResponses(`Error #${requestNumber}: ${error}`)
      } else {
        logRequestsAndResponses(`Response #${requestNumber}: ${JSON.stringify(result, undefined, 4)}`)
      }
      callback(error, formatJsonRpcResult(payload.id, result));
    })();
  }

  private createTenderlySimulationLink(tx: any): String {
    const searchParams = new URLSearchParams(JSON.parse(JSON.stringify({
      ...tx,

      to: undefined,
      contractAddress: tx.to,

      data: undefined,
      rawFunctionInput: tx.data || '0x',

      network: this.chainId,

      gasPrice: tx.gasPrice ? Number(tx.gasPrice) : undefined,
      gas: tx.gas ? Number(tx.gas) : undefined,
    })));

    if (!searchParams.get('gasPrice') && tx.maxFeePerGas) {
      searchParams.set('gasPrice', String(Number(tx.maxFeePerGas)))
    }

    return `https://dashboard.tenderly.co/simulator/new?${searchParams.toString()}`
  }

  private createError(errorData: { message: string, code?: number, data?: any, payload?: any }): ProviderRpcError {
    const error = new Error(errorData.message) as ProviderRpcError
    error.code = errorData.code || -32603
    error.data = errorData.data
    error.payload = errorData.payload

    // We do this to avoid including this function in the stack trace
    if ((Error as any).captureStackTrace !== undefined) {
      (Error as any).captureStackTrace(error, this.createError);
    }

    return error
  }

  public sendAsync(
    payload: any,
    callback: (error: any, response: any) => void
  ): void {
    this.send(payload, callback);
  }

  public async request(
    args: RequestArguments
  ): Promise<any> {
    return (await util.promisify(this.send).bind(this)(formatJsonRpcRequest(args.method, args.params))).result;
  }

  private getDestination(address: string): string {
    return address || "0x0" // 0x0 for contract creation transactions
  }

  private getVaultWalletIdAndValidateExistence(address: string, errorMessage: string = "Account not found: ") {
    const vaultWalletId = this.getVaultWalletId(address);

    if ('' == vaultWalletId) {
      throw this.createError({
        message: `${errorMessage}${address}. 
${!this.config.vaultWalletIds ? "vaultWalletIds was not provided in the configuration. When that happens, the provider loads the first 10 vault accounts found. It is advised to explicitly pass the required vaultWalletIds in the configuration to the provider." : `vaultWalletIds provided in the configuration: ${this.vaultWalletIds!.join(", ")}`}.
Available addresses: ${Object.values(this.accounts).join(', ')}.`
      })
    }

    return vaultWalletId
  }


  private async createContractCall(transaction: any) {
    await this.initialized()
    if (transaction.chainId && Number(transaction.chainId) != Number(this.chainId)) {
      throw this.createError({ message: `Chain ID of the transaction (${transaction.chainId}) does not match SinohopeWeb3Provider (${this.chainId})` })
    }

    if (!transaction.from) {
      throw this.createError({ message: `Transaction sent with no "from" field` })
    }

    const vaultWalletId = this.getVaultWalletIdAndValidateExistence(transaction.from, `Transaction sent from an unsupported address: `);
    const [vaultId, walletId, hdPath] = vaultWalletId.split('_')
    const { gas, gasPrice, maxPriorityFeePerGas, maxFeePerGas } = transaction;
    const fee = formatUnits(gasPrice || 0, "gwei");
    const maxFee = formatUnits(maxFeePerGas || 0, "gwei");
    const priorityFee = formatUnits(maxPriorityFeePerGas || 0, "gwei");
    // if both are provided prefer eip 1559 fees
    const isEip1559Fees: boolean = (Boolean(maxFee) && Boolean(maxPriorityFeePerGas) && Boolean(gas));
    const isLegacyFees: boolean = (Boolean(gasPrice) && Boolean(gas)) && !isEip1559Fees;

    let transactionArguments: any = {
      vaultId: vaultId,
      walletId: walletId,
      assetId: this.assetId,
      chainSymbol: this.chainSymbol,
      from: transaction.from,
      to: this.getDestination(transaction.to),
      amount: parseEther(formatEther(transaction.value?.toString() || "0")).toString(),
      note: this.note,
    }
    if (transaction.data) {
      transactionArguments['inputData'] = transaction.data
    }
    if (isLegacyFees) {
      transactionArguments['fee'] = fee
    }
    if (isEip1559Fees || isLegacyFees) {
      transactionArguments['gasLimit'] =  Number(gas).toString(10)
    }
    if (gasPrice) {
      //
    }

    const createTransactionResponse = await this.createTransaction(transactionArguments);

    return createTransactionResponse.txHash;
  }

  private getRequestId() : string {
    return nanoid();
  }
  private async createPersonalSign(method: string, address: string, content: any, type: RawMessageType): Promise<string> {
    await this.initialized()
    const vaultAccountId = this.getVaultWalletIdAndValidateExistence(address, `Signature request from an unsupported address: `);
    const [vaultId, walletId, hdPath] = vaultAccountId.split('_')

    let message = content;
    if (type === RawMessageType.EIP712) {
      if (typeof content == 'object') {
        const types = content.primaryType ? { [content.primaryType]: content.types[content.primaryType] } : content.types
        message = JSON.stringify(_TypedDataEncoder.getPayload(content.domain, types, content.message))
        // console.log(types, message)
      }
    }

    let api = new SignMessage(...this.apiParams)
    let requestId = this.getRequestId()
    const args = {
      requestId: requestId,
      chainSymbol: this.chainSymbol,
      hdPath: hdPath,
      signAlgorithm: method,
      message: message
    }
    // console.log('request sign: ', args)
    
    let data = await api.request(args)
    // console.log(data)
    if (!data.success) {
      throw this.createError({message: data.msg})
    }

    let currentStatus = 0
    api = new SignResult(...this.apiParams)
    api.setTarget('/v1/waas/mpc/web3/sign_result')
    while (0 == currentStatus) {
      try {
        let data = await api.request({
          requestId: requestId,
        })
        // console.log(data)
        if (!data.success) {
          console.error('SignResult error ', data)
          break;
        }
        
        currentStatus = data.data.state;
        console.log('currentStatus: ', currentStatus)
        if (currentStatus == 1) {
          return "0x" + data.data.signature;
        } else if (currentStatus == 2) {
          console.log('signature failed')
          return '';
        }
        
      } catch (err) {
        console.error(this.createSinohopeError(err));
      }
      await new Promise(r => setTimeout(r, this.pollingInterval));
    }
    return '';
  }

  private async createTransaction(transactionArguments: any): Promise<{txHash: string}> {
    let api: any;
    if (transactionArguments['inputData']) {
      api = new CreateTransaction(...this.apiParams)
    } else {
      api = new CreateTransfer(...this.apiParams)
    }
    const requestId = this.getRequestId()
    transactionArguments['requestId'] = requestId
    // console.log(transactionArguments)
    let data = await api.request(transactionArguments)
    if (!data.success) {
      throw this.createError({message: 'CreateTransfer error: ' + data.msg})
    }
    
    let txInfo: {txHash: string};
    let currentStatus: TransactionStatus = TransactionStatus.SUBMITTED;

    api = new TransactionsByRequestIds(...this.apiParams)
    while (TransactionStatus.SUBMITTED == currentStatus || TransactionStatus.AUDITTED == currentStatus || TransactionStatus.BROADCASTING == currentStatus) {
      try {
        data = await api.request({requestIds: requestId})
        if (!data.success) {
          console.error('TransactionsByRequestIds error ', data)
          break;
        }
        txInfo = data.data.list[0]['transaction']
        if (currentStatus != data.data.list[0]['state']) {
          logTransactionStatusChange(`Sinohope transaction ${txInfo['txHash']} changed status from ${currentStatus} to ${data.data.list[0]['state']}`)
        }
        currentStatus = data.data.list[0]['state'];
        console.log('currentStatus: ', currentStatus)
      } catch (err) {
        console.error(this.createSinohopeError(err));
      }
      await new Promise(r => setTimeout(r, this.pollingInterval));
    }

    if (!FINAL_SUCCESSFUL_TRANSACTION_STATES.includes(currentStatus)) {
      console.log(`Sinohope transaction ${txInfo!['txHash'] || ''} was not completed. Final Status: ${currentStatus}`)
      // throw this.createError({ message: `Sinohope transaction ${txInfo!['txHash'] || ''} was not completed successfully. Final Status: ${currentStatus}` })
    }

    return txInfo!
  }

  private getVaultWalletId(address: string): string {
    return Object.entries(this.accounts).find(([id, addr]) => addr.toLowerCase() === address.toLowerCase())?.[0] || '';
  }

  public setExternalTxId(externalTxId: (() => string) | string | undefined) {
    this.externalTxId = externalTxId;
  }

  private toAxiosProxyConfig(path: string): AxiosProxyConfig {
    const proxyUrl = new URL(path);

    if (proxyUrl.pathname != '/') {
      throw 'Proxy with path is not supported by axios';
    }
    return {
      protocol: proxyUrl.protocol.replace(':', ''),
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port),
      auth: proxyUrl.username ? {
        username: proxyUrl.username,
        password: proxyUrl.password
      } : undefined
    }
  }
}
