const { Telegraf, session } = require('telegraf');
const { addIDtoSignalSellAlerts } = require("../database/databaseInterface");

// !CALLBACKS
async function registerCallbacks(bot) {
    bot.action('redeem', (ctx) => {
        ctx.scene.enter('redeemScene');
    });
    
    bot.on('callback_query', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        const [action, userTelegramId, tokenSymbol, walletAddress] = callbackData.split(':');
    
        if (action === 'getSellAlert') {
            // Add user id to the signal's sell alert list
            const res = await addIDtoSignalSellAlerts(walletAddress, tokenSymbol, userTelegramId);
            if(res === true) {
                ctx.reply(`✅ Subscribed to sell alerts for the token: ${tokenSymbol}.`);
            } else {
                ctx.reply('An error occured whilst subscribing to sell alerts. Please contact admin.')
            }
        }
    });
}

module.exports = { registerCallbacks };