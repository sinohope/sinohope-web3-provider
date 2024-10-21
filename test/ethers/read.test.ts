import { expect } from "chai"
import { getEthersSinohopeProviderForTesting } from "../utils"

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"
const provider = getEthersSinohopeProviderForTesting()

describe("Ethers: Should be able to read data from Sepolia", function () {
  this.timeout(60_000)

  it("getBlockNumber", async function () {
    const blockNumber = await provider.getBlockNumber()
    expect(blockNumber).to.be.greaterThan(10_000)
  })

  it("getBalance", async function () {
    const nullAddressBalance = await provider.getBalance(NULL_ADDRESS)
    expect(nullAddressBalance.gt(BigInt('1000000000000000000')))
  })

})
