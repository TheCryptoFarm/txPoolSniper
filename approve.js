"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
var args = process.argv.slice(2);
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
const account = wallet.connect(provider);
const pcs = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const run = async () => {
  const sellAmount = ethers.utils.parseUnits(args[1], "gwei");
  const sellContract = new ethers.Contract(
    args[0],
    [
      "function approve(address _spender, uint256 _value) public returns (bool success)",
    ],
    account
  );
  console.log("Approving " + sellAmount + "(in gewi)"); 
  const tx = await sellContract.approve(pcs, sellAmount);
  const receipt = await tx.wait();
  console.log("Approved");
  console.log("Your txHash: " + receipt.transactionHash);
  process.exit();
};

if (!args[0] || !args[1]) {
  console.log(
    "Usge: node approve [token contract] [amount of tokens to approve to be sold]"
  );
  process.exit();
}
run();
