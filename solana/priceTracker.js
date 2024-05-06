const axios = require('axios');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUSDPrice(mint) {
    let tries = 0;

    while(tries < 4) {
        const priceResponse = await axios.get("https://price.jup.ag/v4/price?ids=" + mint);
        const priceData = priceResponse.data;

        if(JSON.stringify(priceData.data) === '{}') {
            tries++;
            await delay(300);
        } else {
            return priceData.data[mint].price.toFixed(2);
        }
    }
    
    return 0;
}

async function getTokenPriceHistory(mint, purchaseTime) {
    try {
        // Fetch price data from an API like CoinGecko; you'll need to map the mint to a CoinGecko token ID
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${mint}/market_chart/range`, {
            params: {
                vs_currency: 'usd',
                from: purchaseTime,
                to: Date.now() / 1000
            }
        });

        return response.data.prices;
    } catch (error) {
        console.error('Failed to fetch token price history:', error);
    }
}

async function calculatePriceIncrease(purchase) {
    const prices = await getTokenPriceHistory(purchase.mint, purchase.blockTime);
    if (!prices || prices.length === 0) return null;

    let maxPrice = 0;
    prices.forEach(price => {
        if (price[1] > maxPrice) maxPrice = price[1];
    });

    const purchasePrice = prices[0][1];
    const increase = ((maxPrice - purchasePrice) / purchasePrice) * 100;

    return {
        token: purchase.mint,
        purchasePrice,
        maxPrice,
        increase
    };
}

module.exports = {calculatePriceIncrease, getUSDPrice}