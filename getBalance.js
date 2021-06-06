"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);

const run = async () => {
  const balance = await provider.getBalance(process.env.RECIPIENT);
  console.log(ethers.utils.formatEther(balance));
  process.exit();
};
run();
