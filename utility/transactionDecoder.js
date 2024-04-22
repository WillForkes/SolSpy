const web3 = require('@solana/web3.js');
const bufferLayout = require('buffer-layout');
const BN = require('bn.js');
const axios = require('axios');
const { getTokenInformationByMint } = require('./tokenData')

var SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

async function fetchAndDecodeTransactions(walletAddress) {
    const connection = new web3.Connection("https://quick-cosmopolitan-wildflower.solana-mainnet.quiknode.pro/310d1a487450d1023077e90f88c74b7e0e838ad9/", 'confirmed');
    const pubkey = new web3.PublicKey(walletAddress);
    const confirmedTransactionSignatures = await connection.getSignaturesForAddress(pubkey);

    for (const signatureInfo of confirmedTransactionSignatures) {
        const options = { commitment: 'confirmed', maxSupportedTransactionVersion: 0 };

        const transaction = await connection.getParsedTransaction(signatureInfo.signature, options);

        // Filter out transactions that are not related to SPL Token transfers
        const isTokenTransfer = transaction.transaction.message.instructions.some(instruction => {
            const pid = instruction.programId.toBase58();
            return pid === SPL_TOKEN_PROGRAM_ID;
        });

        if (!isTokenTransfer) {
            continue;
        }

        if (transaction.meta.status && transaction.meta.status.Err) {
            continue;
        }

        // Check if within last 5 mins
        const currentUnixTimestamp = Math.floor(Date.now() / 1000);
        const timeDifference = currentUnixTimestamp - transaction.blockTime; 
        if(timeDifference > 300) {
            return
        }

        const signal = await detectTokenTransfers(transaction, pubkey.toBase58())
        if(signal) {
            // Log signal to DB
        }
    }
}

async function detectTokenTransfers(transaction, monitoredWalletAddress) {
    const { preTokenBalances, postTokenBalances } = transaction.meta;

    for (let i = 0; i < preTokenBalances.length; i++) {
        const preBalance = preTokenBalances[i];
        const postBalance = postTokenBalances[i];

        if (!postBalance || preBalance.uiTokenAmount.uiAmount === postBalance.uiTokenAmount.uiAmount) {
            continue;
        }

        const tokenInfo = await getTokenInformationByMint(preBalance.mint);
        if(!tokenInfo){
            continue
        }

        const amountChange = postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount;

        // Determine whether the monitored wallet is the source or destination
        if (postBalance.owner === monitoredWalletAddress && amountChange > 0) {
            console.log(`[BUY] ${tokenInfo.name} (${tokenInfo.symbol}) | +${amountChange} ${tokenInfo.symbol} | ${Date(transaction.blockTime).toLocaleString()}`);
            return {
                action: 'buy',
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                tokensBought: amountChange,
                time: transaction.blockTime
            };
        }
    }
    return;
}


module.exports = {fetchAndDecodeTransactions}