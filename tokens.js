const tokens = {
  router: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3", // PCSv2 Router Testnet
  purchaseAmount: "0.01",
  pair: [
    "0xae13d989dac2f0debff460ac112a837c89baa7cd", // WBNB
    "0x8babbb98678facc7342735486c851abd7a0d17ca", // ETH
  ],
  gasLimit: "2000000",
  gasPrice: "5",
  buyDelay: 1,
  buyRetries: 3,
  retryMinTimeout: 250,
  retryMaxTimeout: 3000,
  deadline: 30,
};
module.exports = tokens;

/*
 BSC Mainnet:

  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PCSv2 Router Mainnet
  pair: [
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB [from]
    "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE [to]
  ],

If pair[0] is WBNB we assume you are going to snipe using Ether value (BNB)
                        ---NOT--- "WBNB Token"

If pair[0] is say BUSD or USDT (and others), we will approve token for sale on router
before starting to snipe.

purchaseAmount is in pair[0] token

The targeted token needs to be in second position of the pair array

### BSC Testnet Usage ### 

Change the first item in pair array
    "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // WBNB Testnet

Change the router
    "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"; // PCSv2 Router Testnet
 
Then use see https://bsc.kiemtienonline360.com/ for swapping sites / tokens
    and https://moralis.io/ for a testnet Websocket

*/
