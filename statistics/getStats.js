const { getAllSignals } = require('../database/databaseInterface')
const { getPrice } = require('./priceTracker');
const DataTable = require('./table');
require('dotenv').config();

const dataTable = new DataTable();

async function startTrackingPrices() {
    const signals = await getAllSignals();

    for(let i=0; i<signals.length; i++) {
        let signal = signals[i];

        const fivedays = Math.floor(Date.now() / 1000) - (5 * 24 * 3600);
        if(signal.time <= fivedays) {
            continue;
        }

        if(signal.tokenInfo.price == 0) { continue }

        const currPrice = await getPrice(signal.tokenInfo.contractAddress);
        if(!currPrice) {continue}
    
        const entry = dataTable.getEntry(signal.tokenInfo.contractAddress);
        let shouldLog = false;
        
        if(!entry) {
            shouldLog = (currPrice > signal.tokenInfo.price && signal.tokenInfo.price != 0);
        } else {
            shouldLog = (currPrice > parseFloat(entry.highestPrice) && parseFloat(entry.initialPrice) != 0);
        }

        if(shouldLog) {
            // Calculate time between now and the Date object in the Signal object
            const timeToHighest = Math.abs(new Date() - signal.time);
    
            dataTable.addEntry({
                name: signal.tokenInfo.name,
                symbol: signal.tokenInfo.symbol,
                mint: signal.tokenInfo.contractAddress,
                initialPrice: signal.tokenInfo.price,
                initialLiquidity: signal.tokenInfo.liquidity,
                initialMC: signal.tokenInfo.marketCap,
                highestPrice: currPrice,
                timeToHighest: timeToHighest,
                timeCalled: parseInt(signal.time.getTime() / 1000)
            });
        } 
    }

    dataTable.exportToCSV();
}

module.exports = {startTrackingPrices}