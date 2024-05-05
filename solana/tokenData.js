const axios = require('axios');
const {getUSDPrice} = require('./priceTracker.js')

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function adjustSupplyByDecimals(supply, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.floor(supply / factor);
}

async function getTokenInfo(mint) {
    let response;
    let retries = 0;

    while(true) {
        try {
            response = await axios.get("https://api.rugcheck.xyz/v1/tokens/" + mint + "/report");
            break;
        } catch (error) {
            retries++;

            if(retries == 5) {
                console.error("Failed to get token information. Axios error: " + error)
                return
            }
            
            await delay(1000);
        }
    }

    if(!response.data) {
        return;
    }
    
    const data = response.data;

    let supply = adjustSupplyByDecimals(data.token.supply, data.token.decimals);
    let currPrice = await getUSDPrice(mint);
    let marketCap = 0;

    if(currPrice != 0) {
        marketCap = currPrice * supply;
    }

    const info = {
        name: data.tokenMeta.name,
        symbol: data.tokenMeta.symbol,
        analysis: {
            mintAuthority: data.token.mintAuthority,
            freezeAuthority: data.token.freezeAuthority,
            risks: data.risks,
            score: data.score,
            rugged: data.rugged
        },
        decimals: data.token.decimals,
        supply: supply,
        price: currPrice,
        marketCap: marketCap,
        contractAddress: mint
    };

    return info;
}

module.exports = {getTokenInfo, getUSDPrice}