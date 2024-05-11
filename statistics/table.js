const fs = require('fs');
const Papa = require('papaparse');

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
            Object.assign(existingEntry, entry);
        } else {
            // Add new entry
            this.data.push(entry);
        }
    }

    exportToCSV() {
        const header = Object.keys(this.data[0]).join(',');
        const rows = this.data.map(entry => Object.values(entry).join(',')).join('\n');
        const csvData = `${header}\n${rows}`;
        fs.writeFileSync(this.filename, csvData);
    }    

    loadFromCSV() {
        const csvContent = fs.readFileSync(this.filename, 'utf-8');
        const { data } = Papa.parse(csvContent, { header: true });
        this.data = data;
    }
}

module.exports = DataTable;