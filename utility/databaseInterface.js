const connectDB = require('../database/database');
const WalletWhitelist = require('../database/models/WalletWhitelist');
const Signal = require('../database/models/Signals');
const Member = require('../database/models/Members');

// Connect to Database
connectDB();

async function addWalletToWhitelist(address, lastPurchases) {
        //     walletAddress: { 
    //         type: String, 
    //         required: true, 
    //         unique: true 
    //     },
    //     lastPurchases: [{
    //         symbol: String,
    //         name: String,
    //         time: Date,
    //         highestPrice: Number
    //     }]
    // });
    try {
        const newWallet = new WalletWhitelist({
            walletAddress: address,
            lastPurchases: lastPurchases,
        });
        await newWallet.save();
        console.log('Wallet added to whitelist');
    } catch (error) {
        console.log(error)
    }
};

async function removeWalletFromWhitelist(address) {
    try {
        await WalletWhitelist.findOneAndDelete({ walletAddress: address });
    } catch (error) {
        console.error(`Error removing wallet from whitelist: ${error}`);
        throw error;
    }
}

async function getAllWallets() {
    try {
        const wallets = await WalletWhitelist.find({});
        return wallets;
    } catch (error) {
        console.error('Failed to retrieve wallets:', error);
        throw error;
    }
}

module.exports = { addWalletToWhitelist, removeWalletFromWhitelist, getAllWallets }