const axios = require('axios');

async function getTokenData(tokenId) {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/${tokenId}`;
        const response = await axios.get(url);
        return {
            name: response.data.name,
            market_cap: response.data.market_data.market_cap.usd,
            volume: response.data.market_data.total_volume.usd,
            launch_date: response.data.genesis_date
        };
    } catch (error) {
        console.error('Error fetching token data:', error);
        return null;
    }
}

async function getTokenInformationByMint(mintAddress) {
    try {
        const postdata = {"includeOffChain": true, "mintAccounts": [mintAddress]}
        const response = await axios.post('https://api.helius.xyz/v0/token-metadata?api-key=25a97978-b9ce-4ee2-8e29-cb974d20cc80', postdata);
        const data = response.data[0]
        const tokenInfo = {
            symbol: data.offChainMetadata.metadata.symbol,
            name: data.offChainMetadata.metadata.name,
        }
        return tokenInfo;
    } catch (error) {
        return
    }
}

module.exports = {getTokenData, getTokenInformationByMint}