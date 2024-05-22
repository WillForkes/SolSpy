const web3 = require('@solana/web3.js');
const bufferLayout = require('buffer-layout');
const BN = require('bn.js');
const axios = require('axios');
const { getTokenInfo } = require('./tokenData')
const { addSignal, addPurchaseToWallet, isDuplicateSignal } = require('../database/databaseInterface')
const { sendSignal } = require('../telegram/bot');
const { syncWalletAddress, getRecentTrades } = require('./walletTracker');
var SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
require('dotenv').config();


async function checkWallet(walletAddress) {
    const connection = new web3.Connection("https://quick-cosmopolitan-wildflower.solana-mainnet.quiknode.pro/310d1a487450d1023077e90f88c74b7e0e838ad9/", 'confirmed');
    const pubkey = new web3.PublicKey(walletAddress);
    let signatureArray;
    let transaction;

    try {
        const confirmedTransactionSignatures = await connection.getConfirmedSignaturesForAddress2(pubkey, {limit: 2});
        signatureArray = confirmedTransactionSignatures.map(signatureInfo => signatureInfo.signature);
        transaction = await connection.getParsedTransaction(signatureArray[0], { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    } catch {
        console.warn("Too many requests coming from " + walletAddress + "...")
        return;
    }

    // Check if within last 5 mins
    if(transaction == null) {
        return
    }

    // Check if transaction is over 5 mins old
    const currentUnixTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = currentUnixTimestamp - transaction.blockTime; 
    if(timeDifference > 300) {
        return
    }

    // Filter out transactions that are not related to SPL Token transfers
    let isTokenTransfer;
    try {
        isTokenTransfer = transaction.transaction.message.instructions.some(instruction => {
            const pid = instruction.programId.toBase58();
            return pid === SPL_TOKEN_PROGRAM_ID;
        });
        
        if (!isTokenTransfer) {
            return;
        }
    } catch {
        console.debug("Failed to get transaction instructions.")
        return;
    }

    // Check if transaction has errors
    if (transaction.meta.status && transaction.meta.status.Err) {
        console.debug(`Transaction had on-chain error(s): ${JSON.stringify(transaction.meta.status.Err)}`);
        return;
    }

    // Get signal data
    const signal = await detectTokenTransfers(transaction, pubkey.toBase58())
    if(signal) {
        const isDup = await isDuplicateSignal(signal.tokenInfo.symbol)

        if(!isDup) {
            // If synced, get recent trades
            const trades = await getRecentTrades(walletAddress)

            // Log signal to DB
            await addSignal(signal)

            // Send signal out on Telegram
            await sendSignal(signal, trades);            
        } else {
            console.log("Duplicate signal detected!")
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

        const contractAddress = preBalance.mint
        
        if(contractAddress == "So11111111111111111111111111111111111111112" || contractAddress == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
            continue
        }

        const amountPurchased = postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount;

        // Determine whether the monitored wallet is the source or destination
        if (postBalance.owner === monitoredWalletAddress) {
            if(amountPurchased < 0) {
                console.log("Negative amount purchased - skipping...")
                return;
            }
            
            const tokenInfo = await getTokenInfo(contractAddress);
            if(!tokenInfo){
                continue
            }

            console.log(`[BUY] ${tokenInfo.name} (${tokenInfo.symbol}) | +${amountPurchased} ${tokenInfo.symbol} | ${monitoredWalletAddress} | ${Date(transaction.blockTime).toLocaleString()}`);
            if(tokenInfo.analysis.score > 1000) {
                console.log("Bad token score - high rug pull risk. Not sending signal...");
                return;
            }

            const allData = {
                tokenInfo,
                amountPurchased: amountPurchased,
                walletAddress: monitoredWalletAddress,
                time: new Date(Date.now()),
            };
            return allData;
        }
    }
    return;
}


module.exports = {checkWallet}