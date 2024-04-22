const mongoose = require('mongoose');

const SignalSchema = new mongoose.Schema({
    tokenInfo: {
        symbol: { 
            type: String, 
            required: true
        },
        name: {
            type: String,
            required: true
        },
        marketCap: {
            type: Number
        },
        liquidity: {
            type: Number
        },
        dayVolume: {
            type: Number
        },
        traders: {
            type: Number
        },
        contractAddress: {
            type: String
        }
    },
    amountPurchased: { 
        type: Number, 
        required: true
    },
    walletAddress: { 
        type: String,
        required: true 
    },
    time: { 
        type: Date,
        default: Date.now 
    },
});

module.exports = mongoose.model('Signal', SignalSchema);
