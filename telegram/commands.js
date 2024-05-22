
const { Telegraf, session } = require('telegraf');
const { doesMemberExist, registerMember, getMember } = require("../database/databaseInterface");


// ! BOT COMMAND //////////
async function registerCommands(bot) {
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
    
}

module.exports = { registerCommands };