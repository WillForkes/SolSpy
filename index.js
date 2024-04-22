const web3 = require('@solana/web3.js');
const { fetchAndDecodeTransactions } = require('./utility/transactionDecoder');
const { addWalletToWhitelist, removeWalletFromWhitelist, getAllWallets } = require('./utility/databaseInterface');

const prompt = require('prompt');

async function main() {    
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const wallets = await getAllWallets();

    for(let i=0; i<wallets.length; i++) {
        try {
            const wa = wallets[i].walletAddress;
            const walletAddress = new web3.PublicKey(wa);

            const version = await connection.getVersion();
            console.log('Cluster version:', version);

            const subscriptionId = connection.onAccountChange(walletAddress, (accountInfo, context) => {
                fetchAndDecodeTransactions(walletAddress)
            }, 'confirmed');

            console.log('Listening to wallet changes. Subscription ID:', subscriptionId);

            
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
});
