"use strict";
const env = require("./env.json");
const {Command} = require("commander");
const program = new Command();

Object.assign(process.env, env);

const ethers = require("ethers");
const retry = require("async-retry");
const tokens = require("./tokens.js");

const tokenToTransact = tokens.pair[1];
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

const startConnection = (buyOrSellAction) => {
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
              if (
                ethers.utils.getAddress(tokens.pair[1]) === decodedInput.args[0]
              ) {
                await buyOrSellAction(tx);
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
    console.log("Error. Attempting to Reconnect...");
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
      // sell all
      const amounts = await router.getAmountsIn(0, tokens.pair);
      const amountInMin = amounts[0].sub(amounts[0].div(tokens.slippage));
      let sellConfirmation =
        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amountInMin,
          tokens.pair,
          process.env.RECIPIENT,
          Date.now() + 1000 * 60 * 5, //5 minutes
          {
            value: purchaseAmount,
            gasLimit: txLP.gasLimit,
            gasPrice: txLP.gasPrice,
          }
        );
      return sellConfirmation;
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
  console.log("Token Sell Complete");
  console.log("Associated LP Event txHash: " + txLP.hash);
  console.log("Your txHash: " + receipt.transactionHash);
  process.exit();
};

const SellToken = async (txLP) => {
  const tx = await retry(
    async () => {
      const amounts = await router.getAmountsOut(purchaseAmount, tokens.pair, {
        gasLimit: txLP.gasLimit,
        gasPrice: txLP.gasPrice,
      });
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
program
.version('0.0.1', '-v, --version')
.command('buy [token]')
.description('buy token by 0x address, defaults to value in tokens.js: ' + tokenToTransact) // tokenToTransact)
.action((token) => {
  if (token == undefined) {
    token = tokenToTransact;
  }
  tokens.pair[1] = token;
  console.log('Will attempt to buy ' + token);
  startConnection(BuyToken);
});

program
.command('sell [token]')
.description('sell token by 0x address, defaults to value in tokens.js: ' + tokenToTransact) // , tokenToTransact);
.action((token) => {
  if (token == undefined) {
    token = tokenToTransact;
  }
  console.log('Will attempt to sell ' + token);
  tokens.pair[1] = token;
  startConnection(SellToken);
});

program.parse(process.argv);

const options = program.opts();

console.log(options);

