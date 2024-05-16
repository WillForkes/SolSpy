const { Telegraf, Markup, Scenes, session } = require('telegraf');
const { message } = require("telegraf/filters");
const { doesMemberExist, registerMember, getAllMembersWithSubscription, getMember, getKey, redeemKey, addWalletToUserWatchlist, removeWalletFromUserWatchlist } = require("../database/databaseInterface");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const stage = new Scenes.Stage();
const redeemScene = new Scenes.BaseScene('redeemScene');
const addWalletScene = new Scenes.BaseScene('addWalletScene');
const removeWalletScene = new Scenes.BaseScene('removeWalletScene');

// ! REDEEM KEY SCENE
redeemScene.enter((ctx) => ctx.reply('Please reply to this message with your redeem key.'));
redeemScene.on('text', async (ctx) => {
    const inputtedKey = ctx.message.text;
    const foundKey = await getKey(inputtedKey);
    const telegramId = ctx.from.id.toString();

    if(foundKey) {
        const successRedeem = await redeemKey(telegramId, inputtedKey);
        if(successRedeem) {
            ctx.reply(`🎉 Successfully activated redeem key. ${foundKey.days} Days have been added onto your subscription!`);
        } else {
            ctx.reply(`An error occured whilst redeeming key. Please contract admin.`);
        }
    } else {
        ctx.reply(`That key is not valid!`);
    }
    
    // Here, add your logic to process the redeem key.
    ctx.scene.leave();
});

// ! ADD WALLET SCENE
addWalletScene.enter((ctx) => ctx.reply(`Please reply to this message with the Solana wallet you want to start tracking.

Please note, wallets that have extremely high transaction volumes (such as bots, exchanges, snipers, etc) *will be removed*.

_You can only track up to 3 wallets at a time._
`, { parse_mode: 'Markdown' }));
addWalletScene.on('text', async (ctx) => {
    const inputtedWallet = ctx.message.text;

    // Validate if the wallet is a valid solana wallet address
    if(!isValidSolanaAddress(inputtedWallet)){
        ctx.reply('Invalid Solana wallet address. Please try again.');
        ctx.scene.leave();
        return;
    } 

    const telegramId = ctx.from.id.toString();

    const successAdd = await addWalletToUserWatchlist(telegramId, inputtedWallet);
    if(successAdd === true) {
        ctx.reply(`👀️️️️️️ Successfully started watching wallet: ${inputtedWallet}!`);
        ctx.scene.leave();
    } else {
        ctx.reply(successAdd);
        ctx.scene.leave();
        return;
    }
});

// ! REMOVE WALLET SCENE
removeWalletScene.enter((ctx) => ctx.reply('Please reply to this message with the Solana wallet you want to stop tracking.'));
removeWalletScene.on('text', async (ctx) => {
    const inputtedWallet = ctx.message.text;

    // Validate if the wallet is a valid solana wallet address
    if(!isValidSolanaAddress(inputtedWallet)){
        ctx.reply('Invalid Solana wallet address. Please try again.');
        ctx.scene.leave();
        return;
    } 

    const telegramId = ctx.from.id.toString();

    const successRemove = await removeWalletFromUserWatchlist(telegramId, inputtedWallet);
    if(successRemove === true) {
        ctx.reply(`🗑️ Successfully removed wallet from watchlist: ${inputtedWallet}!`);
        ctx.scene.leave();
    } else {
        ctx.reply(successRemove);
        ctx.scene.leave();
        return;
    }
});



// ! FUNCTIONS
async function sendSignal(signal, recentTrades) {
    const users = await getAllMembersWithSubscription("Pro");

    const sentimentEmoji1h = signal.tokenInfo.sentiment.h1.toLowerCase().includes('neutral') ? '❓' : signal.tokenInfo.sentiment.h1.toLowerCase().includes('bullish') ? '🚀' : '🐻';
    const sentimentEmoji24h = signal.tokenInfo.sentiment.h24.toLowerCase().includes('neutral') ? '❓' : signal.tokenInfo.sentiment.h24.toLowerCase().includes('bullish') ? '🚀' : '🐻';
    
    let walletAnalysisMsg = `${recentTrades.length > 0 ? recentTrades.map(trade => `\n      ∟ ${trade.profitPercent <= 0 ? '🔴 ' : '🟢 +'}${trade.profitPercent}% | +$${trade.profitAmount} | ${trade.symbol}`).join('') : "\n      ∟ Failed to load recent trades."}`;
    let signalMsg = `💎 *Wallet Buy Alert* 💎

Token Info:
• ❓ _${signal.tokenInfo.symbol}_ | _${signal.tokenInfo.name}_
• 📄 *CA*: \`${signal.tokenInfo.contractAddress}\`
• 📈 *Market Cap*: ${signal.tokenInfo.marketCap == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.marketCap)} ${signal.tokenInfo.marketCap < 800000 ? '(Low Market Cap)' : ''}
• 💧 *Liquidity*: ${signal.tokenInfo.liquidity == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.liquidity)}
• ⏰ *24h Volume*: ${signal.tokenInfo.dayVolume == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.dayVolume)}
• 💸 *Invested*: ${signal.tokenInfo.price == 0 ? parseInt(signal.amountPurchased).toString() + " Tokens" : "$" + (signal.amountPurchased * signal.tokenInfo.price).toFixed(2)}
${signal.tokenInfo.marketCap < 210000 ? '🚨 New token - High risk 🚨' : ''}
Buying Sentiment:
• 1h - ${sentimentEmoji1h} ${signal.tokenInfo.sentiment.h1}
• 24h - ${sentimentEmoji24h} ${signal.tokenInfo.sentiment.h24}

Links:
• 🔗 [DexScreener](https://dexscreener.com/solana/${signal.tokenInfo.contractAddress})
• 🔗 [Photon](https://photon-sol.tinyastro.io/en/lp/${signal.tokenInfo.contractAddress})
• 🔗 [SolScan](https://solscan.io/account/${signal.tokenInfo.contractAddress})

Risks Analysis:
• 🔎 *Total Score*: ${signal.tokenInfo.analysis.score >= 900 ? '🔴' : signal.tokenInfo.analysis.score > 500 ? '🟡' : '🟢'} ${signal.tokenInfo.analysis.score} / 1000
• 🔎 *Risks*: ${signal.tokenInfo.analysis.risks.length > 0 
    ? signal.tokenInfo.analysis.risks.map(risk => 
        `\n      ∟ ${risk.level === 'danger' ? '🔴' : risk.level === 'warn' ? '🟡' : '🟢'} ${risk.name}: ${risk.description} (Score: ${risk.score})`).join('')
    : "\n      ∟ No significant risks identified."}

*Wallet Analysis*:
• 📈 Last 4 trades: ${walletAnalysisMsg}

_DO YOUR RESEARCH BEFORE INVESTING_!
    `;

    let isBeingWatched = false;
    for (const user of users) {
        if(isBeingWatched) break;

        for (const wallet of user.watching) {
            if(wallet.walletAddress === signal.walletAddress) {
                isBeingWatched = true;
                signalMsg += `\n\n👀 *You are watching this wallet!*`;

                // * Send signal to just this user
                try {
                    await bot.telegram.sendMessage(
                        user.telegramId, 
                        signalMsg, 
                        { 
                            parse_mode: 'Markdown', 
                            disable_web_page_preview: true,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'BonkBot', url: 'https://t.me/bonkbot_bot' }, { text: 'Trojan Bot', url: 'https://t.me/solana_trojanbot' }]
                                ]
                            }
                        }
                    );
                } catch(error) {
                    console.error("Failed sending message to telegram user: " + user.telegramId + " - " + error);
                }

                break;
            }
        }
    }

    // * Send signal to all users if not being watched by just one user
    if(!isBeingWatched) {
        for (const user of users) {
            try {
                await bot.telegram.sendMessage(
                    user.telegramId, 
                    signalMsg, 
                    { 
                        parse_mode: 'Markdown', 
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'BonkBot', url: 'https://t.me/bonkbot_bot' }, { text: 'Trojan Bot', url: 'https://t.me/solana_trojanbot' }]
                            ]
                        }
                    }
                );

            } catch(error) {
                console.error("Failed sending message to telegram user: " + user.telegramId + " - " + error);
            }
        }
    }
}

function startBot() {
    bot.launch();
    console.log("[TELEGRAM] Bot is running");
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'b';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num;
}

function isValidSolanaAddress(address) {
    // Regular expression to match a Solana wallet address
    const solanaAddressRegex = /^([1-9A-HJ-NP-Za-km-z]{32,44})$/;

    // Check if the address matches the regex pattern
    return solanaAddressRegex.test(address);
}



// ! MIDDLEWARE ////////////////
stage.register(redeemScene);
stage.register(addWalletScene);
stage.register(removeWalletScene);
bot.use(session());
bot.use(stage.middleware());


// !CALLBACKS
bot.action('redeem', (ctx) => {
    ctx.scene.enter('redeemScene');
});

bot.action('add_wallet', (ctx) => {
    ctx.scene.enter('addWalletScene');
});

bot.action('remove_wallet', (ctx) => {
    ctx.scene.enter('removeWalletScene');
});


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

Welcome back *${ctx.from.username}*! We are the #1 Solana wallet spy bot on telegram. This bot provides buy signals from profitable wallets as they happen in real time whilst offering a range of tools to help you make a profit.

*Signals will be sent to you automatically*

🔗 [Our website](https://solspy.sellpass.io)

💎 Your subscription: ${member.subscriptionType}
⏰ Ends on: ${member.subscriptionEndDate.toString()}`;
            
            ctx.reply(startMenuText, { 
                parse_mode: 'Markdown', 
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Extend subscription', url: 'https://solspy.sellpass.io/products' }],
                        [{ text: 'Redeem Key', callback_data: 'redeem' }]                        
                    ]
                }
            });
        } else {
            const startMenuText = `👁️ *Sol Spy* 👁️

Welcome to Sol Spy _${ctx.from.username}_! We are the #1 Solana wallet spy bot on telegram. This bot provides buy signals from profitable wallets as they happen in real time whilst offering a range of tools to help you make a profit.

🔗 [Our website](https://solspy.sellpass.io)

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
                    [{ text: 'Buy Subscription', url: 'https://solspy.sellpass.io/products' }],
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

// ! Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))

module.exports = { sendSignal, startBot };
