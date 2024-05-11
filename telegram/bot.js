const { Telegraf, Markup, Scenes, session } = require('telegraf');
const { message } = require("telegraf/filters");
const { doesMemberExist, registerMember, getAllMembersWithSubscription, getMember, getKey, redeemKey } = require("../database/databaseInterface");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const stage = new Scenes.Stage();
const redeemScene = new Scenes.BaseScene('redeemScene');


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


// ! FUNCTIONS
async function sendSignal(signal) {
    const users = await getAllMembersWithSubscription("Pro");
    const signalMsg = `💎 *Wallet Buy Alert* 💎

Token Info:
• ❓ _${signal.tokenInfo.symbol}_ | _${signal.tokenInfo.name}_
• 📄 *CA*: \`${signal.tokenInfo.contractAddress}\`
• 📈 *Market Cap*: ${signal.tokenInfo.marketCap == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.marketCap)}
• 💧 *Liquidity*: ${signal.tokenInfo.liquidity == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.liquidity)}
• ⏰ *24h Volume*: ${signal.tokenInfo.dayVolume == 0 ? '?' : "$" + formatNumber(signal.tokenInfo.dayVolume)}
• 💸 *Invested*: ${signal.tokenInfo.price == 0 ? parseInt(signal.amountPurchased).toString() + " Tokens" : "$" + (signal.amountPurchased * signal.tokenInfo.price).toFixed(2)}

Sentiment:
• 1h - ${"neutral" in signal.sentiment.h1.toLowerCase() ? '❓' : "bullish" in signal.sentiment.h1.toLowerCase() ? '🚀' : '🐻'}: ${signal.sentiment.h1}
• 24h - ${"neutral" in signal.sentiment.h24.toLowerCase() ? '❓' : "bullish" in signal.sentiment.h24.toLowerCase() ? '🚀' : '🐻'}: ${signal.sentiment.h24}

Links:
• 🔗 [DexScreener](https://dexscreener.com/solana/${signal.tokenInfo.contractAddress})
• 🔗 [Photon](https://photon-sol.tinyastro.io/en/lp/${signal.tokenInfo.contractAddress})
• 🔗 [SolScan](https://solscan.io/account/${signal.tokenInfo.contractAddress})

Risks Analysis:
• 🔎 *Total Score*: ${signal.tokenInfo.analysis.score > 900 ? '🔴' : signal.tokenInfo.analysis.score > 500 ? '🟡' : '🟢'} ${signal.tokenInfo.analysis.score}
• 🔎 *Risks*: ${signal.tokenInfo.analysis.risks.length > 0 
    ? signal.tokenInfo.analysis.risks.map(risk => 
        `\n      ∟ ${risk.level === 'danger' ? '🔴' : risk.level === 'warn' ? '🟡' : '🟢'} ${risk.name}: ${risk.description} (Score: ${risk.score})`).join('')
    : "\n      ∟ No significant risks identified."}

*Wallet Analysis*:
• Coming soon...

_DO YOUR RESEARCH BEFORE INVESTING_!
    `;

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



// ! MIDDLEWARE ////////////////
stage.register(redeemScene);
bot.use(session());
bot.use(stage.middleware());


// !CALLBACKS
bot.action('redeem', (ctx) => {
    ctx.scene.enter('redeemScene');
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

Welcome back <code>${ctx.from.username}</code>! We are the #1 Solana wallet spy bot on telegram. This bot provides buy signals from profitable wallets as they happen in real time whilst offering a range of tools to help you make a profit.

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


// ! Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))

module.exports = { sendSignal, startBot };
