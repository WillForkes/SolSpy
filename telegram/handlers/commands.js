const bot = require('../bot');
const { doesMemberExist, registerMember, getMember, getAllSignals } = require("../../database/databaseInterface");
const DataTable = require('../../statistics/table');
const { getSignal } = require('../../database/databaseInterface');

// ! BOT COMMAND //////////
bot.start(async (ctx) => {
    try {
        const telegramId = ctx.from.id.toString();
        const isMemberExist = await doesMemberExist(telegramId);

        if (!isMemberExist) {
            await registerMember(telegramId)
        }

        const member = await getMember(telegramId);

        if(member.isSubscribed) {
            const startMenuText = `👁️ *Sol Spy* 👁️

Welcome back! We are the #1 Solana wallet spy bot on telegram. This bot provides buy signals from profitable wallets as they happen in real time whilst offering a range of tools to help you make a profit.

*Signals will be sent to you automatically*

🔗 [Our website](https://solspy.billgang.store/)

💎 Your subscription: ${member.subscriptionType}
⏰ Ends on: ${member.subscriptionEndDate.toString()}`;
            
            ctx.reply(startMenuText, { 
                parse_mode: 'Markdown', 
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Extend subscription', url: 'https://solspy.billgang.store/' }],
                        [{ text: 'Redeem Key', callback_data: 'redeem' }]                        
                    ]
                }
            });
        } else {
            const startMenuText = `👁️ *Sol Spy* 👁️

Welcome to Sol Spy! We are the #1 Solana wallet spy bot on telegram. This bot provides buy signals from profitable wallets as they happen in real time whilst offering a range of tools to help you make a profit.

🔗 [Our website](https://solspy.billgang.store/)

Our current pricing packages:
∟ *$30* - 1 week
∟ *$80* - 1 month
∟ *$200* - 3 month

_To get access to the bot, please select an option below._
            `;

        ctx.reply(startMenuText, { 
            parse_mode: 'Markdown', 
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Buy Subscription', url: 'https://solspy.billgang.store/' }],
                    [{ text: 'Redeem Key', callback_data: 'redeem' }]
                    
                ]
            }
        });
        }
    } catch (error) {
        console.error("[TELEGRAM] Error in start command:", error);
        ctx.reply("An error occurred.");
    }
});

bot.command('redeem', (ctx) => ctx.scene.enter('redeemScene'));

bot.command('add_wallet', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.isSubscribed) {  
        ctx.scene.enter('addWalletScene');
    } else {
        ctx.reply('You need to be subscribed to use this feature. Please buy a subscription first.');
    }
});

bot.command('remove_wallet', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.isSubscribed) {
        ctx.scene.enter('removeWalletScene');
    } else {
        ctx.reply('You need to be subscribed to use this feature. Please buy a subscription first.');
    }
});

bot.command('watchlist', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.isSubscribed) {
        if(member.watching.length === 0) {
            ctx.reply('You are not watching any wallets.');
            return;
        }
        const watchingList = member.watching.map(wallet => wallet.walletAddress).join('\n');
        ctx.reply(`👀 **Your current watchlist** 👀
${watchingList}`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply('You need to be subscribed to use this feature. Please buy a subscription first.');
    }
});


bot.command('broadcast', async (ctx) => {
    // Check if the user is an admin
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.subscriptionType !== "Admin") {
        ctx.reply('You do not have permission to use this command.');
        return;
    }

    ctx.scene.enter('broadcastScene');
})

bot.command('add_days', async (ctx) => {
    // Check if the user is an admin
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.subscriptionType !== "Admin") {
        ctx.reply('You do not have permission to use this command.');
        return;
    }

    ctx.scene.enter('addDaysScene');
})

bot.command('signal', async (ctx) => {
    // Check if the user is an admin
    const telegramId = ctx.from.id.toString();
    const member = await getMember(telegramId);

    if(member.subscriptionType !== "Admin") {
        ctx.reply('You do not have permission to use this command.');
        return;
    }

    ctx.scene.enter('signalScene');
})

bot.command('stats' , async (ctx) => {

    const dt = new DataTable();

    //! TEMP - ADD TIMESTAMP TO ALL ENTRIES FROM SIGNAL DATABASE ACTUAL TIME
    // for(let i=0; i<dt.data.length; i++) {
    //     // Get signal from database
    //     const signal = await getSignal(dt.data[i][2]);
        
    //     // Add timestamp to entry
    //     // convert datetime to unix timestamp
    //     dt.data[i][8] = parseInt(signal.time.getTime() / 1000);
    // }

    // dt.exportToCSV();
    
    const winnerData = dt.data;
    const last10Calls = winnerData.sort((a, b) => {
        return b[8] - a[8];
    });

    // Calculate the last 10 winners
    const winners = last10Calls.slice(0, 10).map(entry => {
        const initialPrice = parseFloat(entry[3]);
        const highestPrice = parseFloat(entry[6]);
        const percentageIncrease = ((highestPrice - initialPrice) / initialPrice) * 100;
        const percentageIncreaseRounded = Math.round(percentageIncrease * 100) / 100;

        return {symbol: entry[1], percentageIncrease: percentageIncreaseRounded};
    });

    // Search in DB for the last 10 signals
    const signals = await getAllSignals();
    signals.sort((a, b) => {
        return b.time - a.time;
    });
    const lastSignals = signals.slice(0, 10);

    // Make a list of 10 signals in markdown format
    let stats = `🏆 *Last 10 Signals* 🏆\n\n`;

    let wins = 0;
    let winsPercent = 0;
    let losses = 0;

    for(const signal of lastSignals) {
        if(signal.tokenInfo.price == 0) { continue }

        // see if the symbol is in the winners array winner.symbol 
        const isWinner = winners.some(winner => winner.symbol === signal.tokenInfo.symbol);
        if(isWinner) {
            // Get the winners object
            const winner = winners.find(winner => winner.symbol === signal.tokenInfo.symbol);
            wins++;
            winsPercent += winner.percentageIncrease;
            stats += `📈 ${winner.symbol} | +${winner.percentageIncrease}%\n`;
        } else {
            losses++;
            winsPercent -= 50;
            stats += `📉 ${signal.tokenInfo.symbol} | ---\n`;
        }
    };

    // Add win/loss count
    stats += `
🏆 *Wins*: ${wins}
🗑️ *Losses*: ${losses}
🚀 *Winrate*: ${Math.round((wins / (wins + losses)) * 100)}%
🟢 *Average Gain*: ${Math.round(winsPercent / 10)}%
        ∟ _Assuming 50% stop loss_`;


    ctx.reply(stats, { parse_mode: 'Markdown' });
});

module.exports = () => {
    console.log('[TELEGRAM] Commands loaded');
};