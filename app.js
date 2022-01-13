"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const retry = require("async-retry");
const tokens = require("./tokens.js");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const tokenAbi = new ethers.utils.Interface(require("./tokenABI.json"));
const EXPECTED_PONG_BACK = 30000;
const KEEP_ALIVE_CHECK_INTERVAL = 15000;
let pingTimeout = null;
let keepAliveInterval = null;
let provider;
let wallet;
let account;
let router;
let grasshopper;
let swapEth;
let purchaseAmount;

async function Wait(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

const startConnection = () => {
  provider = new ethers.providers.WebSocketProvider(process.env.BSC_NODE_WSS);
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  account = wallet.connect(provider);
  router = new ethers.Contract(tokens.router, pcsAbi, account);
  
  grasshopper = 0;
  provider._websocket.on("open", async () => {
    console.log(
      "🏗️  txPool sniping has begun...patience is a virtue, my grasshopper..."
    );
    keepAliveInterval = setInterval(() => {
      provider._websocket.ping();
      // Use `WebSocket#terminate()`, which immediately destroys the connection,
      // instead of `WebSocket#close()`, which waits for the close timer.
      // Delay should be equal to the interval at which your server
      // sends out pings plus a conservative assumption of the latency.
      pingTimeout = setTimeout(() => {
        provider._websocket.terminate();
      }, EXPECTED_PONG_BACK);
    }, KEEP_ALIVE_CHECK_INTERVAL);
    const WETH = await router.WETH();
    if (ethers.utils.getAddress(tokens.pair[0]) === ethers.utils.getAddress(WETH)) {
      swapEth = 1;
      purchaseAmount = ethers.utils.parseUnits(tokens.purchaseAmount, "ether");
    } else {
      await Approve();
    }
  });

  provider.on("pending", async (txHash) => {
    provider
      .getTransaction(txHash)
      .then(async (tx) => {
        if (grasshopper === 0) {
          console.log("🚧  And, Yes..I am actually working...trust me...");
          grasshopper = 1;
        }
        if (tx && tx.to) {
          if (ethers.utils.getAddress(tx.to) === 
              ethers.utils.getAddress(tokens.router)){
            const re1 = new RegExp("^0xf305d719");
            const re2 = new RegExp("^0xe8e33700");
            if (re1.test(tx.data) || re2.test(tx.data)) {
              const decodedInput = pcsAbi.parseTransaction({
                data: tx.data,
                value: tx.value,
              });
              if (
                ethers.utils.getAddress(tokens.pair[1]) ===
                ethers.utils.getAddress(decodedInput.args[0]) ||
                ethers.utils.getAddress(tokens.pair[1]) ===
                ethers.utils.getAddress(decodedInput.args[1])
              ) {
                provider.off("pending");
                if (tokens.buyDelay > 0) {
                  await Wait(tokens.buyDelay);
                }
                await BuyToken(tx);
              }
            }
          }
        }
      })
      .catch(() => {});
  });

  provider._websocket.on("close", () => {
    console.log("☢️ WebSocket Closed...Reconnecting...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("error", () => {
    console.log("☢️ Error. Attemptiing to Reconnect...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("pong", () => {
    clearInterval(pingTimeout);
  });
};

const Approve = async () => {
  const contract = new ethers.Contract(
    tokens.pair[0],
    tokenAbi,
    account
  );
  const tokenName = await contract.name();
  const tokenDecimals = await contract.decimals();
  purchaseAmount = ethers.utils.parseUnits(tokens.purchaseAmount, tokenDecimals);
  const allowance = await contract.allowance(process.env.RECIPIENT, tokens.router);
  if (allowance._hex === "0x00") {
    const tx = await contract.approve(tokens.router, ethers.constants.MaxUint256);
    const receipt = await tx.wait();
    console.log(`🎟️  Approved ${tokenName} for swapping... ${receipt.transactionHash}`);
  }
};

const BuyToken = async (txLP) => {
  const tx = await retry(
    async () => {
      const amountOutMin = 0; // I don't like this but it works
      if (swapEth) {
        const reciept = await router.swapExactETHForTokens(
          amountOutMin,
          tokens.pair,
          process.env.RECIPIENT,
          Date.now() + 1000 * tokens.deadline,
          {
            value: purchaseAmount,
            gasLimit: tokens.gasLimit,
            gasPrice: txLP.gasPrice,
          }
        );
        return reciept;
      } else {
        const reciept = await router.swapExactTokensForTokens(
          purchaseAmount,
          amountOutMin,
          tokens.pair,
          process.env.RECIPIENT,
          Date.now() + 1000 * tokens.deadline,
          {
            gasLimit: tokens.gasLimit,
            gasPrice: txLP.gasPrice,
          }
        );
        return reciept;
      }
    },
    {
      retries: tokens.buyRetries,
      minTimeout: tokens.retryMinTimeout,
      maxTimeout: tokens.retryMaxTimeout,
      onRetry: (err, number) => {
        console.log("💰 Buy Failed - Retrying", number);
        console.log(err);
        if (number === tokens.buyRetries) {
          console.log("☢️ Sniping has failed...");
          process.exit();
        }
      },
    }
  );
  console.log("💰 LP: " + txLP.hash);
  console.log("🔫 Sniped: " + tx.hash);
  process.exit();
};
startConnection();
