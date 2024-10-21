import { expect } from "chai"
import * as ethers from "ethers"
import { getEthersSinohopeProviderForTesting } from "../utils"

const transferAmount = ethers.utils.parseUnits("0.00001", 18) //6 for assetid=usdt
const minAmount = ethers.utils.parseEther("0.001")
const provider = getEthersSinohopeProviderForTesting({logRequestsAndResponses:false})

async function getFirstAddressWithBalance() {
  const addresses = await provider.listAccounts()
  for (const address of addresses) {
    const balance = await provider.getBalance(address)
    if (balance.gt(minAmount)) {
      return address.toLowerCase()
    }
  }

  throw new Error(`No vault has balance greater than ${transferAmount.toString()}`)
}

describe("Ethers: Should be able to transfer ETH", function () {
  this.timeout(600_000)

  it("Transfer", async function () {
    const addresses = await provider.listAccounts()

    const firstAddressWithBalance = await getFirstAddressWithBalance()
    let toAddress = addresses.find(x => x.toLowerCase() != firstAddressWithBalance)

    if (!toAddress) {
      throw new Error('No toAddress found')
    }
    
    const fromSigner = provider.getSigner(firstAddressWithBalance)
    const toAddressStartingBalance = await provider.getBalance(toAddress)
    console.log(firstAddressWithBalance, toAddress, toAddressStartingBalance, transferAmount.toString())

    const transferTransaction = await fromSigner.sendTransaction({
      to: toAddress,
      value: transferAmount,
    })
    await transferTransaction.wait()

    const toAddressEndingBalance = await provider.getBalance(toAddress)

    expect(toAddressEndingBalance.eq(toAddressStartingBalance.add(transferAmount)))
  })

})
