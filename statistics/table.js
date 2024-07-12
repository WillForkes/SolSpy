const fs = require('fs');
const Papa = require('papaparse');
require('dotenv').config();

class DataTable {
    constructor() {
        this.filename = "stats.csv";
        this.data = [];

        this.loadFromCSV();
    }

    getEntry(mint) {
        return this.data.find(e => e.mint === mint);
    }

    addEntry(entry) {
        if(!this.data){
            this.data.push(entry);
        }

        // Check if entry already exists by the mint address
        const existingEntry = this.data.find(e => e.mint === entry.mint);
        if (existingEntry) {
            // Update existing entry
            entry.initialPrice = existingEntry.initialPrice
            entry.initialLiquidity = existingEntry.initialLiquidity
            entry.initialMC = existingEntry.initialMC

            Object.assign(existingEntry, entry);
        } else {
            // Add new entry
            this.data.push(entry);
        }
    }

    exportToCSV() {
        // Clear file before writing
        fs.writeFileSync(this.filename, '');

        // For each entry, check if initialPrice is 0, if it is then remove it
        this.data = this.data.filter(entry => entry.initialPrice !== '0');

        // Write data to CSV
        const rows = this.data.map(entry => Object.values(entry).join(',')).join('\n');
        const csvData = `${rows}`;
        fs.writeFileSync(this.filename, csvData);
    }    

    loadFromCSV() {
        const csvContent = fs.readFileSync(this.filename, 'utf-8');
        let { data } = Papa.parse(csvContent);
        

        // Remove all data with an initial price of 0
        this.data = data.filter(entry => entry[3] !== '0');
    }
}

module.exports = DataTable;