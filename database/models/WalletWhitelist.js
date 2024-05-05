const mongoose = require('mongoose');

const WalletWhitelistSchema = new mongoose.Schema({
    walletAddress: { 
        type: String, 
        required: true, 
        unique: true 
    },
    lastPurchases: [{
        symbol: String,
        name: String,
        time: Date,
        priceAtPurchase: Number,
        highestPrice: Number
    }]
});

module.exports = mongoose.model('WalletWhitelist', WalletWhitelistSchema);
