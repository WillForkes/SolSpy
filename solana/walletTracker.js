const axios = require('axios');
require('dotenv').config();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncWalletAddress(walletAddress) {    
    try {
        await axios.patch(`https://openapiv1.coinstats.app/wallet/transactions?address=${walletAddress}&connectionId=solana`, null, { 
            headers: { 'X-API-KEY': process.env.COINSTATS_API_KEY }
        });
    } catch (error) {
        console.error('Error syncing wallet address:', error);
        return false;
    }
}

async function getRecentTrades(walletAddress) {
    let trades = [];

    try {
        const response1 = await axios.get(`https://openapiv1.coinstats.app/wallet/transactions?address=${walletAddress}&connectionId=solana`, { 
            headers: { 'X-API-KEY': process.env.COINSTATS_API_KEY }
        });
        const response2 = await axios.get(`https://openapiv1.coinstats.app/wallet/transactions?address=${walletAddress}&connectionId=solana&page=2`, { 
            headers: { 'X-API-KEY': process.env.COINSTATS_API_KEY }
        });
        const response3 = await axios.get(`https://openapiv1.coinstats.app/wallet/transactions?address=${walletAddress}&connectionId=solana&page=3`, { 
            headers: { 'X-API-KEY': process.env.COINSTATS_API_KEY }
        });

        let transactions = [...response1.data.result, ...response2.data.result, ...response3.data.result];

        for(transaction of transactions) {
            if(trades.length >= 4) {
                break;
            }

            // check if its a trade
            if(transaction.type != "Trade") {
                continue;
            }

            if(transaction.coinData.symbol == "USDC" || transaction.coinData.symbol == "SOL" ) {
                continue;
            }

            // Check if profit percent is negative
            if(transaction.profitLoss.profitPercent < -70) {
                continue;
            }

            // Check if symbol is already in trades
            let symbolExists = false;
            for(trade of trades) {
                if(trade.symbol == transaction.coinData.symbol) {
                    symbolExists = true;

                    trade.profitPercent += Math.round(transaction.profitLoss.profitPercent);
                    trade.profitAmount += Math.round(transaction.profitLoss.profit);
                    break;
                }
            }

            if(symbolExists) {
                continue;
            }

            trades.push({
                symbol: transaction.coinData.symbol,
                profitPercent: Math.round(transaction.profitLoss.profitPercent),
                profitAmount: Math.round(transaction.profitLoss.profit),
            })
        }

    } catch (error) {
        console.error('Error getting wallet address:', error);
        return [];
    }

    return trades;
}

module.exports = {
    syncWalletAddress,
    getRecentTrades
};