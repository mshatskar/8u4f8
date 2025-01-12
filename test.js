const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function getFirstDeposit(address, connection) {
    try {
        // Get all signatures for the address
        const signatures = await connection.getSignaturesForAddress(
            new PublicKey(address),
            { limit: 1000 },
            'confirmed'
        );

        // Sort signatures by block time to get oldest first
        signatures.sort((a, b) => a.blockTime - b.blockTime);

        // Find first deposit transaction
        for (const sig of signatures) {
            const tx = await connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0
            });

            if (!tx) continue;

            // Look for SOL transfers to this address
            const postBalances = tx.meta.postBalances;
            const preBalances = tx.meta.preBalances;
            const accountKeys = tx.transaction.message.accountKeys;

            for (let i = 0; i < accountKeys.length; i++) {
                if (accountKeys[i].toBase58() === address) {
                    const solDeposit = (postBalances[i] - preBalances[i]) / LAMPORTS_PER_SOL;
                    if (solDeposit > 0) {
                        // Find the source address (the account that sent the SOL)
                        let sourceAddress;
                        for (let j = 0; j < accountKeys.length; j++) {
                            if (j !== i && preBalances[j] > postBalances[j]) {
                                sourceAddress = accountKeys[j].toBase58();
                                break;
                            }
                        }
                        return {
                            sourceAddress,
                            amount: solDeposit,
                            timestamp: new Date(tx.blockTime * 1000).toLocaleString()
                        };
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Error processing address ${address}:`, error);
        return null;
    }
}

async function traceDeposits(startingAddress, maxDepth = 100) {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const processedAddresses = new Set();
    let currentAddress = startingAddress;
    let depth = 0;

    console.log('\n🔍 Starting deposit trace...\n');

    while (currentAddress && depth < maxDepth) {
        if (processedAddresses.has(currentAddress)) {
            console.log('⚠️  Circular reference detected! Stopping trace.');
            break;
        }

        console.log(`\n📍 Checking address ${depth + 1}: ${currentAddress}`);
        const result = await getFirstDeposit(currentAddress, connection);

        if (!result) {
            console.log('❌ No deposit found or error occurred');
            break;
        }

        console.log(`\n📥 First deposit details:`);
        console.log(`   Amount: ${result.amount} SOL`);
        console.log(`   From: ${result.sourceAddress}`);
        console.log(`   Time: ${result.timestamp}`);

        processedAddresses.add(currentAddress);
        currentAddress = result.sourceAddress;
        depth++;
    }

    console.log('\n✅ Trace complete!');
    console.log(`   Total addresses processed: ${depth}`);
}

// Example usage
const walletAddress = process.argv[2];
if (!walletAddress) {
    console.log('Please provide a wallet address as a command line argument');
    process.exit(1);
}

traceDeposits(walletAddress).catch(console.error);