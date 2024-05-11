const axios = require('axios');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function adjustSupplyByDecimals(supply, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.floor(supply / factor);
}

async function getRugCheckData(mint) {
    let retries = 0;
    let response;

    while(true) {
        try {
            response = await axios.get("https://api.rugcheck.xyz/v1/tokens/" + mint + "/report");
            if(!response.data) {
                return
            }
            return response.data;
        } catch (error) {
            retries++;

            if(retries == 5) {
                console.error("Failed to get token information. Axios error: " + error)
                return
            }
            
            await delay(1000);
        }
    }    
}

async function getTokenInfo(mint) {
    // Get risk analysis
    const rugCheckData = await getRugCheckData(mint);
    if(!rugCheckData) {return}

    // Get price data
    let priceData = await getPriceData(mint);
    if(!priceData) {return}

    // Calculate
    let supply;
    try{
        supply = adjustSupplyByDecimals(rugCheckData.token.supply, rugCheckData.token.decimals);
    } catch {
        return
    }
    
    const currPrice = priceData.price;
    const marketCap = (currPrice != 0) ? currPrice * supply : 0;
    
    // Check if coin was created within last 2 hours
    const currentTimestamp = Math.floor(Date.now() / 1000) - (2 * 3600); 
    const isNewcoin = currentTimestamp >= priceData.pairCreatedAt;

    if(isNewcoin == false && marketCap < 400000) {
        return
    }

    let liquidity = priceData.liquidity;
    let dayVolume = priceData.dayVolume;

    const info = {
        name: rugCheckData.tokenMeta.name,
        symbol: rugCheckData.tokenMeta.symbol,
        analysis: {
            mintAuthority: rugCheckData.token.mintAuthority,
            freezeAuthority: rugCheckData.token.freezeAuthority,
            risks: rugCheckData.risks,
            score: rugCheckData.score,
            rugged: rugCheckData.rugged
        },
        decimals: rugCheckData.token.decimals,
        supply: supply,
        price: currPrice,
        marketCap: marketCap,
        liquidity: liquidity,
        dayVolume: dayVolume,
        contractAddress: mint
    };

    return info;
}

async function getPriceData(mint) {
    try {
        const response = await axios.get("https://api.dexscreener.com/latest/dex/tokens/" + mint);
        const priceData = response.data;
        const priceObj = priceData.pairs[0];
    
        const obj = {
            dayVolume: priceObj.volume.h24,
            liquidity: priceObj.liquidity.usd,
            price: parseFloat(priceObj.priceUsd),
            pairCreatedAt: priceObj.pairCreatedAt //unix timestamp
        }
    
        return obj;
    } catch {
        return
    }
    
}

module.exports = {getTokenInfo}