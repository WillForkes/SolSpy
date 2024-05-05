const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    telegramId: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    isSubscribed: Boolean,
    subscriptionEndDate: Date,
    subscriptionType: String, // 2-3 tiers?
    purchases: [
        {
            time: Date,
            transactionId: String,
            coin: String,
            amount: Number
        }
    ]
});

module.exports = mongoose.model('Member', MemberSchema);
