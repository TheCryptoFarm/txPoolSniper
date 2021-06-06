"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);
var args = process.argv.slice(2);
const pair = new ethers.Contract(
  args[0],
  [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  ],
  account
);
const run = async () => {
  const reserves = await pair.getReserves();
  console.log("Result: " + reserves);
  process.exit();
};
if (!args[0]) {
  console.log("Usage: node getReserves [Cake LP Pair]");
  process.exit();
}
run();
