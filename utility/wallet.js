const web3 = require('@solana/web3.js');

async function analyzeWallet(walletAddress) {
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const pubkey = new web3.PublicKey(walletAddress);
    const accountInfo = await connection.getAccountInfo(pubkey);
    const balance = await connection.getBalance(pubkey);

    console.log(`Wallet balance: ${balance} lamports (${balance / web3.LAMPORTS_PER_SOL} SOL)`);
    // Further analysis can be added here
}


module.exports = { analyzeWallet }