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

const run = async () => {
  const factory = new ethers.Contract(
    "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    [
      "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    ],
    account
  );
  const pairAddress = await factory.getPair(
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // wbnb
    args[0]
  );
  console.log("pairAddress: " + pairAddress);
  process.exit();
};
if (!args[0]) {
  console.log("Usage: node getPair [token contract]");
  process.exit();
}
run();
