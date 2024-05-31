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

async function addWalletToWhitelist(address) {
    const newWallet = new WalletWhitelist({
        walletAddress: address
    });
    await newWallet.save();
};

async function getAllSignals() {
    const signals = await Signals.find({}).exec();
    return signals;
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

async function addWalletToUserWatchlist(telegramId, walletAddress) {
    try {
        const member = await getMember(telegramId);
        if(!member) {
            return "Member not found!";
        }

        // check to see if the user already has the wallet in their watching list
        for (let wallet of member.watching) {
            if(wallet.walletAddress === walletAddress) {
                return "You are already watching this wallet!";
            }
        }

        // Check to see if user has 3 wallets already
        if(member.watching.length >= 3) {
            return "You are already watching 3 wallets. Please remove a wallet before adding another.";
        }

        // Check to see if wallet exists in the WalletWhitelist
        const wallet = await WalletWhitelist.findOne({walletAddress: walletAddress});
        if(wallet) {
            return "Wallet is already being watched by SolSpy!";
        }

        let watching = member.watching;
        watching.push({walletAddress: walletAddress});
    
        await Member.updateOne({telegramId: telegramId}, {
            $set: {watching: watching}
        });

        return true;
    } catch (error) {
        console.error('Error adding wallet to user watchlist:', error);
        return "An unexpected error occured. Please contact admin.";
    }
}

async function removeWalletFromUserWatchlist(telegramId, walletAddress) {
    try {
        const member = await getMember(telegramId);
        if(!member) {
            return "Member not found!";
        }

        const watching = member.watching;
        let walletIndex = -1;
        for (let i = 0; i < watching.length; i++) {
            if(watching[i].walletAddress === walletAddress) {
                walletIndex = i;
                break;
            }
        }

        if(walletIndex === -1) {
            return "Wallet not found in your watchlist!";
        }

        watching.splice(walletIndex, 1);

        await Member.updateOne({telegramId: telegramId}, {
            $set: {watching: watching}
        });

        return true;
    } catch (error) {
        console.error('Error removing wallet from user watchlist:', error);
        return "An unexpected error occured. Please contact admin.";
    }
}

async function getAllUserWatchlistWallets() {
    const members = await getAllMembers();
    let wallets = [];
    for (let member of members) {
        for (let wallet of member.watching) {
            wallets.push(wallet);
        }
    }
    return wallets;
}

async function addIDtoSignalSellAlerts(wallet, symbol, userID) {
    try {
        // Find signal with wallet address and symbol descending in time
        const signal = await Signal.findOne({ walletAddress: wallet, 'tokenInfo.symbol': symbol }).sort({ time: -1 });
        if (!signal) {
            return false;
        }

        // Initialize sellAlerts array if it doesn't exist
        if (!Array.isArray(signal.sellAlerts)) {
            signal.sellAlerts = [];
        }

        // Check if userID is already in sellAlerts array to avoid duplicates
        if (!signal.sellAlerts.includes(userID)) {
            // Add user ID to signal's sellAlerts array
            signal.sellAlerts.push(userID);
            await signal.save();
        }

        return true;
    } catch (error) {
        console.error('Error adding userID to sellAlerts:', error);
        return false;
    }
}

async function getSellAlertsByWalletAndSymbol(wallet, contractAddress, amountSoldPercentage) {
    const signals = await Signal.find({ walletAddress: wallet, 'tokenInfo.contractAddress': contractAddress });
    
    // Get all the user ids subscribed to sell alerts
    let sellAlerts = [];
    for (let signal of signals) {
        if (signal.sellAlerts) {
            sellAlerts = sellAlerts.concat(signal.sellAlerts);
        }
    }

    for (let signal of signals) {
        // Update the sold field with the amount sold percentage
        const newAmt = (signal.sold + amountSoldPercentage <= 100) ? signal.sold + amountSoldPercentage : 100;
        signal.sold = newAmt;
        await signal.save();
    }

    return sellAlerts;
}

async function getSoldPercentage(wallet, contractAddress) {
    const signals = await Signal.find({ walletAddress: wallet, 'tokenInfo.contractAddress': contractAddress });
    if(signals.length === 0) {
        return 0;
    }

    if(signals[0].sold === undefined) {
        return 0;
    }

    return signals[0].sold;
}


module.exports = {
    getAllSignals,
    addWalletToWhitelist,
    getAllUserWatchlistWallets,
    addWalletToUserWatchlist,
    removeWalletFromUserWatchlist,
    removeWalletFromWhitelist,
    getAllWallets,
    addSignal,
    registerMember,
    isDuplicateSignal,
    doesMemberExist,
    getAllMembers,
    getMember,
    getKey,
    redeemKey,
    getAllMembersWithSubscription,
    addKey,
    addIDtoSignalSellAlerts,
    getSellAlertsByWalletAndSymbol,
    getSoldPercentage
};