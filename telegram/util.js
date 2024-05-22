function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'b';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num;
}

function isValidSolanaAddress(address) {
    // Regular expression to match a Solana wallet address
    const solanaAddressRegex = /^([1-9A-HJ-NP-Za-km-z]{32,44})$/;

    // Check if the address matches the regex pattern
    return solanaAddressRegex.test(address);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    formatNumber,
    isValidSolanaAddress,
    delay
};