const axios = require('axios');


async function getPrice(mint) {
    try {
        const response = await axios.get("https://api.dexscreener.com/latest/dex/tokens/" + mint);
        const priceData = response.data;
        const priceObj = priceData.pairs[0];

        return parseFloat(priceObj.priceUsd);
    } catch(err) {
        return
    }
}

module.exports = {
    getPrice
}