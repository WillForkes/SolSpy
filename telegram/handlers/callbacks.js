const bot = require('../bot');
const { addIDtoSignalSellAlerts, getSoldPercentage } = require("../../database/databaseInterface");

// !CALLBACKS
bot.action('redeem', (ctx) => {
    ctx.scene.enter('redeemScene');
});

bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const [action, userTelegramId, contractAddress] = callbackData.split(':');

    if (action === 'sa') {
        // Add user id to the signal's sell alert list
        const res = await addIDtoSignalSellAlerts(contractAddress, userTelegramId);

        if(res === true) {
            ctx.reply(`✅ Subscribed to sell alerts for token: ${symbol}.`);
        } else {
            ctx.reply('An error occured whilst subscribing to sell alerts. Please contact admin.')
        }
    }
});

module.exports = () => {
    console.log('[TELEGRAM] Handlers loaded');
};