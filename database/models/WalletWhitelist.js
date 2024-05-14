const mongoose = require('mongoose');

const WalletWhitelistSchema = new mongoose.Schema({
    walletAddress: { 
        type: String, 
        required: true, 
        unique: true 
    }
});

module.exports = mongoose.model('WalletWhitelist', WalletWhitelistSchema);
