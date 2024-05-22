
const web3 = require('@solana/web3.js');
const { checkWallet } = require('./solana/transactionDecoder');
const { addKey, getAllUserWatchlistWallets, getAllWallets } = require('./database/databaseInterface');
const { loadNewKeys } = require("./load_new_data");
const { startTrackingPrices } = require('./statistics/getStats');
const { syncWalletAddress } = require('./solana/walletTracker');
const cron = require('node-cron');
require('dotenv').config();
const bot = require('./telegram/bot');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // * Load new keys
    const newKeys = await loadNewKeys();
    for(key of newKeys) { await addKey(key.key, key.days); }
    if(newKeys.length > 0) {console.log(`Added ${newKeys.length} new keys to the database.`);}

    // * Connect to cluster
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

    // * Get all wallets to watch
    let wallets = await getAllWallets();
    const userWatchlistWallets = await getAllUserWatchlistWallets();
    console.log('Adding watchlist wallets:', userWatchlistWallets.length);
    wallets.push(...userWatchlistWallets);
    
    // * Start telegram bot
    require('./telegram/handlers/loadHandlers');
    bot.launch();
    console.log('[TELEGRAM] Bot online!');

    // * Create queue function
    const queue = [];
    async function processQueue() {
        while (queue.length > 0) {
            const walletAddress = queue.shift();
            checkWallet(walletAddress);
            // Delay for 333 milliseconds (approximately 3 calls per second)
            await delay(400);
        }
    }

    // * Subscribe to all wallets
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
        } catch (error) {
            console.error('Error:', error);
        }
    }
    console.log(`Subscribed to ${wallets.length} wallets | ${userWatchlistWallets.length} - watchlist | ${wallets.length - userWatchlistWallets.length} - normal wallets.`);

    // * Sync wallet addresses (production only)
    if(process.env.NODE_ENV !== 'development') {
        console.log("Syncing wallet addresses...")
        for(wallet of wallets) {
            syncWalletAddress(wallet.walletAddress);
            console.log("Syncing wallet addresses: ", wallet.walletAddress)
            await delay(2000);
        }
        console.log("Finished syncing wallet addresses!")
    }
}

// * Run statistics tracker every 5 minutes
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
