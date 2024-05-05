
const web3 = require('@solana/web3.js');
const { checkWallet } = require('./solana/transactionDecoder');
const { addKey, addWalletToWhitelist, getAllWallets } = require('./database/databaseInterface');
const { startBot } = require("./telegram/bot");
const { loadNewKeys, loadNewWallets } = require("./load_new_data");
const prompt = require('prompt');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {    
    console.log("Loading new keys/wallets...")
    const newWallets = await loadNewWallets();
    const newKeys = await loadNewKeys();

    for(wallet of newWallets) {
        await addWalletToWhitelist(wallet, []);
    }
    for(key of newKeys) {
        await addKey(key.key, key.days);
    }

    console.log("New data loaded.")
    

    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const wallets = await getAllWallets();
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
}

main().catch(err => {
    console.error('Unhandled error:', err);
});
