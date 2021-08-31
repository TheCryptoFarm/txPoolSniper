const tokens = {
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PCSv2 Router Mainnet
  purchaseAmount: "0.01",
  pair: [
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE
  ],
  gasLimit: "1000000",
  gasPrice: "5",
  buyDelay: 1,
  buyRetries: 3,
  retryMinTimeout: 250,
  retryMaxTimeout: 3000,
  deadline: 60,
};
module.exports = tokens;

/*

The targeted token needs to be in second position of the pair array

Currently only WBNB Pairs are supported - Pull requests welcome :)

### BSC Testnet Usage ### 

Change the first item in pair array
    "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // WBNB Testnet

Change the router
    "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"; // PCSv2 Router Testnet
 
Then use https://pancake.kiemtienonline360.com/#/

*/
