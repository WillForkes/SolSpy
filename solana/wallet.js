const { option } = require('@project-serum/borsh');
const web3 = require('@solana/web3.js');
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; // SPL Token Program ID
const { getLastFourTokenPurchases } = require('./transactionFetcher');
const { calculatePriceIncrease } = require('./priceTracker');
const { getPurchasesForWallet } = require ('../database/databaseInterface.js')

async function updatePurchases(walletAddress) {
    const purchases = await getPurchasesForWallet(walletAddress);

    for(let i=0; i<purchases.length; i++) {
        // Get highest price of token since purchase data
        
    }
}


module.exports = { analyzeWallet }