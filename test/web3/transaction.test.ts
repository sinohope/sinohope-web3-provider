import { expect } from "chai"
import { getWeb3SinohopeProviderForTesting } from "../utils"

const GREETER_ADDRESS = "0x10EFb91d6953279A8f26E1BBF4065a19D0B2a52D"
const GREETER_ABI = [
  {
    "type": "function",
    "name": "greet",
    "inputs": [],
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ]
  },
  {
    "type": "function",
    "name": "setGreeting",
    "inputs": [
      {
        "internalType": "string",
        "name": "_greeting",
        "type": "string"
      }
    ],
    "outputs": []
  }
] as const
const provider = getWeb3SinohopeProviderForTesting()
const greeting = (new Date()).toISOString()
// @ts-ignore
const greeterContract = new provider.eth.Contract(GREETER_ABI, GREETER_ADDRESS)

async function getFirstAddressWithBalance() {
  const addresses = await provider.eth.getAccounts()
  for (const address of addresses) {
    const balance = await provider.eth.getBalance(address)
    if (BigInt(balance) > BigInt(provider.utils.toWei('0.01', 'ether'))) {
      return address.toLowerCase()
    }
  }

  throw new Error(`No vault has balance`)
}

describe("Web3: Should be able to call a contract method", function () {
  this.timeout(600_000)

  it("greet() before", async function () {
    const currentGreeting = await greeterContract.methods.greet().call()

    expect(currentGreeting).to.not.be.equal(greeting)
  })

  it("setGreeting(greeting)", async function () {
    const receipt = await greeterContract.methods.setGreeting(greeting).send({ from: await getFirstAddressWithBalance() })

    expect(receipt.transactionHash).to.be.not.undefined
  })

  it("greet() after", async function () {
    const currentGreeting = await greeterContract.methods.greet().call()

    expect(currentGreeting).to.be.equal(greeting)
  })
})
