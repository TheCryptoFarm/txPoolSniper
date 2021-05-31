const tokens = {
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  purchaseAmount: "0.01",
  pair: [
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE
  ],
  slippage: "1",
};
module.exports = tokens;

/*

If targeted token is paired with BNB, then only change the second
"pair" array item to the checksum address of the token you wish to snipe

If targeted token is paried with BUSD, then you will need to change
both "pair" array items, the first item being BUSD and the second 
with the checksum address of the token you wish to snipe 

"0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" // BUSD Mainnet

### TESTNET ### 

Change the first item in pair array
    "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // WBNB Testnet

Change the router
    "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"; // PCSv2 Router Testnet
 
*/
