const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    telegramId: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    subscriptionEndDate: { 
        type: Date
    },
    subscriptionType: { 
        type: String, 
        required: true 
    },
    purchases: [{
        time: {
            type: Date
        },
        transaction: {
            type: String
        },
        coin: {
            type: String
        },
        amount: {
            type: Number
        }
    }]
});

module.exports = mongoose.model('Member', MemberSchema);
