const connectDB = require('./database');
const WalletWhitelist = require('./models/WalletWhitelist');
const Signal = require('./models/Signal');
const Member = require('./models/Member');
const Signals = require('./models/Signal');
const Members = require('./models/Member');
const MembershipKey = require('./models/MembershipKey')
const { bool } = require('@project-serum/borsh');

// Connect to Database
connectDB();

async function addWalletToWhitelist(address, lastPurchases) {
    const newWallet = new WalletWhitelist({
        walletAddress: address,
        lastPurchases: lastPurchases,
    });
    await newWallet.save();
};

async function getAllSignals() {
    const signals = await Signals.find({}).exec();
    return signals;
}

async function addPurchaseToWallet(address, purchase) {
    const wallet = await WalletWhitelist.findOne({"walletAddress": address}).exec();
    wallet.lastPurchases.push(purchase)
    await wallet.save();
}

async function getPurchasesForWallet(address) {
    const wallet = await WalletWhitelist.findOne({"walletAddress": address}).exec();
    return wallet.lastPurchases;
}

async function addSignal(signal) {
    const newSignal = await new Signals(signal)
    await newSignal.save();
}

async function removeWalletFromWhitelist(address) {
    await WalletWhitelist.findOneAndDelete({ walletAddress: address }).exec();
}

async function getAllWallets() {
    const wallets = await WalletWhitelist.find({}).exec();
    return wallets;
}

async function registerMember(telegramId) {
    const memberObj = {
        telegramId: telegramId,
        isSubscribed: false,
        subscriptionEndDate: null,
        subscriptionType: "",
        purchases: []
    };

    const member = new Members(memberObj);
    await member.save();
}

async function isDuplicateSignal(symbol) {
    const signals = await getAllSignals();
    let isDup = false;

    for (let signal of signals) {
        let signalTime = signal.time.getTime();  // getTime() gives the time in milliseconds
        let currentTime = Date.now();
        let tenHoursAgo = currentTime - (10 * 60 * 60 * 1000);  // 10 hours ago in milliseconds

        // Compare times directly in milliseconds
        let isWithin10Hours = signalTime >= tenHoursAgo;

        if (signal.tokenInfo.symbol === symbol && isWithin10Hours) {
            isDup = true;
            break;
        }
    }
    return isDup;
}

async function doesMemberExist(telegramId) {
    const member = await Member.findOne({telegramId: telegramId}).exec();
    if(member) {
        return true;
    } else {
        return false;
    }
}

async function getAllMembers() {
    const members = await Member.find({}).exec();
    return members
}

async function getAllMembersWithSubscription(subType) {
    const members = await Member.find({
        isSubscribed: true,
        subscriptionType: subType
    }).exec();

    const currentDate = new Date();

    // Filter out members whose subscription has ended and update their subscription status
    const validMembers = [];
    for (const member of members) {
        if (new Date(member.subscriptionEndDate) < currentDate) {
            await Member.updateOne({_id: member._id}, {
                $set: {isSubscribed: false}
            });
        } else {
            // Add to the validMembers array if the subscription is still active
            validMembers.push(member);
        }
    }

    return validMembers; // Return only members with valid subscriptions
}


async function getMember(telegramId) { 
    const member = await Member.findOne({telegramId: telegramId}).exec();
    return member;
}

async function addKey(key, days) {
    const newKey = new MembershipKey({
        key: key,
        days: days
    })
    await newKey.save();
}

async function getKey(key) {
    try {
        const foundKey = await MembershipKey.findOne({key: key});
        if(foundKey) {
            return foundKey;
        } else {
            return
        }
    } catch (error) {
        console.error(error); 
        return;
    }
}

async function redeemKey(telegramId, key) {
    try {
        let member = await getMember(telegramId);
        let membershipKey = await MembershipKey.findOne({ key: key });

        // Calculate the new subscription end date
        const currentEndDate = member.subscriptionEndDate ? new Date(member.subscriptionEndDate) : new Date();
        const additionalDays = membershipKey.days;
        currentEndDate.setDate(currentEndDate.getDate() + additionalDays);

        // Update member's subscription details
        await Member.updateOne({ telegramId: telegramId }, {
            $set: {
                isSubscribed: true,
                subscriptionType: "Pro",
                subscriptionEndDate: currentEndDate
            }
        });

        // Delete the key after use
        await MembershipKey.deleteOne({ key: key });

        return true;
    } catch (error) {
        console.error('Error redeeming key:', error);
        return false;
    }
}



module.exports = { getAllSignals, addWalletToWhitelist, removeWalletFromWhitelist, getAllWallets, addSignal, addPurchaseToWallet, getPurchasesForWallet, registerMember, isDuplicateSignal, doesMemberExist, getAllMembers, getMember, getKey, redeemKey, getAllMembersWithSubscription, addKey}