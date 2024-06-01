const bot = require('../bot');
const { Scenes, session } = require('telegraf');
const { getKey, redeemKey, addWalletToUserWatchlist, removeWalletFromUserWatchlist, getAllMembersWithSubscription, addDaysToAllSubscriptions } = require("../../database/databaseInterface");
const { isValidSolanaAddress } = require("../util");

const redeemScene = new Scenes.BaseScene('redeemScene');
const addWalletScene = new Scenes.BaseScene('addWalletScene');
const removeWalletScene = new Scenes.BaseScene('removeWalletScene');
const broadcastScene = new Scenes.BaseScene('broadcastScene');
const addDaysScene = new Scenes.BaseScene('addDaysScene');
const stage = new Scenes.Stage();

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

broadcastScene.enter((ctx) => ctx.reply('Please reply to this message with the message you want to broadcast to all paying users.'));
broadcastScene.on('text', async (ctx) => {
    const broadcastMessageHeader = `📢 *Subscriber Broadcast* 📢`;
    let broadcastMessage = ctx.message.text;
    broadcastMessage = broadcastMessageHeader + "\n\n" + broadcastMessage;

    // Send message to all telegram users (apart from user who issued command)
    let users = await getAllMembersWithSubscription("Pro");
    const admins = await getAllMembersWithSubscription("Admin");
    users = users.concat(admins);
    
    for (const user of users) {
        try {
            await bot.telegram.sendMessage(
                user.telegramId,
                broadcastMessage,
                { 
                    parse_mode: 'Markdown', 
                    disable_web_page_preview: true,
                }
            );
        } catch(error) {
            console.error("Failed broadcasting message to telegram user: " + user.telegramId + " - " + error);
        }
    }

    ctx.reply("Successfully broadcasted message.");
    ctx.scene.leave();
    return;
});

addDaysScene.enter((ctx) => ctx.reply('Please reply to this message with the number of days you want to add to all active Pro Member subscriptions.'));
addDaysScene.on('text', async (ctx) => {
    let numberOfDays = ctx.message.text;
    
    // convert to integer
    numberOfDays = parseInt(numberOfDays);

    if(isNaN(numberOfDays)) {
        ctx.reply('Invalid number of days. Please try again.');
        ctx.scene.leave();
        return;
    }

    const successAdd = await addDaysToAllSubscriptions(numberOfDays);

    if(successAdd == true) {
        ctx.reply(`Successfully added ${numberOfDays} days to all subscriptions.`);
    } else {
        ctx.reply(`Failed to add ${numberOfDays} days to all subscriptions.`);
    }

    ctx.scene.leave();
    return;
});



stage.register(redeemScene);
stage.register(addWalletScene);
stage.register(removeWalletScene);
stage.register(broadcastScene);
stage.register(addDaysScene);
bot.use(session());
bot.use(stage.middleware());

module.exports = () => {
    console.log('[TELEGRAM] Scenes loaded');
};