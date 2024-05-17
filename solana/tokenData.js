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
    
    // Check if token was launched within the last 2 hours
    const currentTime = Math.floor(Date.now() / 1000);
    const launchedInLast2h = priceData.pairCreatedAt > (currentTime - 7200);
    const marketCapThreshold = launchedInLast2h ? 150000 : 450000;
    const liquidity = priceData.liquidity;
    const dayVolume = priceData.dayVolume;

    const liqToMCRatio = liquidity / marketCap;

    // Check if market capitalization meets threshold
    if (marketCap < marketCapThreshold || dayVolume < liquidity) {
        return;
    }

    // Check if 24h volume is less than marketcap * 0.8
    if (dayVolume < (marketCap * 0.8) && !launchedInLast2h) {
        return;
    }

    switch(marketCap) {
        case marketCap > 100000 && marketCap < 1000000: // 100k - 1m
            if(liqToMCRatio < 0.12) {
                return;
            }
            break;
        case marketCap > 1000000 && marketCap < 10000000: // 1m - 10m
            if(liqToMCRatio < 0.04) {
                return;
            }
            break;
    }

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
        sentiment: priceData.sentiment,
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

        const h24Sentiment = calculateSentiment(priceObj.txns.h24.buys, priceObj.txns.h24.sells);
        const h1Sentiment = calculateSentiment(priceObj.txns.h1.buys, priceObj.txns.h1.sells);
        
        const obj = {
            sentiment: {
                h1: h1Sentiment,
                h24: h24Sentiment
            },
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

function calculateSentiment(buys, sells) {
    if(sells == 0) {
        return 0;
    }

    const ratio = buys / sells;
    if(ratio > 1.5) {
        return "Very bullish";
    } 
    else if(ratio > 1.2) {
        return "Bullish";
    }
    else if(ratio < 0.5) {
        return "Very bearish";
    } 
    else if(ratio < 0.8) {
        return "Bearish";   
    } 
    else {
        return "Neutral";
    }
}

module.exports = {getTokenInfo}