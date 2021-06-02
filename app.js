"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const ethers = require("ethers");
const retry = require("async-retry");
const tokens = require("./tokens.js");

const purchaseAmount = ethers.utils.parseUnits(tokens.purchaseAmount, "ether");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const EXPECTED_PONG_BACK = 30000;
const KEEP_ALIVE_CHECK_INTERVAL = 15000;
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
const account = wallet.connect(provider);
const router = new ethers.Contract(tokens.router, pcsAbi, account);

const startConnection = () => {
  let pingTimeout = null;
  let keepAliveInterval = null;
  provider._websocket.on("open", () => {
    console.log("txPool sniping has begun...\n");
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

    provider.on("pending", async (txHash) => {
      provider.getTransaction(txHash).then(async (tx) => {
        if (tx && tx.to) {
          if (tx.to === tokens.router) {
            const re1 = new RegExp("^0xf305d719");
            const re2 = new RegExp("^0x267dd102");
            const re3 = new RegExp("^0xe8078d94");
            if (re1.test(tx.data) || re2.test(tx.data) || re3.test(tx.data)) {
              const decodedInput = pcsAbi.parseTransaction({
                data: tx.data,
                value: tx.value,
              });
              if (tokens.pair[1] === decodedInput.args[0]) {
                await BuyToken(tx);
              }
            }
          }
        }
      });
    });
  });

  provider._websocket.on("close", () => {
    console.log("WebSocket Closed...Reconnecting...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("error", () => {
    console.log("Error. Attemptiing to Reconnect...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("pong", () => {
    clearInterval(pingTimeout);
  });
};

const BuyToken = async (txLP) => {
  const tx = await retry(
    async () => {
      const amounts = await router.getAmountsOut(purchaseAmount, tokens.pair);
      const amountOutMin = amounts[1].sub(amounts[1].div(tokens.slippage));
      let buyConfirmation =
        await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
          amountOutMin,
          tokens.pair,
          process.env.RECIPIENT,
          Date.now() + 1000 * 60 * 5, //5 minutes
          {
            value: purchaseAmount,
            gasLimit: txLP.gasLimit,
            gasPrice: txLP.gasPrice,
          }
        );
      return buyConfirmation;
    },
    {
      retries: 5,
      minTimeout: 10000,
      maxTimeout: 15000,
      onRetry: (err, number) => {
        console.log("Buy Failed - Retrying", number);
        console.log("Error", err);
        if (number === 5) {
          console.log("Sniping has failed...");
          process.exit();
        }
      },
    }
  );
  console.log("Waiting for Transaction receipt...");
  const receipt = await tx.wait();
  console.log("Token Purchase Complete");
  console.log("Associated LP Event txHash: " + txLP.hash);
  console.log("Your txHash: " + receipt.transactionHash);
  process.exit();
};
startConnection();
