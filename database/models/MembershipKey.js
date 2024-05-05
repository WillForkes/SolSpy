const mongoose = require('mongoose');

const MembershipKey = new mongoose.Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true 
    },
    days: Number
});

module.exports = mongoose.model('MembershipKey', MembershipKey);
