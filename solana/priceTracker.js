const axios = require('axios');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPriceData(mint) {
    try {
        const response = await axios.get("https://api.dexscreener.com/latest/dex/tokens/" + mint);
        const priceData = response.data;
        const priceObj = priceData.pairs[0];
    
        const obj = {
            dayVolume: priceObj.volume.h24,
            liquidity: priceObj.liquidity.usd,
            price: parseFloat(priceObj.priceUsd)
        }
    
        return obj;
    } catch {
        return
    }
    
}

module.exports = {getPriceData}