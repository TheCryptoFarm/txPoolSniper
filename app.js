"use strict";
const env = require("./env.json");
Object.assign(process.env, env);

const Util = require("util");
const ethers = require("ethers");

const purchaseToken = process.env.PURCHASE_TOKEN;
const purchaseAmount = ethers.utils.parseUnits(
  process.env.PURCHASE_AMOUNT,
  "ether"
);
const slippage = process.env.SLIPPAGE;
const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB
const pcs = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PCSv2 Router
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const EXPECTED_PONG_BACK = 30000;
const KEEP_ALIVE_CHECK_INTERVAL = 15000;
const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
const account = wallet.connect(provider);
const router = new ethers.Contract(pcs, pcsAbi, account);

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
          if (tx.to === pcs) {
            let re = new RegExp("^0xf305d719");
            if (re.test(tx.data)) {
              const decodedInput = pcsAbi.parseTransaction({
                data: tx.data,
                value: tx.value,
              });
              if (purchaseToken === decodedInput.args[0]) {
                await BuyToken(txHash);
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

const BuyToken = async (txHash) => {
  const amounts = await router.getAmountsOut(purchaseAmount, [
    wbnb,
    purchaseToken,
  ]);
  const amountOutMin = amounts[1].sub(amounts[1].div(slippage));
  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    [wbnb, purchaseToken],
    process.env.RECIPIENT,
    Date.now() + 1000 * 60 * 5, //5 minutes
    {
      value: purchaseAmount,
      gasLimit: 345684,
      gasPrice: ethers.utils.parseUnits("6", "gwei"),
    }
  );
  await tx.wait();
  console.log("Token Purchase Complete");
  console.log("LP Event txHash: " + txHash);
  process.exit();
};
startConnection();
