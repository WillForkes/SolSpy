const axios = require('axios');
const {getPriceData} = require('./priceTracker.js')

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
    let supply = adjustSupplyByDecimals(rugCheckData.token.supply, rugCheckData.token.decimals);
    
    
    let currPrice = priceData.price;
    let marketCap = (currPrice != 0) ? currPrice * supply : 0;

    if(marketCap < 350000) {
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

module.exports = {getTokenInfo}