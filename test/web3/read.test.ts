import { expect } from "chai"
import { getWeb3SinohopeProviderForTesting } from "../utils"

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"
const provider = getWeb3SinohopeProviderForTesting()

describe("Web3: Should be able to read data from Sepolia", function () {
  this.timeout(60_000)

  it("getBalance", async function () {
    const nullAddressBalance = await provider.eth.getBalance(NULL_ADDRESS)

    expect(BigInt(nullAddressBalance) > 99999999999999).to.be.true
  })
  
  it("getBlockNumber", async function () {
    const blockNumber = Number(await provider.eth.getBlockNumber())

    expect(blockNumber).to.be.greaterThan(10_000)
  })
})
