const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    telegramId: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    isSubscribed: Boolean,
    subscriptionEndDate: Date,
    subscriptionType: String, // Pro, Elite
    watching: [{
        walletAddress: String,
    }]
});

module.exports = mongoose.model('Member', MemberSchema);
