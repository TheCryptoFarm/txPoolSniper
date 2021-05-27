"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
const account = wallet.connect(provider);

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
    "0xEebCfa94D165B4e6dcb3cddC3e1438e349d06b19" // token of LP you want to lookup
  );
  console.log("pairAddress: " + pairAddress);
  process.exit();
};
run();
