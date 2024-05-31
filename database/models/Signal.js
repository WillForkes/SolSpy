const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SignalSchema = new Schema({
    tokenInfo: {
        symbol: String,
        name: String,
        analysis: {
            mintAuthority: String,
            freezeAuthority: String,
            risks: [{
                name: String,
                value: String,
                description: String,
                score: Number,
                level: String
            }],
            score: Number,
            rugged: Boolean
        },
        decimals: Number,
        supply: Number,
        price: Number,
        liquidity: Number,
        dayVolume: Number,
        marketCap: Number,
        contractAddress: String
    },
    amountPurchased: Number,
    walletAddress: String,
    time: Date,
    sellAlerts: [String],
    sold: Number
});


module.exports = model('Signal', SignalSchema);
