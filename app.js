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
let pingTimeout = null;
let keepAliveInterval = null;
let provider;
let wallet;
let account;
let router;
let shotsFired = 0;

const startConnection = () => {
  provider = new ethers.providers.WebSocketProvider(process.env.BSC_NODE_WSS);
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  account = wallet.connect(provider);
  router = new ethers.Contract(tokens.router, pcsAbi, account);

  provider._websocket.on("open", () => {
    console.log(
      "txPool sniping has begun...patience is a virtue, my grasshopper..\n"
    );
    tokens.router = ethers.utils.getAddress(tokens.router);
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
      if (shotsFired === 0) {
        provider
          .getTransaction(txHash)
          .then(async (tx) => {
            if (tx && tx.to) {
              if (tx.to === tokens.router) {
                const re = new RegExp("^0xf305d719");
                if (re.test(tx.data)) {
                  const decodedInput = pcsAbi.parseTransaction({
                    data: tx.data,
                    value: tx.value,
                  });
                  if (
                    ethers.utils.getAddress(tokens.pair[1]) ===
                    decodedInput.args[0]
                  ) {
                    shotsFired = 1;
                    await BuyToken(tx);
                  }
                }
              }
            }
          })
          .catch(() => {});
      }
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
      const amountOutMin = 0; // I don't like this but it works
      let buyConfirmation =
        await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
          amountOutMin,
          tokens.pair,
          process.env.RECIPIENT,
          Date.now() + 1000 * 60 * 1, //1 minute
          {
            value: purchaseAmount,
            gasLimit: txLP.gasLimit,
            gasPrice: txLP.gasPrice,
          }
        );
      return buyConfirmation;
    },
    {
      retries: 2,
      minTimeout: 10000,
      maxTimeout: 15000,
      onRetry: (err, number) => {
        console.log("Buy Failed - Retrying", number);
        console.log("Error", err);
        if (number === 2) {
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
