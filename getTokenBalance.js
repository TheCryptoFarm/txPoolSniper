"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

var args = process.argv.slice(2);
const ethers = require("ethers");
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);
const sellContract = new ethers.Contract(
  args[0],
  [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() view returns (uint8)",
  ],
  account
);

const run = async () => {
  const balance = await sellContract.balanceOf(process.env.RECIPIENT);
  const decimals = await sellContract.decimals();
  console.log(ethers.utils.formatUnits(balance, decimals));
  process.exit();
};
if (!args[0]) {
  console.log("Usage: node getTokenBalance [token contract]");
  process.exit();
}
run();
