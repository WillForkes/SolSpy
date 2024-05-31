const bot = require("./bot");
const { getAllMembersWithSubscription } = require("../database/databaseInterface");
const { formatNumber } = require("./util");

// ! SEND SIGNAL FUNCTIONs
async function sendSignal(signal, recentTrades) {
    const users = await getAllMembersWithSubscription("Pro");
    const users_admins = await getAllMembersWithSubscription("Admin");
    
    users.push(...users_admins);

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
• 📈 Last trades: ${walletAnalysisMsg}

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
                    console.error("Failed sending buy signal to telegram user: " + user.telegramId + " - " + error);
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
                                [{ text: 'BonkBot', url: 'https://t.me/bonkbot_bot' }, { text: 'Trojan Bot', url: 'https://t.me/solana_trojanbot' }],
                                [{ text: '💰 Get sell alerts on this 💰', callback_data: `sa:${user.telegramId}:${signal.tokenInfo.symbol}:${signal.walletAddress}`}]                                
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

async function sendSellSignal(signal, userIds) {
    let signalMsg = `💰 *Wallet Sell Alert* 💰

Sell Info:
• ❓ _${signal.tokenInfo.symbol}_ | _${signal.tokenInfo.name}_
• 📉 Sold *${signal.amountSoldPercentage}%*
    
_You are receiving this notification because you opted in for the sell alert_
    `;

    // * Send signal to all users if not being watched by just one user
    for (const uid of userIds) {
        try {
            await bot.telegram.sendMessage(
                uid, 
                signalMsg, 
                { 
                    parse_mode: 'Markdown', 
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'BonkBot', url: 'https://t.me/bonkbot_bot' }, { text: 'Trojan Bot', url: 'https://t.me/solana_trojanbot' }],
                        ]
                    }
                }
            );

        } catch(error) {
            console.error("Failed sending message to telegram user: " + user.telegramId + " - " + error);
        }
    }
}

module.exports = {
    sendSignal,
    sendSellSignal
};