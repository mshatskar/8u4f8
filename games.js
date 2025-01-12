const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Replace with your Alchemy Solana API URL
const ALCHEMY_URL = 'https://solana-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';

// Replace with the wallet address you want to check
const WALLET_ADDRESS = 'CQKoQag1baZcMGWEMDxvccykPt3XrGA8HWVuG8ffNxfB';

async function sol_solmainnet(walletAddress) {
    try {
      const connection = new Connection(ALCHEMY_URL, 'confirmed');
      const publicKey = new PublicKey(walletAddress);
  
      // Get SOL balance
      const balance = await connection.getBalance(publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;
  
      // Get recent transactions
      const transactions = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
  
      let mostRecentDeposit = null;
  
      for (const tx of transactions) {
        try {
          const txInfo = await connection.getParsedTransaction(tx.signature, {
            maxSupportedTransactionVersion: 0
          });
  
          if (!txInfo || !txInfo.meta || !txInfo.meta.postBalances || !txInfo.meta.preBalances) {
            continue;
          }
  
          const walletIndex = txInfo.transaction.message.accountKeys.findIndex(
            key => key.pubkey.toBase58() === walletAddress
          );
  
          if (walletIndex === -1) continue;
  
          const preBalance = txInfo.meta.preBalances[walletIndex];
          const postBalance = txInfo.meta.postBalances[walletIndex];
  
          // Check if this is an incoming transfer (balance increased)
          if (postBalance > preBalance) {
            mostRecentDeposit = {
              txId: tx.signature,
              value: (postBalance - preBalance) / LAMPORTS_PER_SOL
            };
            break;
          }
        } catch (txError) {
          console.error(`Error fetching transaction ${tx.signature}:`, txError.message);
          continue;
        }
      }
  
      return {
        address: walletAddress,
        balance: balanceInSOL.toFixed(9),
        recentTx: mostRecentDeposit ? mostRecentDeposit.txId : null,
        recentTxValue: mostRecentDeposit ? mostRecentDeposit.value.toFixed(9) : null,
        error: null
      };
  
    } catch (error) {
      console.error('Error:', error.message);
      return {
        address: walletAddress,
        balance: null,
        recentTx: null,
        recentTxValue: null,
        error: error.message
      };
    }
 }
  


async function processsolWallet(wallet) {
    const info = await sol_solmainnet(wallet.address);
    if (info.error) {
      console.log(`User ID: ${wallet.userId}`);
      console.log(`Address: ${info.address} - Error: ${info.error}`);
    } else {
      const key = `duckplays:users:${wallet.userId}`;
      const key2 = `duckplays:sol_solmainnettxid:${wallet.userId}`;
      const txiddataroom = await redisClient.hGetAll(key2);
      const checktxid = txiddataroom[info.recentTx];
      const walletinfo = await redisClient.hGetAll(key);
      const solbalance = parseFloat(walletinfo.solbalance || '0');
  
      if (solbalance !== parseFloat(info.balance)) {
        if (!checktxid) {
          await redisClient.hSet(key2, info.recentTx, info.recentTx);
          const newBalance = (solbalance + parseFloat(info.recentTxValue)).toFixed(4);
          await redisClient.hSet(key, 'solbalance', newBalance);
          await bot.sendMessage(wallet.userId, `SOL (Solana Mainnet) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} SOL</code>\nNew Balance: <code>${newBalance} SOL</code>`,  { parse_mode: 'HTML'});
        }
      }
    }
}

async function sol_solmainnetmain() {
    try {
      await connectRedis();
      const wallets = await getAllSolWallets();
  
      for (const wallet of wallets) {
        await processsolWallet(wallet);
      }
    } catch (error) {
      console.error('Main error:', error);
    } finally {
      if (redisClient) {
      //  await redisClient.quit();
      }
    }
  }
getWalletInfo();