const fs = require('fs');
const readline = require('readline');

async function loadNewKeys() {
    try {
        // Create a readable stream from the file
        const fileStream = fs.createReadStream("./data/new_keys.txt");

        // Create an interface to read line by line
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity // Recognize all instances of CR LF ('\r\n') as a single line break.
        });

        let dataEntries = [];

        // Event listener for the line event, which is emitted when readline reads a line from the stream
        for await (const line of rl) {
            const parts = line.split('|');
            if (parts.length === 2) { 
                dataEntries.push({
                    key: parts[0].trim(),
                    days: parseInt(parts[1].trim())
                });
            }
        }

        clearFile("./data/new_keys.txt");
        return dataEntries;
    } catch (error) {
        console.error('Failed to process file:', error);
        return []; // Return an empty array in case of error
    }
}

function clearFile(filePath) {
    fs.writeFile(filePath, '', (err) => {
        if (err) {
            console.error('Failed to clear the file:', err);
        }
    });
}

module.exports = { loadNewKeys }
