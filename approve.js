"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
var args = process.argv.slice(2);
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);
const pcs = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const run = async () => {
  const sellContract = new ethers.Contract(
    args[0],
    [
      "function approve(address _spender, uint256 _value) public returns (bool success)",
      "function name() external pure returns (string memory)",
    ],
    account
  );
  const tokenName = await sellContract.name();
  const tx = await sellContract.approve(pcs, ethers.constants.MaxUint256);
  const receipt = await tx.wait();
  console.log("Approved " + tokenName);
  console.log("Your txHash: " + receipt.transactionHash);
  process.exit();
};
if (!args[0]) {
  console.log("Usage: node approve [token contract]");
  process.exit();
}
run();
