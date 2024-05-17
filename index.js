
const web3 = require('@solana/web3.js');
const { checkWallet } = require('./solana/transactionDecoder');
const { addKey, getAllUserWatchlistWallets, getAllWallets } = require('./database/databaseInterface');
const { startBot } = require("./telegram/bot");
const { loadNewKeys } = require("./load_new_data");
const { startTrackingPrices } = require('./statistics/getStats');
const { syncWalletAddress } = require('./solana/walletTracker');

const cron = require('node-cron');
require('dotenv').config();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {    
    console.log("Loading new keys...")
    const newKeys = await loadNewKeys();

    for(key of newKeys) {
        await addKey(key.key, key.days);
    }
    
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    let wallets = await getAllWallets();
    const userWatchlistWallets = await getAllUserWatchlistWallets();
    console.log('Adding watchlist wallets:', userWatchlistWallets.length);
    wallets.push(...userWatchlistWallets);

    const version = await connection.getVersion();
    console.log('Cluster version:', version);
    
    //telegram
    startBot();

    // queue
    const queue = [];
    async function processQueue() {
        while (queue.length > 0) {
            const walletAddress = queue.shift();
            checkWallet(walletAddress);
            // Delay for 333 milliseconds (approximately 3 calls per second)
            await delay(400);
        }
    }

    for (let i = 0; i < wallets.length; i++) {
        try {
            const wa = wallets[i].walletAddress;
            const walletAddress = new web3.PublicKey(wa);

            const subscriptionId = connection.onAccountChange(walletAddress, (accountInfo, context) => {
                queue.push(walletAddress);

                // Start processing the queue if not already started
                if (queue.length === 1) {
                    processQueue();
                }

            }, 'confirmed');

            console.log(`[${wa}] Subscription ID: ${subscriptionId}`);

        } catch (error) {
            console.error('Error:', error);
        }
    }

    console.log("Syncing wallet addresses...")
    for(wallet of wallets) {
        syncWalletAddress(wallet.walletAddress);
        console.log("Syncing wallet addresses: ", wallet.walletAddress)
        await delay(2000);
    }
    console.log("Finished syncing wallet addresses!")

}

if(process.env.NODE_ENV !== 'development') {
    cron.schedule('*/5 * * * *', () => {
        console.log('Running stat tracker...');
        startTrackingPrices().then(() => {
            console.log('Statistics run completed. CSV file updated.');
        }).catch(error => {
            console.error('Error gathering statistics:', error);
        });
    });
}

main().catch(err => {
    console.error('Unhandled error:', err);
});
