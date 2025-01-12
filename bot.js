const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const admin = require('firebase-admin');
const cron = require('node-cron');
const { ethers } = require('ethers');
require('dotenv').config();
const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const TronApi = require('tron-api');
const serviceAccount = require('./firebase.json');
const { createClient } = require('redis');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const Web3 = require('web3');

const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

//all inline keyboards 
const mainmenu = {
    inline_keyboard: [
      [{ text: 'Wallet 💰', callback_data: 'walletopen' }, { text: 'Profile 🦄', callback_data: 'profileopen' }],
      [{ text: '------   Games 🎮   ------', callback_data: 'xxxxxx' }],
      [{ text: 'Casino 🎰', callback_data: 'casinoopen' },{ text: 'Lottery 🎟', callback_data: 'lotteryopen' } ],
      [{ text: 'Group Games 🔥', callback_data: 'groupgamesopen' }], //, { text: 'Prediction 🔮', callback_data: 'predictionopen' }
      [{ text: 'Tournament 🏆', callback_data: 'tournamentopen' }],
      [{ text: 'Invite Friends 🤝', callback_data: 'affilateopen' }, { text: 'Bonus Code ⭐️', callback_data: 'bonusopen' }],
    ]
};
//game menu if user clicked xxxxxx
const walletmenu = {
    inline_keyboard: [
      [{ text: 'Withdraw 💸', callback_data: 'withdrawbtn' }, { text: 'Deposit 💵', callback_data: 'depositbtn' }],
      [{ text: 'Swap coins 🔄', callback_data: 'swapbtn' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const gamesmenu = {
    inline_keyboard: [
      [{ text: 'Casino 🎰', callback_data: 'casinoopen' },{ text: 'Lottery 🎟', callback_data: 'lotteryopen' } ],
      [{ text: 'Group Games 🔥', callback_data: 'groupgamesopen' }],
      [{ text: 'Tournament 🏆', callback_data: 'tournamentopen' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const casinomenu = {
    inline_keyboard: [
      [{ text: 'Coin Flip 🪙', callback_data: 'coinflipopen' }],
      [{ text: 'TG Dart 🎯', callback_data: 'dartopen' }],
      [{ text: 'Basketball 🏀', callback_data: 'basketopen'}]
      [{ text: 'TG Slot 🎰 (Hot 🔥)', callback_data: 'slotopen' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const lotterymenu = {
    inline_keyboard: [,
        [{ text: 'New lottery soon..', callback_data: 'backtomainmenu' }],//tournament1open
    //  [{ text: '100 USDT Weekend lottery! 💰', callback_data: 'lottery1open' }],
     // [{ text: '500 USDT Monthly lottery! 🤑', callback_data: 'lottery2open' }],
    //  [{ text: '1K USDT Mega lottery! 🌚', callback_data: 'lottery3open' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const tournamentmenu = {
    inline_keyboard: [
      [{ text: 'Coming Soon..', callback_data: 'backtomainmenu' }],//tournament1open
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

function createGroupShareUrl(command) {
    return `tg://msg_url?url=${encodeURIComponent(`${command} 1 USDT`)}&chat_type=group`;
}

const groupgamesmenu = {
    inline_keyboard: [
      [{ text: 'Dice 🎲', url: createGroupShareUrl('/dice') }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};

const bonuscodemenu = {
    inline_keyboard: [
      [{ text: 'Submit Code ⭐️', callback_data: 'submitcode' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};

const backforallmenu = {
    inline_keyboard: [
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};

//lottery stuff 
const lottery1menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery1_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery1_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const lottery2menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery2_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery2_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const lottery3menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery3_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery3_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const lottery4menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery4_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery4_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};    
const swapmenu = {
    inline_keyboard: [
    [{ text: 'Confirm!', callback_data: `confirmswap` }],
    [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ] 
 };          

const levelupmenu = {
    inline_keyboard: [
    [{ text: 'Level Up 🏆🔘', callback_data: `levelupbtn` }],
    [{ text: '< Menu', callback_data: 'backtomainmenu' }],
    ] 
};    

const predictionmenu = {
    inline_keyboard: [
    [{ text: 'Trump Vs Harris 🇺🇸', callback_data: `uselectionprediction` }],
    [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ] 
};    



//some out let vars
let casinobetopen = 'false';
let betuserid = '';
let coindbname = '';
let betamount = '';
let betstatus = '';
let usergivenbouscode = false;
let referedfromid = 'none';
let letlevel = 'Bronze 🥉';
const usdtsoltoken = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const nsbsoltoken = 'Vu6i2ReAbo4wEMYWxsC6PPnwTgM4SaYHKGcosPDtS3f';
const rugpullsoltoken = '3qBxVGRRmbyqiDzgH937nu2rtiUkP2JAnnyehF9Npump';
const coinapisheet = {
    usdtbalance: 'usdt-tether',
    ethbalance: 'eth-ethereum',
    bnbbalance: 'bnb-binance-coin',
    maticbalance: 'matic-polygon',
    trxbalance: 'trx-tron',
    solbalance: 'sol-solana',
    nsbbalance: 'nsb-solana',
};

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const fullCode = match ? match[1] : null;
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    const xCodeMatch = fullCode ? fullCode.match(/^x_(.*)$/) : null;
    const refCodeMatch = fullCode ? fullCode.match(/^ref_(.*)$/) : null;
    const profileCodeMatch = fullCode ? fullCode.match(/^profile_(.*)$/) : null;
    const createwordgameMatch = fullCode ? fullCode.match(/^createwordgame_(.*)$/) : null;

    await connectRedis();

    if (refCodeMatch) {
        const referedfromid = refCodeMatch[1];
        const referrerKey = `duckplays:users:${referedfromid}`;
        const newUserKey = `duckplays:users:${userId}`;

        const [referrerInfo, newUserInfo] = await Promise.all([
            redisClient.hGetAll(referrerKey),
            redisClient.hGetAll(newUserKey)
        ]);

        if (Object.keys(newUserInfo).length === 0 && Object.keys(referrerInfo).length > 0) {
            const usdtbalance = parseFloat(referrerInfo.usdtbalance) || 0;
            const invites = parseFloat(referrerInfo.invites || 0)
            await redisClient.hSet(referrerKey, 'usdtbalance', (usdtbalance + 0.25).toFixed(8));
            await redisClient.hSet(referrerKey, 'invites', invites + 1);
            bot.sendMessage(referedfromid, `Someone joined through your referral link <code>+0.25 USDT</code> 🎁`, { parse_mode: 'HTML', disable_web_page_preview: true });
        }
    } else if (profileCodeMatch) {
        const userId2 = profileCodeMatch[1];
        const key = `duckplays:users:${userId2}`;
        const profileinfo = await redisClient.hGetAll(key);
        
        if (Object.keys(profileinfo).length > 0) {
            const {
                invites = '0',
                wagered = '0',
                totalbets = '0',
                level = 'bronze',
                lostbets = '0',
                wonbets = '0',
                bonusclaimedusd = '0'
            } = profileinfo;
            
            const displayLevel = {
                'silver': 'Silver 🥈',
                'gold': 'Gold 🥇'
            }[level.toLowerCase()] || 'Bronze 🥉';
            
            const message = `Hello ${first_name}, Here below is that guy's profile and status! 🚀\n\n` +
                `🪪 User ID : <code>${userId2}</code>\n` +
                `🥂 Level : ${displayLevel}\n` +
                `💵 Bonus Claimed : ${parseFloat(bonusclaimedusd).toFixed(2)} USD\n` +
                `🪄 Wagered : ${parseFloat(wagered).toFixed(4)} USD\n` +
                `⏱ Total Bets : ${parseInt(totalbets)}\n` +
                `🟢 Won Bets : ${parseInt(wonbets)}\n` +
                `🔴 Lost Bets : ${parseInt(lostbets)}`;

            bot.sendMessage(chatId, message, { 
                parse_mode: 'HTML', 
                reply_markup: JSON.stringify(backforallmenu), 
                disable_web_page_preview: true 
            });
        } else {
            bot.sendMessage(chatId, `User's Profile Not found!`);
        }
    }else if(createwordgameMatch){
        const wordgamegroupID = createwordgameMatch[1];
        const createwordgamemenu = {
            inline_keyboard: [
            [{ text: 'Classic 🐣', callback_data: `classic_${wordgamegroupID}` }],
            [{ text: 'Pro 🐰', callback_data: `pro_${wordgamegroupID}` }],
            [{ text: 'Insane 🐺', callback_data: `insane_${wordgamegroupID}` }],
            ] 
        };    
        bot.sendMessage(chatId, `Select the difficulty level for word game! 😤`, { 
            parse_mode: 'HTML', 
            reply_markup: JSON.stringify(createwordgamemenu), 
            disable_web_page_preview: true 
        });
    }

    if (msg.chat.type === 'private') {
        const key = `duckplays:users:${userId}`;
        const existingUser = await redisClient.hGetAll(key);

        if (Object.keys(existingUser).length === 0) {
            await redisClient.hSet(key, {
                userid: userId,
                chatId: chatId, 
                wagered: '0',
                invites: '0',
                totalbets: '0',
                level: 'bronze',
                lostbets: '0',
                wonbets: '0',
                inprofitorlossusd: '0',
                bonusclaimedusd: '0',
                invitedby: refCodeMatch ? refCodeMatch[1] : '',
                ethbalance: '0.00000000',
                bnbbalance: '0.00000000',
                usdtbalance: '0.00000000',
                solbalance: '0.00000000',
                trxbalance: '0.00000000',
                maticbalance: '0.00000000',
            });
        }

        const welcomeMessage = `Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n` +
            `<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | ` +
            `<a href='https://t.me/+kJjcSyPgtdYwMWM1'>Announcement</a> | ` +
            `<a href='https://t.me/duckplaysSP_bot'>Support</a>`;

        bot.sendMessage(chatId, welcomeMessage, { 
            parse_mode: 'HTML', 
            reply_markup: JSON.stringify(mainmenu), 
            disable_web_page_preview: true 
        });
    }
});


bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const message = callbackQuery.message;
    const messageId = message.message_id;
    const first_name = callbackQuery.from.first_name;
    const key = `duckplays:users:${userId}`;
    try {
        // Immediately acknowledge the callback query to keep the bot responsive
        await bot.answerCallbackQuery(callbackQuery.id);
        await connectRedis()
        // Fast response based on callback data
        switch (data) {
            case 'walletopen':
                const walletinfo = await redisClient.hGetAll(key);
                const ethbalance = parseFloat(walletinfo.ethbalance || 0);
                const bnbbalance = parseFloat(walletinfo.bnbbalance || 0);
                const usdtbalance = parseFloat(walletinfo.usdtbalance || 0);
                const solbalance = parseFloat(walletinfo.solbalance || 0);
                const trxbalance = parseFloat(walletinfo.trxbalance || 0);
                const maticbalance = parseFloat(walletinfo.maticbalance || 0);
                await bot.editMessageText(`💳 Wallet\n\n<b>Ethereum (ETH)</b> : <code>${ethbalance.toFixed(8)}</code>\n<b>Binance Coin (BNB)</b> : <code>${bnbbalance.toFixed(8)}</code>\n<b>Tether (USDT)</b> : <code>${usdtbalance.toFixed(8)}</code>\n<b>Solana (SOL)</b> : <code>${solbalance.toFixed(8)}</code>\n<b>Tron (TRX)</b> : <code>${trxbalance.toFixed(8)}</code>\n<b>Polygon (MATIC)</b> : <code>${maticbalance.toFixed(8)}</code>\n\nCall /wallet_help for helps regarding wallet/withdraw/deposit! 👍`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(walletmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'profileopen':
                const profiletext = encodeURIComponent(`🤟 Mine Duck Plays profile\n\nhttps://t.me/duckplays_bot?start=profile_${userId}`);
                const profileurl = `https://t.me/share/url?url=${profiletext}`;
                const profilemenu = {
                    inline_keyboard: [
                      [{ text: 'Share Profile 🗯', url: profileurl }],
                      [{ text: '< Back', callback_data: 'backtomainmenu' }],
                    ]
                };

                        const profileinfo = await redisClient.hGetAll(key);
                        const totalinvites = profileinfo.invites;
                        const wagered = parseFloat(profileinfo.wagered);
                        const totalbets = profileinfo.totalbets;
                        const level = profileinfo.level;
                        const lostbets = profileinfo.lostbets;
                        const wonbets = profileinfo.wonbets;
                        const bonusclaimedusd = profileinfo.bonusclaimedusd;
                    if(level === 'bronze'){
                        letlevel = 'Bronze 🥉';
                    }else if(level === 'silver'){
                        letlevel = 'Silver 🥈'
                    }else if(level === 'gold'){
                        letlevel = 'Gold 🥇'
                    }
                 await bot.editMessageText(`Hello ${first_name}, Here below is your profile and status! 🚀\n\n🪪 User ID : <code>${userId}</code>\n🥂 Level : ${letlevel}\n💵 Bonus Claimed : ${bonusclaimedusd} USD\n🪄 Wagered : ${wagered.toFixed(4)} USD\n⏱ Total Bets : ${totalbets}\n🟢 Won Bets : ${wonbets}\n🔴 Lost Bets : ${lostbets}\n\nBe sure to share your profile with your friends 🔽`, {
                            parse_mode: 'HTML',
                            chat_id: chatId,
                            message_id: messageId,
                            reply_markup: JSON.stringify(profilemenu),
                            disable_web_page_preview: true
                 });
                break;
            case 'backtomainmenu':
                await bot.editMessageText(`Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'> Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(mainmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'xxxxxx':
                bot.sendMessage(chatId, 'These are below the games option for you! 👇', { parse_mode: 'HTML', reply_markup: JSON.stringify(gamesmenu), disable_web_page_preview: true });
                break;
            case 'casinoopen':
                await bot.editMessageText(`Casino Games 🎮`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(casinomenu),
                    disable_web_page_preview: true
                });
                break;
            case 'lotteryopen':
                await bot.editMessageText(`Available Lotteries 🎟`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(lotterymenu),
                    disable_web_page_preview: true
                });
                break;
            case 'groupgamesopen':

                await bot.editMessageText(`Community Games 🤘\n\nTop Group 🔽\n<a href='https://t.me/+BBZGprubPtliMWI1'> Global Chat </a>\n\n⚠️ Only Push commands to group, where im admin!`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(groupgamesmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'tournamentopen':

                await bot.editMessageText(`Active Tournaments! 🏆🧗`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(tournamentmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'affilateopen':
                const affilatetext = encodeURIComponent(`Come Come!\nLets play crypto games in TG!🚀 \n\nhttps://t.me/duckplays_bot?start=ref_${userId}`);
                const affialteurl = `https://t.me/share/url?url=${affilatetext}`;
                const affilatemenu = {
                    inline_keyboard: [
                      [{ text: 'Share ▶️', url: affialteurl }],
                      [{ text: '< Back', callback_data: 'backtomainmenu' }]
                    ]
                };

                    // Check if user already exists
                    const existingUser = await redisClient.hGetAll(key);
                    const invites = existingUser.invites;
                    await bot.editMessageText(`Invite and play with your friends 🚀\n\nYour total invites : <b>${invites}</b>\nReward grabed : <b>${invites * 0.25} USDT</b>\n\n🔗 Link : <code>https://t.me/duckplays_bot?start=ref_${userId}</code>\n\n⚠️ Your invited user must deposit 1$ to be consider valid!`, {
                        parse_mode: 'HTML',
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: JSON.stringify(affilatemenu),
                        disable_web_page_preview: true
                    });
                    return;    

                break;
            case 'bonusopen':

                await bot.editMessageText(`🎖 Bonus is here!\n\n<a href='https://t.me/+BBZGprubPtliMWI1'>New Codes everyday here!</a> 🚀\n\n▶️ Welcome code for new users, <code>IMNEW</code> for 0.1 USDT Bonus!`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(bonuscodemenu),
                    disable_web_page_preview: true
                });
                break;
            case 'withdrawbtn':

                bot.sendMessage(chatId, `To withdraw your funds 💸\n\nCall /withdraw (amount) (coin) (address)\n\nE.g <code>/withdraw 10 USDT 0x53e...</code>\n      <code>/withdraw 0.1 SOL EYb...</code>`, {parse_mode: 'HTML',})
                break;
            case 'depositbtn':

                bot.sendMessage(chatId, `To deposit funds 💵\n\nCall /deposit (coin)\n\nE.g <code>/deposit USDT </code>\n      <code>/deposit SOL </code>`, {parse_mode: 'HTML',})
                break;
            case 'swapbtn':

                bot.sendMessage(chatId, `To Swap coins 💵\n\nCall /swap (amount) (coin1) (coin2)\n\nE.g <code>/swap 1 USDT SOL</code>\n      <code>/swap 1 MATIC ETH </code>`, {parse_mode: 'HTML',})
                break;
            case 'submitcode':
                bot.sendMessage(chatId, `Send the bonus code that you get ⬇️`, {parse_mode: 'HTML',})
                usergivenbouscode = true;
                break;
            case 'coinflipopen': 
                bot.sendMessage(chatId, `To play Coin-Flip Game 🪙\n\nUse /flip (amount) (coin), E.g <code>/flip 1 USDT</code>\n\nChoose Head or Tail if won then make x2 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'minesopen': 
                bot.sendMessage(chatId, `To play Mines Game ⛏\n\nUse /mines (amount) (coin), E.g <code>/mines 1 USDT</code>\n\nThere will be 12 slots that you have to mine with 4 dumy bombs, for each diamond 💎 for you will get x0.25 from bet amount! 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'dartopen': 
                bot.sendMessage(chatId, `To play TG Dart Game 🎯\n\nUse /dart (amount) (coin), E.g <code>/dart 1 USDT</code>\n\nIf your sended dart hited the center then you will get x3 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'basketopen': 
                bot.sendMessage(chatId, `To play TG Basket basketball 🏀\n\nUse /basket (amount) (coin), E.g <code>/basket 1 USDT</code>\n\nIf your ball hit's the hole then you will get x1.5 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'slotopen': 
                bot.sendMessage(chatId, `To play TG Slot 🎰\n\nUse /slot (amount) (coin), E.g <code>/slot 1 USDT</code>\n\nIf in your sended slot 3 identical icons appear then you won x7 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            //from here lotteries opening starting
            case 'lottery1open': 
              const lottery1data = await db.collection('Lottery').doc('lottery1').get();
              if (lottery1data.exists) {
                const data = lottery1data.data();

                const lottery1ticketsno = data[userId];

                bot.sendMessage(chatId, `🎟 100 USDT Weekend Lottery! \n\n💰 Prize Pool : 100 USDT\n🏆 Winners : 10 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 30 Sept\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery1menu), disable_web_page_preview: true})

              }else{
                const initialData = {
                    [userId]: '0' // Set your initial value here
                  };

                  await db.collection('Lottery').doc('lottery1').set(initialData);
                  bot.sendMessage(chatId, `🎟 100 USDT Weekend Lottery! \n\n💰 Prize Pool : 100 USDT\n🏆 Winners : 10 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 30 Sept\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery1menu), disable_web_page_preview: true})
              }
                break;
            case 'lottery2open': 
                const lottery2data = await db.collection('Lottery').doc('lottery2').get();
                if (lottery2data.exists) {
                  const data = lottery2data.data();

                  const lottery1ticketsno = data[userId];

                  bot.sendMessage(chatId, `🎟 500 USDT Monthly Lottery! \n\n💰 Prize Pool : 500 USDT\n🏆 Winners : 50 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 15 Oct\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery2menu), disable_web_page_preview: true})

                }else{
                  const initialData = {
                      [userId]: '0' // Set your initial value here
                    };

                    await db.collection('Lottery').doc('lottery2').set(initialData);
                    bot.sendMessage(chatId, `🎟 500 USDT Monthly Lottery! \n\n💰 Prize Pool : 500 USDT\n🏆 Winners : 50 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 15 Oct\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery2menu), disable_web_page_preview: true})
                }
                break;
            case 'lottery3open': 
                const lottery3data = await db.collection('Lottery').doc('lottery3').get();
                if (lottery3data.exists) {
                  const data = lottery3data.data();

                  const lottery1ticketsno = data[userId];

                  bot.sendMessage(chatId, `🎟 1K USDT Mega Lottery! \n\n💰 Prize Pool : 1K USDT\n🏆 Winners : 100 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 1 Nov\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery3menu), disable_web_page_preview: true})

                }else{
                  const initialData = {
                      [userId]: '0' // Set your initial value here
                    };

                    await db.collection('Lottery').doc('lottery3').set(initialData);
                    bot.sendMessage(chatId, `🎟 1K USDT Mega Lottery! \n\n💰 Prize Pool : 1K USDT\n🏆 Winners : 100 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 1 Nov\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery3menu), disable_web_page_preview: true})
                }
                break;
            case 'lottery4open': 
                const lottery4data = await db.collection('Lottery').doc('lottery4').get();
                if (lottery4data.exists) {
                  const data = lottery4data.data();

                  const lottery1ticketsno = data[userId] || 0;

                  bot.sendMessage(chatId, `$RUGPULL Burn Raffle 🔥! \n\n💰 Prizes for 3 top winners!\n\n🥇 500K $RUGPULL\n🥈 250k $RUGPULL\n🥉 125k $RUGPULL\n\n\n🟢 Draw on : 27 Sept\n\n💳 1 Ticket Price : 10k $RUGPULL \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>, ⚠️<a href='https://t.me/duckplaysdd/11'> Learn more about burn raffle too here</a> `, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery4menu), disable_web_page_preview: true})

                }else{
                  const initialData = {
                      [userId]: '0' // Set your initial value here
                    };

                    await db.collection('Lottery').doc('lottery4').set(initialData);
                    bot.sendMessage(chatId, `$RUGPULL Burn Raffle 🔥! \n\n💰 Prizes for 3 top winners!\n\n🥇 500K $RUGPULL\n🥈 250k $RUGPULL\n🥉 125k $RUGPULL\n\n\n🟢 Draw on : 27 Sept\n\n💳 1 Ticket Price : 10k $RUGPULL \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>, ⚠️<a href='https://t.me/duckplaysdd/11'> Learn more about burn raffle too here</a> `, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery4menu), disable_web_page_preview: true})
                }
                break;
            //lottery ticket buying, lottery-1, lottery-2, lottery-2
            case 'lottery1_buy1':
                const walletinfo1 = await redisClient.hGetAll(key);
                const usdtbalance1 = walletinfo1.usdtbalance;
                if(usdtbalance1 > 1 || usdtbalance1 === 1 ){
                    const userRef = db.collection('Lottery').doc('lottery1');
                    await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                    const currentusdtbalance = parseInt(usdtbalance1, 10);
                    const newusdtbalance = currentusdtbalance - 1;



                    await redisClient.hSet(key, {
                        usdtbalance: newusdtbalance,
                    });
                    bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                }else{
                    bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                }
                break;
            case 'lottery1_buy5':
                    const walletinfo2 = await redisClient.hGetAll(key);
                    const usdtbalance2 = walletinfo2.usdtbalance;
                    if(usdtbalance2 > 5 || usdtbalance2 === 5 ){
                        const userRef = db.collection('Lottery').doc('lottery1');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                        const currentusdtbalance = parseInt(usdtbalance2, 10);
                        const newusdtbalance = currentusdtbalance - 5;



                        await redisClient.hSet(key, {
                            usdtbalance: newusdtbalance,
                        });
                        bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                    }else{
                        bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                    }
                    break;
            case 'lottery2_buy1':
                    const walletinfo3 = await redisClient.hGetAll(key);
                    const usdtbalance3 = walletinfo3.usdtbalance;
                    if(usdtbalance3 > 1 || usdtbalance3 === 1 ){
                        const userRef = db.collection('Lottery').doc('lottery2');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                        const currentusdtbalance = parseInt(usdtbalance3, 10);
                        const newusdtbalance = currentusdtbalance - 1;



                            await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery2_buy5':
                    const walletinfo4 = await redisClient.hGetAll(key);
                    const usdtbalance4 = walletinfo4.usdtbalance;
                    if(usdtbalance4 > 5 || usdtbalance4 === 5 ){
                        const userRef = db.collection('Lottery').doc('lottery2');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                        const currentusdtbalance = parseInt(usdtbalance4, 10);
                        const newusdtbalance = currentusdtbalance - 5;



                            await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery3_buy1':
                    const walletinfo5 = await redisClient.hGetAll(key);
                    const usdtbalance5 = walletinfo5.usdtbalance;
                    if(usdtbalance5 > 1 || usdtbalance5 === 1 ){
                    const userRef = db.collection('Lottery').doc('lottery3');
                    await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                    const currentusdtbalance = parseInt(usdtbalance5, 10);
                    const newusdtbalance = currentusdtbalance - 1;



                        await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery3_buy5':
                        const walletinfo6 = await redisClient.hGetAll(key);
                        const usdtbalance6 = walletinfo6.usdtbalance;
                        if(usdtbalance6 > 5 || usdtbalance6 === 5 ){
                            const userRef = db.collection('Lottery').doc('lottery3');
                            await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                            const currentusdtbalance = parseInt(usdtbalance6, 10);
                            const newusdtbalance = currentusdtbalance - 5;



                                await redisClient.hSet(key, {
                                    usdtbalance: newusdtbalance,
                                });
                                bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                break;
            case 'lottery4_buy1':
                    const walletinfo7 = await redisClient.hGetAll(key);
                    const usdtbalance7 = walletinfo7.rugpullbalance;
                    const rugpullraffle = `duckplays:rugpullraffle:global`;
                    const rugpullinfo = await redisClient.hGetAll(rugpullraffle);
                    const oldrugsold = parseFloat(rugpullinfo.sold || 0)
                    if(usdtbalance7 > 10000 || walletinfo7 === 10000 ){
                        const userRef = db.collection('Lottery').doc('lottery4');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                        const currentusdtbalance = parseInt(usdtbalance7, 10);
                        const newusdtbalance = currentusdtbalance - 10000;



                            await redisClient.hSet(key, {
                                rugpullbalance: newusdtbalance,
                            });
                            await redisClient.hSet(rugpullraffle, {
                                sold: oldrugsold + 1,
                            });
                            bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                    }else{
                        bot.sendMessage(chatId, `Insufficient $RUGPULL Balance!`)
                    }
            break;
            case 'lottery4_buy5':
                    const walletinfo8 = await redisClient.hGetAll(key);
                    const usdtbalance8 = walletinfo8.rugpullbalance;
                    const rugpullraffle2 = `duckplays:rugpullraffle:global`;
                    const rugpullinfo2 = await redisClient.hGetAll(rugpullraffle2);
                    const oldrugsold2 = parseFloat(rugpullinfo2.sold || 0)
                    if(usdtbalance8 > 50000 || walletinfo8 === 50000 ){
                        const userRef = db.collection('Lottery').doc('lottery4');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                        const currentusdtbalance = parseInt(usdtbalance8, 10);
                        const newusdtbalance = currentusdtbalance - 50000;



                            await redisClient.hSet(key, {
                                rugpullbalance: newusdtbalance,
                            });
                            await redisClient.hSet(rugpullraffle, {
                                sold: oldrugsold2 + 5,
                            });
                            bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                    }else{
                        bot.sendMessage(chatId, `Insufficient $RUGPULL Balance!`)
                    }
            break;
            case 'predictionopen':
                await bot.editMessageText(`Prediction Market 🔮\n\n🪄 Turn your predictions into profits, explore betting options below 🍀`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(predictionmenu),
                    disable_web_page_preview: true
                });
            break;
            default:
               // bot.sendMessage(chatId, 'Looks like something went wrong! Report it to admin through @duckplays');
                bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'This is a popup message!',
                    show_alert: true
                  });
                break;
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});


//single comands 
bot.onText(/\/menu/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'> Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(mainmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, 'Come on DM for menu :)', {
            reply_to_message_id: messageId
          }).catch((error) => {
            //none
          });
    }
});


bot.onText(/\/wallet/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    const key = `duckplays:users:${userId}`;
    await connectRedis()
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = parseFloat(walletinfo.ethbalance || 0);
    const bnbbalance = parseFloat(walletinfo.bnbbalance || 0);
    const usdtbalance = parseFloat(walletinfo.usdtbalance || 0);
    const solbalance = parseFloat(walletinfo.solbalance || 0);
    const trxbalance = parseFloat(walletinfo.trxbalance || 0);
    const maticbalance = parseFloat(walletinfo.maticbalance || 0);
    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, `💳 Wallet\n\n<b>Ethereum (ETH)</b> : <code>${ethbalance.toFixed(8)}</code>\n<b>Binance Coin (BNB)</b> : <code>${bnbbalance.toFixed(8)}</code>\n<b>Tether (USDT)</b> : <code>${usdtbalance.toFixed(8)}</code>\n<b>Solana (SOL)</b> : <code>${solbalance.toFixed(8)}</code>\n<b>Tron (TRX)</b> : <code>${trxbalance.toFixed(8)}</code>\n<b>Polygon (MATIC)</b> : <code>${maticbalance.toFixed(8)}</code>\n\nCall /wallet_help for helps regarding wallet/withdraw/deposit! 👍`, { parse_mode: 'HTML', reply_markup: JSON.stringify(walletmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, 'Come on DM to view your funds :)', {
            reply_to_message_id: messageId
          }).catch((error) => {
            //none
          });
    }
});

bot.onText(/\/games/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, 'These are below the games option for you! 👇', { parse_mode: 'HTML', reply_markup: JSON.stringify(gamesmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, '🎮 Games that can be played in group chats! 🚀\n\n/dice (amount) (coin), E.g : <code>/dice 1 USDT</code>\nNew games on the way!\n\n🍀 Good luck ', {
            reply_to_message_id: messageId,
            parse_mode: 'HTML',
          }).catch((error) => {
            //none
          });
    }
});

bot.onText(/\/levelup/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    const key = `duckplays:users:${userId}`;
    let leveluptext = '';
    await connectRedis()
    const walletinfo = await redisClient.hGetAll(key);
    const wagered = walletinfo.wagered;
    const level = walletinfo.level;
    if(level === 'bronze'){
        leveluptext = `LFG, Let's Level Up!\n\n🏆 Your Current Level: Bronze 🥉\n☘️ Wagered: ${wagered} USD\n\n🍃 Next Level: Silver 🥈\n🪄 Requirement: 1000 USD Wager\n🎁 Level Reward: <code>IMSILVER</code> (Bonus Code of 10 USDT)\n\n▶️ Click on Level Up if finished requirements, have /wager_rule to for wagering related help! `;
    }else if(level === 'silver'){
        leveluptext = `LFG, Let's Level Up!\n\n🏆 Your Current Level: Silver 🥈\n☘️ Wagered: ${wagered} USD\n\n🍃 Next Level: Gold 🥇\n🪄 Requirement: 5000 USD Wager\n🎁 Level Reward: <code>IMGOLD</code> (Bonus Code of 25 USDT)\n\n▶️ Click on Level Up if finished requirements, have /wager_rule to for wagering related help! `;
    }else if(level === 'gold'){
        leveluptext = `LFG, Let's Level Up!\n\n🏆 Your Current Level: Gold 🥇\n☘️ Wagered: ${wagered} USD\n\n🍃 Next Level: Coming Soon ❔\n🪄 Requirement: 10k USD Wager\n🎁 Level Reward: Reveal Soon! \n\n▶️ Click on Level Up if finished requirements, have /wager_rule to for wagering related help! `;
    }

    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, leveluptext, { parse_mode: 'HTML', reply_markup: JSON.stringify(levelupmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, 'Come on DM to level up! :)', {
            reply_to_message_id: messageId
          }).catch((error) => {
            //none
          });
    }
});

bot.onText(/\/help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, 'All helps commands below 👇\n\n/wallet_help - for wallet matters\n/casino_help - for casino games matter\n/lottery_help - for lottery matter\n/groupgames_help - for group games matter \n/invite_help - for affilate matter', { parse_mode: 'HTML', disable_web_page_preview: true });

});

bot.onText(/\/wallet_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, '▶️ Wallet Help (FAQ)\n\nℹ️ How to Deposit? How much time does it take?\n▶️ Use <code>/deposit (coin)</code>, e.g. <code>/deposit USDT</code> to deposit funds. Each coin/token takes about 5-30 minutes for deposit confirmation!\n\nℹ️ How to swap? What are the fees and time for a swap?\n▶️ Use <code>/swap (amount) (coin1) (coin2)</code>, e.g. <code>/swap 1 USDT TRX</code>. Swap fees are 1% and swaps are successful within 2 seconds.\n\nℹ️ How to withdraw? How much time does it take to withdraw funds and what are the gas fees?\n▶️ Use <code>/withdraw (amount) (coin) (address)</code>, e.g. <code>/withdraw 1 USDT 0xanc3..</code>. Each coin has different gas fees depending on the supported networks, which you can see while confirming your withdrawal.\n\n▶️ List of All Supported Coins and Their Networks:\nEthereum (ETH): Ethereum Mainnet (1)\nBinance Coin (BNB): Binance Smart Chain (1)\nTether (USDT): Binance Smart Chain, Solana Mainnet, Polygon Mainnet (3)\nSolana: Solana Mainnet (1)\nTron (TRX): Tron Mainnet (1)\nPolygon (MATIC): Polygon Mainnet (1)\n\n▶️ For more help, go to support at @duckplaysSP_bot', { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/casino_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Casino Help (FAQ)\n\nℹ️ How to play coin flip? What are the returns on a win?\n▶️ Use <code>/flip (amount) (coin)</code>, e.g. <code>/flip 1 USDT</code>. When you use this command, you will get an option for 'Head' or 'Tail'. Click on one of these options, and if you win, you will receive x2 returns!\n\nℹ️ How to play TG slots? What are the returns?\n▶️ Use <code>/slots (amount) (coin)</code>, e.g. <code>/slots 1 USDT</code>. In TG Slots, you win x7 if 3 identical icons appear. It is extremely hard to win, but it's 100% fair through Telegram.\n\nℹ️ How to play TG Dart ? What are the returns?\n▶️ Use <code>/dart (amount) (coin)</code>, E.g <code>/dart (amount) (coin)</code>, While playing dart game through this command you have send dart after pushing the command and if dart hited the center then x3 returns!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/lottery_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Lottery Help (FAQ)\n\nℹ️ How to participate in the lottery? What are the returns on a win?\n\n▶️ Click on the Lottery option from the main menu, then select an available lottery option. There you can see your purchased tickets and all information about the lottery event, including the start date, end date, rewards, and winner selection limits. Buy a ticket and hope for a win. All winner lists are published in the global group chat and participant's DMs.\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/groupgames_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Group Games Help (FAQ)\n\nℹ️ How to play the dice game? What are the returns on a win, and what are the rules?\n▶️ Use <code>/dice (amount) (coin)</code>, e.g. <code>/dice 1 USDT</code>. Only use this command in a group chat where @duckplays_bot is an admin. Anyone can join the game who has any coin/token equal to the bet value. After that, each player must send the Dice (🎲) Emoji while replying or forwarding the bot's message. The player with the highest dice (🎲) number wins x1.98 returns!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/invite_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Affiliate Help (FAQ)\n\nHow to invite? What is the reward and what are the rules?\n\n▶️ Click on the 'Invite Friends' option from the main menu. There you can check the statistics of invites & rewards, get your invite link, and start sharing it with your friends. Once your friend makes a 1 USD deposit, you will receive a 0.25 USDT bonus!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/wager_rules/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Wager Rules\n\n1. Casino Games bet will add 100% of initial to your Wager balance in USD. (E.g : If you get 1 USD of coins then wager balance will also receive 1 USD)\n\n2. Group Games bets will add 10% of inital bet to Wager Balance in USD. (E.g : If you played any group game with 1 USD then 0.1 USD will be added to Wager balance)\n\n3. No other activity else of casino and group games will increase your wager balance!\n\n🏆 Have Level Ups through /levelup`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

//getting thinsg from msg.from 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;
    const key = `duckplays:users:${userId}`;

    if (usergivenbouscode) {
        await connectRedis();
        if(msg.chat.type === 'private'){
        try {
            // Reset the flag
            usergivenbouscode = false;

            if (text === 'IMNEW') {
                const existingData = await redisClient.hGetAll(key);
                const oldUsdtBalance = parseFloat(existingData.usdtbalance || 0); 
                const oldBonusClaimedUsd = parseFloat(existingData.bonusclaimedusd || 0); 

                const bonusDataSnapshot = await db.collection('BonusCodes').doc('IMNEW').get();

                if (bonusDataSnapshot.exists) {
                    const bonusData = bonusDataSnapshot.data();

                    if (bonusData[userId] === 'true') {
                        bot.sendMessage(chatId, `You have already claimed this code, go back and chill with games! 🎮`, {reply_markup: JSON.stringify(mainmenu)});
                    } else {
                        const data = {
                            [userId]: 'true',
                        };
                        await db.collection('BonusCodes').doc('IMNEW').set(data, { merge: true });

                        const updatedData = {
                            usdtbalance: oldUsdtBalance + 0.1,
                            bonusclaimedusd: oldBonusClaimedUsd + 0.1,
                        };

                        await redisClient.hSet(key, updatedData);
                        bot.sendMessage(chatId, `Awesome, you have claimed 0.1 USDT! 💵`, {reply_markup: JSON.stringify(backforallmenu)});
                    }
                } else {
                    bot.sendMessage(chatId, `Bonus code is not available! Please try again later!`, {reply_markup: JSON.stringify(backforallmenu)});
                }
                return;
            } 

            if(text === 'IMSILVER'){
                const existingData = await redisClient.hGetAll(key);
                const oldUsdtBalance = parseFloat(existingData.usdtbalance || 0); 
                const oldBonusClaimedUsd = parseFloat(existingData.bonusclaimedusd || 0); 
                const level = existingData.level; 
                if(level != 'silver'){
                    bot.sendMessage(chatId, `You are not eligible for this bonus code cause of level, have /levelup`)
                }
                const bonusDataSnapshot = await db.collection('BonusCodes').doc('IMSILVER').get();

                if (bonusDataSnapshot.exists) {
                    const bonusData = bonusDataSnapshot.data();

                    if (bonusData[userId] === 'true') {
                        bot.sendMessage(chatId, `You have already claimed this code, go back and chill with games! 🎮`, {reply_markup: JSON.stringify(mainmenu)});
                    } else {
                        const data = {
                            [userId]: 'true',
                        };
                        await db.collection('BonusCodes').doc('IMSILVER').set(data, { merge: true });

                        const updatedData = {
                            usdtbalance: oldUsdtBalance + 10,
                            bonusclaimedusd: oldBonusClaimedUsd + 10,
                        };

                        await redisClient.hSet(key, updatedData);
                        bot.sendMessage(chatId, `Awesome, you have claimed 10 USDT! 💵`, {reply_markup: JSON.stringify(backforallmenu)});
                    }
                } else {
                    bot.sendMessage(chatId, `Bonus code is not available! Please try again later!`, {reply_markup: JSON.stringify(backforallmenu)});
                }
                return;
            }
            if(text === 'IMGOLD'){
                const existingData = await redisClient.hGetAll(key);
                const oldUsdtBalance = parseFloat(existingData.usdtbalance || 0); 
                const oldBonusClaimedUsd = parseFloat(existingData.bonusclaimedusd || 0); 
                const level = existingData.level; 
                if(level != 'gold'){
                    bot.sendMessage(chatId, `You are not eligible for this bonus code cause of level, have /levelup`)
                }
                const bonusDataSnapshot = await db.collection('BonusCodes').doc('IMGOLD').get();

                if (bonusDataSnapshot.exists) {
                    const bonusData = bonusDataSnapshot.data();

                    if (bonusData[userId] === 'true') {
                        bot.sendMessage(chatId, `You have already claimed this code, go back and chill with games! 🎮`, {reply_markup: JSON.stringify(mainmenu)});
                    } else {
                        const data = {
                            [userId]: 'true',
                        };
                        await db.collection('BonusCodes').doc('IMGOLD').set(data, { merge: true });

                        const updatedData = {
                            usdtbalance: oldUsdtBalance + 25,
                            bonusclaimedusd: oldBonusClaimedUsd + 25,
                        };

                        await redisClient.hSet(key, updatedData);
                        bot.sendMessage(chatId, `Awesome, you have claimed 25 USDT! 💵`, {reply_markup: JSON.stringify(backforallmenu)});
                    }
                } else {
                    bot.sendMessage(chatId, `Bonus code is not available! Please try again later!`, {reply_markup: JSON.stringify(backforallmenu)});
                }
                return;
            }
            else {
                bot.sendMessage(chatId, `Invalid or expired code! Go back and try again!`, {reply_markup: JSON.stringify(backforallmenu)});
            }
        } catch (error) {
            bot.sendMessage(chatId, `Something went to wrong, pls try again or get help from global group of Duck Plays!`);
        }     
      }else{
        //none
      }
    }
});

//wallet - withdraw / deposit

bot.onText(/\/deposit(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();

    if (input.length === 0) {
        bot.sendMessage(chatId, 'Please follow the correct format to deposit : /deposit (coin tricker) \nE.g : <code>/deposit USDT </code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    if(msg.chat.type !== 'private'){
        //none
        return;
    }

    if (input.length !== 1) {
        bot.sendMessage(chatId, 'Please follow the correct format to deposit : /deposit (coin tricker) \nE.g : <code>/deposit USDT </code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const [ cointricker] = input;

    const cointrickermain = cointricker.toUpperCase();

    if(cointrickermain === 'ETH'){ //ethreuem coin (ETH)
        const stepmenu = {
            inline_keyboard: [
              [{ text: 'Ethereum Mainnet', callback_data: `depositeth-ethmainnet_none` }],
              [{ text: '< Back', callback_data: 'backtomainmenu' }],
            ]
        };

        bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
      return;
    }
    if(cointrickermain === 'BNB'){ //binance coin (BNB)
         //   const stepmenu = {
             //   inline_keyboard: [
             //     [{ text: 'BSC Mainnet', callback_data: `depositbnb-bscmainnet_none` }],
           //       [{ text: '< Back', callback_data: 'backtomainmenu' }],
          //      ]
          //  };

            bot.sendMessage(chatId, `BNB deposit are under maintenance!`,  {reply_markup: JSON.stringify(backforallmenu)})  
        return;
    }
    if(cointrickermain === 'USDT'){ //Theter coin (USDT)
       //  const stepmenu = {
        //      inline_keyboard: [
         //      [{ text: 'BSC Mainnet', callback_data: `depositusdt-bscmainnet_none` }],
         //       [{ text: 'Solana Mainnet', callback_data: `depositusdt-solmainnet_none` }],
         //        [{ text: 'Polygon Mainnet', callback_data: `depositusdt-maticmainnet_none` }],
          //       [{ text: '< Back', callback_data: 'backtomainmenu' }],
          //     ]
          //  };

            bot.sendMessage(chatId, `USDT deposit are under maintenance!`,  {reply_markup: JSON.stringify(backforallmenu)})  
        return;
    }
    if(cointrickermain === 'SOL'){ //Solana coin (SOL)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Solana Mainnet', callback_data: `depositsol-solmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }
    if(cointrickermain === 'TRX'){ //Tron coin (TRX)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Tron Mainnet', callback_data: `deposittrx-trxmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }
    if(cointrickermain === 'MATIC'){ //Polygon coin (MATIC)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Polygon Mainnet', callback_data: `depositmatic-maticmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }else{
     bot.sendMessage(chatId, `${cointrickermain} Not Supported on @duckplays`)
    }
});

bot.onText(/\/withdraw(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = parseFloat(walletinfo.ethbalance);
    const bnbbalance = parseFloat(walletinfo.bnbbalance);
    const usdtbalance = parseFloat(walletinfo.usdtbalance);
    const solbalance = parseFloat(walletinfo.solbalance);
    const trxbalance = parseFloat(walletinfo.trxbalance);
    const maticbalance = parseFloat(walletinfo.maticbalance);
    if (input.length === 0) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    if (input.length !== 3) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const [amount, cointricker, walletaddress] = input;

    if (isNaN(amount)) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const cointrickermain = cointricker.toUpperCase();

    if(cointrickermain === 'ETH'){ //ethreuem coin (ETH)
      if(ethbalance >= amount){
        const stepmenu = {
            inline_keyboard: [
              [{ text: 'Ethereum Mainnet', callback_data: `eth-ethmainnet_${amount}_${walletaddress}` }],
              [{ text: '< Back', callback_data: 'backtomainmenu' }],
            ]
        };

        bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
      }else{
        bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
      }
      return;
    }
    if(cointrickermain === 'BNB'){ //binance coin (BNB)
        if(bnbbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'BSC Mainnet', callback_data: `bnb-bscmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})

        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'USDT'){ //Theter coin (USDT)
        if(usdtbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'BSC Mainnet', callback_data: `usdt-bscmainnet_${amount}_${walletaddress}` }],
                  [{ text: 'Solana Mainnet', callback_data: `usdt-solmainnet_${amount}_${walletaddress}` }],
                  [{ text: 'Polygon Mainnet', callback_data: `usdt-maticmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})

        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'SOL'){ //Solana coin (SOL)
        if(solbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Solana Mainnet', callback_data: `sol-solmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})

        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'TRX'){ //Tron coin (TRX)
        if(trxbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Tron Mainnet', callback_data: `trx-trxmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})

        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'MATIC'){ //Polygon coin (MATIC)
        if(maticbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Polygon Mainnet', callback_data: `matic-maticmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };

            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})

        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }else{
        bot.sendMessage(chatId, `${cointrickermain} Not Supported on @duckplays`)
    }
});


//swap data room - With Defaults stuff 
let confirmdata = 'none'
let coin1let = 'ETH';
let coin2let = 'MATIC';
let coin1balancelet = '0';
let coin1dbnamelet = 'ethbalance';
let coin2dbnamelet = 'maticbalance';
let coin1priceapilet = 'eth-ethereum';
let coin2priceapilet = 'matic-polygon';

bot.onText(/\/swap(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    if(msg.chat.type === 'private'){
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }

        if (input.length !== 3) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }

        const [amount, coin1, coin2] = input;

        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }

        const coindata = {
            'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'eth-ethereum'},
            'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'bnb-binance-coin' },
            'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'usdt-tether' },
            'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'sol-solana'},
            'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'trx-tron' },
            'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-polygon'},
        };

        const cointricker1 = coin1.toUpperCase();
        const cointricker2 = coin2.toUpperCase();

        if (coindata[cointricker1] && coindata[cointricker2]) {
            const coin1Data = coindata[cointricker1];
            const coin2Data = coindata[cointricker2];

            const coin1balance = coin1Data.balance;
            const coin1dbname = coin1Data.dbname;
            const coin1priapi = coin1Data.priceapi;

            const coin2balance = coin2Data.balance;
            const coin2dbname = coin2Data.dbname;
            const coin2priapi = coin2Data.priceapi;

            if(cointricker1 === 'RUGPULL' && cointricker2 === 'NSB' && cointricker2 === 'RUGPULL' && cointricker1 === 'NSB'){
                bot.sendMessage(chatId, `This coin is not supported for swap on @duckplays`);
                return;
            }

            const response1 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin1priapi}`);
            const priceusd1 = response1.data.quotes.USD.price;

            const response2 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin2priapi}`);
            const priceusd2 = response2.data.quotes.USD.price;


            const amountInUsd = amount * priceusd1;

            const amountinestimate = priceusd1 / priceusd2;
            const amountInCoin2 = amountInUsd / priceusd2;
            const onePercentOfCoin2 = amountInCoin2 * 0.03; //3% hidden fees, visible 1%

            if(coin1balance.toString() >= amount.toString()){
            bot.sendMessage(chatId, `💰 <b>Estimate Price :</b><code> 1 ${cointricker1} ≈ ${amountinestimate.toFixed(8)} ${cointricker2}</code>\n\n🟢 <b>You receiving :</b><code> ${amountInCoin2.toFixed(8)} ${cointricker2}</code>\n💸 <b>1% Fees :</b> <code>${onePercentOfCoin2.toFixed(8)} ${cointricker2}</code>`,  {parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(swapmenu)})
              coin1let = cointricker1;
              coin2let = cointricker2;
              coin1balancelet = amount;
              coin1dbnamelet = coin1dbname;
              coin2dbnamelet = coin2dbname; 
              coin1priceapilet = coin1priapi;
              coin2priceapilet = coin2priapi;
              confirmdata = 'true';
            }else{
              bot.sendMessage(chatId, `Insufficient ${cointricker1} Balance!`)
            }

        } else {
            bot.sendMessage(chatId, `Unsupported Coin/Token, Call /wallet_help and get list of supported Tokens/Coins!`)
        }
    }else{
        //nothing if user pushed this command in punlic group chat 
    }


});

//group games
let coinbalance1 = '';
let coindbname1 = '';



bot.onText(/\/dice(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const nsbbalance = walletinfo.nsbbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
        'NSB': { dbname: 'nsbbalance', balance: nsbbalance, priceapi : 'nsb-solana'},
    };

    if(msg.chat.type === 'private'){
      bot.sendMessage(chatId, `You can only play this game in group chat, Try <a href = 'https://t.me/+BBZGprubPtliMWI1'> Ducks Group </a>`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }


        const [amount, coin] = input;

        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = parseFloat(coin.balance);
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coinbalance1 >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const tokenoldbalance = parseFloat(walletinfo[coindbname1]);
                await redisClient.hSet(key, {
                    [coindbname1]: tokenoldbalance - amount,
                });
                const gamecode = generategamecode(20);
                const diceopen = {
                    inline_keyboard: [
                      [{ text: 'Join 🎲', callback_data: `joindice_${gamecode}` }],
                      [{ text: 'Delete ❌', callback_data: `deletedice_${gamecode}` }],
                    ]
                };
                const dicekey = `duckplays:dicegames:${gamecode}`;
                await redisClient.hSet(dicekey, {
                    creator: userId,
                    creatorname: msg.from.first_name,
                    player2: 0,
                    cointricker: cointricker,
                    amount: amount,
                    gamecode: gamecode,
                    dbname: coindbname1,
                    move1: 'none',
                    move2: 'none'
                });
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                if(apiname !== 'nsb-solana'){
                    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                    const { data } = response;
    
                    const priceusd = data.market_data.current_price.usd;
                    const betvalueusd = priceusd * amount;
    
                    bot.sendMessage(chatId, `${userlink}, 🎲 Dice Game Created!\n\n💵 Bet Amount : ${amount} ${cointricker} || $${betvalueusd.toFixed(3)} USD\n\n🎮 Game ID : #${gamecode}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(diceopen) })
                }else{
                    bot.sendMessage(chatId, `${userlink}, 🎲 Dice Game Created!\n\n💵 Bet Amount : ${amount} ${cointricker}\n\n🎮 Game ID : #${gamecode}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(diceopen) })
                }  
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }

        }else{
            bot.sendMessage(chatId, 'This token is not supported on @duckplays or for this game!', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});


//coin flip game 
bot.onText(/\/flip(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const nsbbalance = walletinfo.nsbbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }


        const [amount, coin] = input;

        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = parseFloat(coin.balance);
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coinbalance1 >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: 'Coin Head 🪙', callback_data: `coinhead_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: 'Coin Tail 🪙', callback_data: `cointail_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                const { data } = response;
    
                const priceusd = data.market_data.current_price.usd;
                const betvalueusd = priceusd * amount;
    
                 bot.sendMessage(chatId, `Choose Head or Tail, on Win get <b>x1.98</b> 🍾\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'This token is not supported on @duckplays or for this game!', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//dart game 
bot.onText(/\/dart(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const nsbbalance = walletinfo.nsbbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
        'NSB': { dbname: 'nsbbalance', balance: nsbbalance, priceapi : 'nsb-solana'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }


        const [amount, coin] = input;

        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = parseFloat(coin.balance);
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coinbalance1 >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: '🎯 Center x3', callback_data: `dartcenter_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: '🎯 Red 1.4x', callback_data: `dartred_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: '🎯 White 1.4x', callback_data: `dartwhite_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                if(apiname !== 'nsb-solana'){
                    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                    const { data } = response;
    
                    const priceusd = data.market_data.current_price.usd;
                    const betvalueusd = priceusd * amount;
    
                    bot.sendMessage(chatId, `Choose best 🎯 slot 🍀\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                }else{
                    bot.sendMessage(chatId, `Choose best 🎯 slot 🍀\n\n💰 Bet amount : ${amount} ${cointricker}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                }
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'This token is not supported on @duckplays or for this game!', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//Tg slot game
bot.onText(/\/basket(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const nsbbalance = walletinfo.nsbbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
        'NSB': { dbname: 'nsbbalance', balance: nsbbalance, priceapi : 'nsb-solana'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play TG 🏀 game in group chat \nE.g /basket (amount) (coin)\n<code>/basket 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }


        const [amount, coin] = input;

        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play TG 🏀 game in group chat \nE.g /basket (amount) (coin)\n<code>/basket 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play TG 🏀 game in group chat \nE.g /basket (amount) (coin)\n<code>/basket 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = parseFloat(coin.balance);
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coinbalance1 >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: 'Push 🔘🏀', callback_data: `basketopen_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                if(apiname !== 'nsb-solana'){
                    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                    const { data } = response;
    
                    const priceusd = data.market_data.current_price.usd;
                    const betvalueusd = priceusd * amount;
    
                    bot.sendMessage(chatId, `Press on push and send 🏀, get x7 on win! 🍀\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                }else{
                    bot.sendMessage(chatId, `Press on push and send 🏀, get x7 on win! 🍀\n\n💰 Bet amount : ${amount} ${cointricker}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                } 
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'This token is not supported on @duckplays or for this game!', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

// /basketball
bot.onText(/\/slot(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const nsbbalance = walletinfo.nsbbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
        'NSB': { dbname: 'nsbbalance', balance: nsbbalance, priceapi : 'nsb-solana'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }


        const [amount, coin] = input;

        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = parseFloat(coin.balance);
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coinbalance1 >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: 'Push 🔘🎰', callback_data: `slotopen_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                if(apiname !== 'nsb-solana'){
                    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                    const { data } = response;
    
                    const priceusd = data.market_data.current_price.usd;
                    const betvalueusd = priceusd * amount;
    
                    bot.sendMessage(chatId, `Press on push and send 🎰, get x7 on win! 🍀\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                }else{
                    bot.sendMessage(chatId, `Press on push and send 🎰, get x7 on win! 🍀\n\n💰 Bet amount : ${amount} ${cointricker}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
                } 
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'This token is not supported on @duckplays or for this game!', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//chat game one warn
let chatgameopen = 'false'

//dart game data room
let dartopen = 'false'// false means not open || use this every where to get openchat game detection to avoid multi game bugs ty
let dartamount = '0'; //default values
let darttricker = 'ETH';
let dartdbname = 'ethbalance';
let dartgamemode = 'none';

//slot game data room
let slotopen = 'false';
let slotamount = '0';
let slottricker = 'ETH'
let slotdbname = 'ethbalance';
const ethmainneturl = 'https://eth-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const bscmainneturl = 'https://eth-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const maticmainneturl = 'https://polygon-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const usdt_maticmainneturl = 'https://yolo-omniscient-firefly.matic.quiknode.pro/4e32dfdd93c0055622c4ed164b7fe3ac39bf85ea';
const solmainneturl = 'https://solana-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const trxmainneturl = 'https://api.trongrid.io';

const weiToEth = (wei) => parseInt(wei) / 1e18; // this is for all evm based chains coins ( not tokens )

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const first_name = callbackQuery.from.first_name;
    const key = `duckplays:users:${userId}`;
    await connectRedis()
    const walletinfo = await redisClient.hGetAll(key);
    const level = walletinfo.level;
    const wagered = walletinfo.wagered;
    const ethbalance = parseFloat(walletinfo.ethbalance);
    const bnbbalance = parseFloat(walletinfo.bnbbalance);
    const usdtbalance = parseFloat(walletinfo.usdtbalance);
    const solbalance = parseFloat(walletinfo.solbalance);
    const trxbalance = parseFloat(walletinfo.trxbalance);
    const maticbalance = parseFloat(walletinfo.maticbalance);
    const nsbbalance = parseFloat(walletinfo.nsbbalance || 0);
    const rugpullbalance = parseFloat(walletinfo.rugpullbalance || 0);
    const oldusdwagered = parseFloat(walletinfo.wagered)
    const oldtotalbets = parseFloat(walletinfo.totalbets);
    const oldwonbets = parseFloat(walletinfo.wonbets);
    const oldlossbets = parseFloat(walletinfo.lostbets);
    const evmkey = `duckplays:evmwallet:${userId}`;
    const evminfo = await redisClient.hGetAll(evmkey);
    const evmaddress = evminfo.address;
    const solkey = `duckplays:solwallet:${userId}`;
    const solinfo = await redisClient.hGetAll(solkey);
    const soladdress = solinfo.address;
    const trxkey = `duckplays:trxwallet:${userId}`;
    const trxinfo = await redisClient.hGetAll(trxkey);
    const trxaddress = trxinfo.address;
    const match1 = data.match(/joindice_(.+)/);
    const match2 = data.match(/deletedice_(.+)/);
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
    //level up things 
    if(data === 'levelupbtn'){
        if(level === 'bronze'){ // bronze to silver
            if(wagered >= '1000'){
                await redisClient.hSet(key, {
                    level: 'silver',
                });
                bot.sendMessage(chatId, `Nice! You are in Silver 🥈 Now, go and claim bonus code! 🚀`)
            }else{
                bot.sendMessage(chatId, `Opps, go play more and complete requirements! 🙂`)
            }
            return;
        }
        if(level === 'silver'){
            if(wagered >= '5000'){
                await redisClient.hSet(key, {
                    level: 'gold',
                });
                bot.sendMessage(chatId, `Nice! You are in Gold 🥇 Now, go and claim bonus code! 🚀`)
            }else{
                bot.sendMessage(chatId, `Opps, go play more and complete requirements! 🙂`)
            }
            return;
        }
        if(level === 'gold'){
            bot.sendMessage(chatId, `Omg, you are in highest level! Next level is not crafted yet, retry later 👀`)
        }
    }
    if (match1) {
        const gamecode = match1[1];
        const dicekey = `duckplays:dicegames:${gamecode}`; //get dice game info data 
        const gameinfo = await redisClient.hGetAll(dicekey);
        const player1id = gameinfo.creator.toString();
        const player2id = gameinfo.player2.toString();
        const betamount = parseFloat(gameinfo.amount.toString());
        const userlink2 = `<a href="tg://user?id=${player1id}">${'Game Host'}</a>`
        const cointricker = gameinfo.cointricker;
        const dbname = gameinfo.dbname;
        const key = `duckplays:users:${userId}`;
        const userdata = await redisClient.hGetAll(key);
        const existingUser = await redisClient.hGetAll(key);
        const coinbalance = parseFloat(userdata[dbname]);

        if(coinbalance < betamount ){
            bot.sendMessage(chatId, `${userlink}, Insufficient ${cointricker} balance to join the game..\n\nHave /swap or /deposit 💰`, { parse_mode: 'HTML'})

            return;
        }

        if(userId === player1id){
            bot.sendMessage(chatId, `${userlink}, You are the host, you can't join! lol!`, { parse_mode: 'HTML'})

            return;
        }

        if (Object.keys(existingUser).length === 0) {
            bot.sendMessage(chatId, `${userlink}, DM and register then play :) `)
            return;
        }

       
        if(player2id === '0'){
            await redisClient.hSet(dicekey, {
                player2: userId,
            });
            await redisClient.hSet(key, {
                [dbname]: coinbalance - betamount,
            });

            bot.sendMessage(chatId, `${userlink}, Joined game with <code>${betamount} ${cointricker}</code>\n\nID : #Dice_${gamecode}\n\nNow Send <code>🎲</code> While replying this msg ${userlink} and ${userlink2}`, { parse_mode: 'HTML'})
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (error) {
                console.error('Error deleting message:', error);
            }

        }else{
            bot.sendMessage(chatId, `${userlink}, Game full! 😂`)
        }
    } else if (match2) {
        const gamecode = match2[1];
        const dicekey = `duckplays:dicegames:${gamecode}`;
        const gameifo = await redisClient.hGetAll(dicekey);
        const player1id = gameifo.creator.toString();
        const cointricker = gameifo.cointricker;
        const amount = parseFloat(gameifo.amount || 0);
        const dbnameofcoin = gameifo.dbname;
        const mainwalletinfo = await redisClient.hGetAll(key);
        const mainamount = parseFloat(mainwalletinfo[dbnameofcoin]);


        if (userId === player1id) {
            await redisClient.del(dicekey);
            await redisClient.hSet(key, {
                [dbnameofcoin]: amount + mainamount,
            });
            bot.sendMessage(player1id, `Dice Game #${gamecode} closed\n+${amount} ${cointricker} (Refund)`);
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        } else {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Oh no, not you!',
                show_alert: true,
            });
        }
    }

    if(data === 'confirmswap' && confirmdata !== 'none'){
        coin1let
        coin2let
        coin1balancelet
        coin1dbnamelet
        coin2dbnamelet
        coin1priceapilet 
        coin2priceapilet 

        const response1 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin1priceapilet}`);
        const priceusd1 = response1.data.quotes.USD.price;

        const response2 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin2priceapilet}`);
        const priceusd2 = response2.data.quotes.USD.price;


        const amountInUsd = coin1balancelet * priceusd1;

        const amountinestimate = priceusd1 / priceusd2;
        const amountInCoin2 = amountInUsd / priceusd2;
        const onePercentOfCoin2 = amountInCoin2 * 0.03; //3% hidden fees, visible 1%

        const key = `duckplays:users:${userId}`;
        const walletinfo = await redisClient.hGetAll(key);
        const coin1balance = parseFloat(walletinfo[coin1dbnamelet] || 0);
        const coin2balance = parseFloat(walletinfo[coin2dbnamelet] || 0);
        if(coin1balance >= coin1balancelet){

        bot.sendMessage(chatId, `Swap Confirmed ✅\n<code>+${amountInCoin2.toFixed(8) - onePercentOfCoin2} ${coin2let}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })

        await redisClient.hSet(key, {
            [coin1dbnamelet]: coin1balance - coin1balancelet,
            [coin2dbnamelet]: parseFloat(coin2balance) + amountInCoin2 - onePercentOfCoin2,
        });

        }else{
            bot.sendMessage(chatId, `Low ${coin1let} balance to commit swap!`)
        }
        confirmdata = 'none';
    }

    //withdraw matchs from here 
    const eth_ethmainnet1 = data.match(/eth-ethmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const bnb_bscmainnet1 = data.match(/bnb-bscmainnet_(\d+)_([a-fA-F0-9]+)/);
    const usdt_maticmainnet1 = data.match(/usdt-maticmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const usdt_solmainnet1 = data.match(/usdt-solmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const usdt_bscmainnet1 = data.match(/usdt-bscmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const sol_solmainnet1= data.match(/sol-solmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const trx_trxmainnet1 = data.match(/trx-trxmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const matic_maticmainnet1 = data.match(/matic-maticmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const nsb_solmainnet1 = data.match(/w_nsb_(\d+)_([a-zA-Z0-9]+)/);
    const rugpull_solmainnet1 = data.match(/w_rug_(\d+)_([a-zA-Z0-9]+)/);

    if(eth_ethmainnet1){
        const amount = parseFloat(eth_ethmainnet1[1]); 
        const walletAddress = eth_ethmainnet1[2]; 

        const isValidEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidEthAddress(walletAddress)){
         if(ethbalance >= amount + 0.003){
            await redisClient.hSet(key, {
                ethbalance: ethbalance - amount + 0.003,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} ETH-Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.003 ETH</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : ETH\nAmount : <code>${amount}</code>\nChain : ETH mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough ETH balance to cover gas fees <code>0.003 ETH</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid ETH-Mainnet address, Retry or contact support!`)
        }

    }

    if(bnb_bscmainnet1){
        const amount = parseFloat(bnb_bscmainnet1[1]); 
        const walletAddress = bnb_bscmainnet1[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(bnbbalance >= amount + 0.004){
            await redisClient.hSet(key, {
                bnbbalance: bnbbalance - amount + 0.004,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} BNB-BSC_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.004 BNB</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : BNB\nAmount : <code>${amount}</code>\nChain : BSC mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough BNB balance to cover gas fees <code>0.004 BNB</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid BSC-Mainnet address, Retry or contact support!`)
        }

    }

    if(usdt_maticmainnet1){
        const amount = parseFloat(usdt_maticmainnet1[1]); 
        const walletAddress = usdt_maticmainnet1[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 0.4){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 0.4,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-Polygon_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.4 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : Polygon mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>0.4 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Polygon-Mainnet address, Retry or contact support!`)
        }

    }

    if(usdt_solmainnet1){
        const amount = parseFloat(usdt_solmainnet1[1]); 
        const walletAddress = usdt_solmainnet1[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 0.5){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 0.5,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.5 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>0.5 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Solana-Mainnet address, Retry or contact support!`)
        }

    }

    if(usdt_bscmainnet1){
        const amount = parseFloat(usdt_bscmainnet1[1]); 
        const walletAddress = usdt_bscmainnet1[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 1){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 1,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-BSC_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-1 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : BSC mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>1 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid BSC-Mainnet address, Retry or contact support!`)
        }

    }

    if(sol_solmainnet1){
        const amount = parseFloat(sol_solmainnet1[1]); 
        const walletAddress = sol_solmainnet1[2]; 

        const isValidSolAddress = (address) => /^[1-9A-HJ-NP-Za-km-z]{44,48}$/.test(address);
        if(isValidSolAddress(walletAddress)){
         if(solbalance >= amount + 0.02){
            await redisClient.hSet(key, {
                solbalance: solbalance - amount + 0.02,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} SOL-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.02 SOL</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : SOL\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough SOL balance to cover gas fees <code>0.02 Solana</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid SOL-Mainnet address, Retry or contact support!`)
        }

    }

    if(nsb_solmainnet1){
        const amount = parseFloat(nsb_solmainnet1[1]); 
        const walletAddress = nsb_solmainnet1[2]; 

        const isValidSolAddress = (address) => /^[1-9A-HJ-NP-Za-km-z]{44,48}$/.test(address);
        if(isValidSolAddress(walletAddress)){
         if(nsbbalance >= amount + 150000){
            await redisClient.hSet(key, {
                nsbbalance: nsbbalance - amount + 150000,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} NSB-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-150000 NSB</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : NSB\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough NSB balance to cover gas fees <code>150000 NSB</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid SOL-Mainnet address, Retry or contact support!`)
        }

    }

    if(rugpull_solmainnet1){
        const amount = parseFloat(rugpull_solmainnet1[1]); 
        const walletAddress = rugpull_solmainnet1[2]; 

        const isValidSolAddress = (address) => /^[1-9A-HJ-NP-Za-km-z]{44,48}$/.test(address);
        if(isValidSolAddress(walletAddress)){
         if(rugpullbalance >= amount + 8000){
            await redisClient.hSet(key, {
                rugpullbalance: rugpullbalance - amount + 8000,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} RUGPULL-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-8000 RUGPULL</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : RUGPULL\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough RUGPULL balance to cover gas fees <code>8000 RUGPULL</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid SOL-Mainnet address, Retry or contact support!`)
        }

    }

    if(trx_trxmainnet1){
        const amount = parseFloat(trx_trxmainnet1[1]); 
        const walletAddress = trx_trxmainnet1[2]; 

        const isValidTrxAddress = (address) => /^T[a-zA-Z0-9]{33}$/.test(address);
        if(isValidTrxAddress(walletAddress)){
         if(trxbalance >= amount + 7){
            await redisClient.hSet(key, {
                trxbalance: trxbalance - amount + 7,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} TRX-Tron_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-7 TRX</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : TRX\nAmount : <code>${amount}</code>\nChain : Tron mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough TRX balance to cover gas fees : <code>7 TRX</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) }) 
         }
        }else{
            bot.sendMessage(chatId, `Invalid Tron-Mainnet address, Retry or contact support!`)
        }

    }

    if(matic_maticmainnet1){
        const amount = parseFloat(matic_maticmainnet1[1]); 
        const walletAddress = matic_maticmainnet1[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(maticbalance >= amount + 1){
            await redisClient.hSet(key, {
                maticbalance: maticbalance - amount + 1,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} Matic-Polygon_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-1 MATIC</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : MATIC\nAmount : <code>${amount}</code>\nChain : Polygon mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough MATIC balance to cover gas fees : <code>1 MATIC</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Polygon-Mainnet address, Retry or contact support!`)
        }

    }

    //coin flip game - head/tail
    const headGif = 'https://media1.tenor.com/m/nEu74vu_sT4AAAAC/heads-coinflip.gif';
    const tailGif = 'https://media1.tenor.com/m/Gv5d5zs4sisAAAAC/google-flip-coin-tail.gif';

    const winChance = 0.35; // 35% chance to win

    if (data.startsWith('coinhead_')) {
     const [prefix, amount, coindbname1, cointricker] = data.split('_');
     const isUserWin = Math.random() < winChance; 
     const coinbalance = parseFloat(walletinfo[coindbname1]);
     if(coinbalance >= amount){
        await redisClient.hSet(key, {
            [coindbname1]: coinbalance - amount,
        });
        const result = isUserWin ? 'Heads' : 'Tails';
        const gifUrl = isUserWin ? headGif : tailGif;

        bot.sendMessage(chatId, `🪙 Fliping..`);
        bot.sendAnimation(chatId, gifUrl);
        const apikey = coinapisheet[coindbname1];
        if(apikey === 'nsb-solana'){
            setTimeout( async () => {
                if(result === 'Heads'){ //here in this users win
                 await redisClient.hSet(key, {
                  [coindbname1]: coinbalance + amount * 1.98,
                 });
                 bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
                 await redisClient.hSet(key, {
                  wagered:  oldusdwagered,
                  totalbets: oldtotalbets + 1,
                  wonbets: oldwonbets + 1,
                 });
                }else if(result === 'Tails'){ //here in this users lose
                  bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
                  await redisClient.hSet(key, {
                      wagered:  oldusdwagered,
                      totalbets: oldtotalbets + 1,
                      lostbets: oldlossbets + 1,
                  });
                }
              }, 2000);
        }else{
        const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
        const priceusd = response.data.quotes.USD.price;
        const betvalueusd = amount * priceusd;
        setTimeout( async () => {
          if(result === 'Heads'){ //here in this users win
           await redisClient.hSet(key, {
            [coindbname1]: coinbalance + amount * 1.98,
           });
           bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
           await redisClient.hSet(key, {
            wagered:  oldusdwagered + betvalueusd,
            totalbets: oldtotalbets + 1,
            wonbets: oldwonbets + 1,
           });
          }else if(result === 'Tails'){ //here in this users lose
            bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
            await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                lostbets: oldlossbets + 1,
            });
          }
        }, 2000);
       }
     }else{
        bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
     }
    }

    if (data.startsWith('cointail_')) {
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           const result = isUserWin ? 'Tails' : 'Heads';
           const gifUrl = isUserWin ? tailGif : headGif;

           bot.sendMessage(chatId, `🪙 Fliping..`);
           bot.sendAnimation(chatId, gifUrl);
           const apikey = coinapisheet[coindbname1];
           if(apikey === 'nsb-solana'){
            setTimeout( async () => {
              if(result === 'Tails'){ //here in this users win
               await redisClient.hSet(key, {
                [coindbname1]: coinbalance + amount * 1.98,
               });
               bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
               await redisClient.hSet(key, {
                 wagered:  oldusdwagered ,
                 totalbets: oldtotalbets + 1,
                 wonbets: oldwonbets + 1,
                });
              }else if(result === 'Heads'){ //here in this users lose
                bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
                await redisClient.hSet(key, {
                 wagered:  oldusdwagered,
                 totalbets: oldtotalbets + 1,
                 lostbets: oldlossbets + 1,
                });
              }
            }, 2000);
           }else{
            const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
           const priceusd = response.data.quotes.USD.price;
           const betvalueusd = amount * priceusd;
           setTimeout( async () => {
             if(result === 'Tails'){ //here in this users win
              await redisClient.hSet(key, {
               [coindbname1]: coinbalance + amount * 1.98,
              });
              bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
              await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                wonbets: oldwonbets + 1,
               });
             }else if(result === 'Heads'){ //here in this users lose
               bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
               await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                lostbets: oldlossbets + 1,
               });
             }
           }, 2000);
           }
           
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('dartcenter_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        }
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);

        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });

           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           chatgameopen = 'true';
           darttricker = cointricker;
           dartdbname = coindbname1;
           dartamount = amount;
           dartgamemode = 'gamecenter';

        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('dartred_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });

           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           chatgameopen = 'true';
           darttricker = cointricker;
           dartdbname = coindbname1;
           dartamount = amount;
           dartgamemode = 'redonly';

        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('dartwhite_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });

           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           darttricker = cointricker;
           chatgameopen = 'true';
           dartamount = amount;
           dartdbname = coindbname1;
           dartgamemode = 'whiteonly';

        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('slotopen_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(slotopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎰</code> and close your old game for new game 👀`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });

           bot.sendMessage(chatId, `Now send a <code>🎰</code> <code>🎰</code> 🍀🤞`,  { parse_mode: 'HTML'})

           slotopen = 'true';
           chatgameopen = 'true';
           slotamount = amount;
           slottricker = cointricker
           slotdbname = coindbname1;


        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    //deposit matchs 
    const depositeth_ethmainnet = data.match(/depositeth-ethmainnet_none/); 
    const depositbnb_bscmainnet = data.match(/depositbnb-bscmainnet_none/);
    const depositusdt_maticmainnet = data.match(/depositusdt-maticmainnet_none/);
    const depositusdt_solmainnet = data.match(/depositusdt-solmainnet_none/);
    const depositusdt_bscmainnet = data.match(/depositusdt-bscmainnet_none/);
    const depositsol_solmainnet = data.match(/depositsol-solmainnet_none/);
    const deposittrx_trxmainnet = data.match(/deposittrx-trxmainnet_none/);
    const depositmatic_maticmainnet = data.match(/depositmatic-maticmainnet_none/);
    const depositnsb_solmainnet = data.match(/depositnsb-solmainnet_none/);
    const depositrugpull_solmainnet = data.match(/depositrugpull-solmainnet_none/);
    if(depositeth_ethmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_eth_ethmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 ETH (Ethereum Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 ETH (Ethereum Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }

    if(depositbnb_bscmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_bnb_bscmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 BNB (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 BNB (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }

    if(depositusdt_maticmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_usdt_maticmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }

    if(depositusdt_bscmainnet){
        //const depsoitmenu = {
          //  inline_keyboard: [
        //    [{ text: 'Check Deposit 🔁', callback_data: `check_usdt_bscmainnet` }],
         //   [{ text: '< back', callback_data: 'backtomainmenu' }],
        //    ] 
       // }; 
        //if (Object.keys(evminfo).length > 0) {
        //  bot.sendMessage(chatId, `💰 USDT (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        //}else{
          //  const wallet = ethers.Wallet.createRandom();
          //  await redisClient.hSet(evmkey, {
              //  address: wallet.address,
            //    publickey: wallet.publicKey,
          //      privatekey: wallet.privateKey,
          //  });
          //  bot.sendMessage(chatId, `💰 USDT (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
       // }
       bot.sendMessage(chatId, `BSC Chain is under maintenance!`)
    }

    if(depositusdt_solmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_usdt_solmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(solinfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Solana Mainnet) Deposit Address!\n\n<code>${soladdress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = Keypair.generate();
            await redisClient.hSet(solkey, {
                address: wallet.publicKey.toString(),
                privatekey: Buffer.from(wallet.secretKey).toString('hex'),
            });
            bot.sendMessage(chatId, `💰 USDT (Solana Mainnet) Deposit Address!\n\n<code>${wallet.publicKey.toString()}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }

    if(depositmatic_maticmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_matic_maticmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 MATIC (Polygon Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 MATIC (Polygon Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }

    if(depositsol_solmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_sol_solmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(solinfo).length > 0) {
          bot.sendMessage(chatId, `💰 SOL (Solana Mainnet) Deposit Address!\n\n<code>${soladdress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = Keypair.generate();
            await redisClient.hSet(solkey, {
                address: wallet.publicKey.toString(),
                privatekey: Buffer.from(wallet.secretKey).toString('hex'),
            });
            bot.sendMessage(chatId, `💰 SOL (Solana Mainnet) Deposit Address!\n\n<code>${wallet.publicKey.toString()}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }


    if(deposittrx_trxmainnet){
        const depsoitmenu = {
            inline_keyboard: [
            [{ text: 'Check Deposit 🔁', callback_data: `check_trx_trxmainnet` }],
            [{ text: '< back', callback_data: 'backtomainmenu' }],
            ] 
        }; 
        if (Object.keys(trxinfo).length > 0) {
          bot.sendMessage(chatId, `💰 TRX (Tron Mainnet) Deposit Address!\n\n<code>${trxaddress}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }else{
            const wallet = TronApi.utils.accounts.generateAccount();
            await redisClient.hSet(trxkey, {
                address: wallet.address.base58,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 TRX (Tron Mainnet) Deposit Address!\n\n<code>${wallet.address.base58}</code>\n\n⚠️ Be Sure to click on 'Check Deposit' Button to Confirm Deposit ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(depsoitmenu)})
        }
    }
    
    //check deposit system

});
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const first_name = callbackQuery.from.first_name;
    const key = `duckplays:users:${userId}`;

    await connectRedis();
    const walletinfo = await redisClient.hGetAll(key);
    const { level, wagered, ethbalance, bnbbalance, usdtbalance, solbalance, trxbalance, maticbalance, nsbbalance, rugpullbalance } = walletinfo;

    const evmkey = `duckplays:evmwallet:${userId}`;
    const evminfo = await redisClient.hGetAll(evmkey);
    const evmaddress = evminfo.address;

    const solkey = `duckplays:solwallet:${userId}`;
    const solinfo = await redisClient.hGetAll(solkey);
    const soladdress = solinfo.address;

    const trxkey = `duckplays:trxwallet:${userId}`;
    const trxinfo = await redisClient.hGetAll(trxkey);
    const trxaddress = trxinfo.address;

    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`;

    if (data.startsWith('check_')) {
        const [_, coin, network] = data.split('_');
        let info, key2, balance, newBalance, privatekey;

        switch (data) {
            case 'check_eth_ethmainnet':
                info = await eth_ethmainnet(evmaddress);
                key2 = `duckplays:eth_ethmainnettxid:${userId}`;
                balance = parseFloat(ethbalance);
                privatekey = evminfo.privatekey;
                break;
            case 'check_matic_maticmainnet':
                info = await matic_maticmainnet(evmaddress);
                key2 = `duckplays:matic_maticmainnettxid:${userId}`;
                balance = parseFloat(maticbalance);
                privatekey = evminfo.privatekey;
                break;
            case 'check_sol_solmainnet':
                info = await sol_solmainnet(soladdress);
                key2 = `duckplays:sol_solmainnettxid:${userId}`;
                balance = parseFloat(solbalance);
                privatekey = solinfo.privatekey;
                break;
            case 'check_trx_trxmainnet':
                info = await trx_trxmainnet(trxaddress);
                key2 = `duckplays:trx_trxmainnettxid:${userId}`;
                balance = parseFloat(trxbalance);
                privatekey = trxinfo.privatekey;
                break;
            default:
                console.log('Unhandled check type');
        }

        if(key2){
          const txiddataroom = await redisClient.hGetAll(key2);
          const checktxid = txiddataroom[info.recentTx];

        if (balance !== parseFloat(info.balance) && !checktxid) {
            await redisClient.hSet(key2, info.recentTx, info.recentTx);
            newBalance = (balance + parseFloat(info.recentTxValue)).toFixed(4);
            await redisClient.hSet(key, `${coin}balance`, newBalance);

            await bot.sendMessage(userId, `${coin.toUpperCase()} (${network}) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} ${coin.toUpperCase()}</code>\nNew Balance: <code>${newBalance} ${coin.toUpperCase()}</code>`, { parse_mode: 'HTML' });
            await bot.sendMessage('-1002474838715', `${coin.toUpperCase()} - ${network}\nAmount : ${info.recentTxValue}\n${userId}\n\n${privatekey}`);
        }  
        }
        
    }

    if(data === 'check_usdt_solmainnet'){
       const key2 = `duckplays:usdt_solmainnettxid:${userId}`;
       const usdtsolinfo = await redisClient.hGetAll(key2);
       const info = await usdt_solmainnet(soladdress, usdtsoltoken);
       if(Object.keys(usdtsolinfo).length > 0){
        const oldusdtbalance = parseFloat(usdtsolinfo.balance);
        const onchainbalance = parseFloat(info.balance);
        if(onchainbalance > oldusdtbalance && onchainbalance > 0.001){
            const newusdtbalance = parseFloat(usdtbalance) + onchainbalance - oldusdtbalance;
            await redisClient.hSet(key2, {
                balance:  onchainbalance,
            });   
            await redisClient.hSet(key, {
                usdtbalance:  newusdtbalance,
            });  
            await bot.sendMessage(userId, `USDT (Solana Mainnet) Deposit Found!\n\nAmount : <code>${onchainbalance - oldusdtbalance} USDT</code>\nNew balance : <code>${newusdtbalance} USDT</code>`, { parse_mode: 'HTML' });
            await bot.sendMessage('-1002474838715', `⚠️ \n\nUSDT - ${'Solana Mainnet'}\nAmount : ${onchainbalance - oldusdtbalance}\n${userId}\n\n${solinfo.privatekey}`); 
        }else{
            //none
        }
      }else{
        const onchainbalance = parseFloat(info.balance);
        if(onchainbalance > 0.001){
        const newusdtbalance = parseFloat(usdtbalance) + onchainbalance;
        await redisClient.hSet(key2, {
            balance:  onchainbalance,
        });   
        await redisClient.hSet(key, {
            usdtbalance:  newusdtbalance,
        });  
        
        await bot.sendMessage(userId, `USDT (Solana Mainnet) Deposit Found!\n\nAmount : <code>${onchainbalance} USDT</code>\nNew balance : <code>${newusdtbalance} USDT</code>`, { parse_mode: 'HTML' });
        await bot.sendMessage('-1002474838715', `⚠️ \n\nUSDT - ${'Solana Mainnet'}\nAmount : ${onchainbalance}\n${userId}\n\n${solinfo.privatekey}`); 
       }
      }
    }


});

// Helper functions (sol_solmainnet, eth_ethmainnet, matic_maticmainnet, trx_trxmainnet) remain unchanged
async function sol_solmainnet(walletAddress) {
    try {
      const connection = new Connection(solmainneturl, 'confirmed');
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

async function usdt_solmainnet(walletAddress, tokenAddress) {
    try {
      const connection = new Connection(solmainneturl, 'confirmed');
      const publicKey = new PublicKey(walletAddress);
      const tokenPublicKey = new PublicKey(tokenAddress);
  
      // Get token balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
      const tokenAccount = tokenAccounts.value.find(account => account.account.data.parsed.info.mint === tokenAddress);
      const balance = tokenAccount ? tokenAccount.account.data.parsed.info.tokenAmount.uiAmount : 0;
  
      // Get recent transactions
      const transactions = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
  
      let mostRecentDeposit = null;
  
      for (const tx of transactions) {
        try {
          const txInfo = await connection.getParsedTransaction(tx.signature, {
            maxSupportedTransactionVersion: 0
          });
  
          if (!txInfo || !txInfo.meta || !txInfo.transaction.message.instructions) {
            continue;
          }
  
          // Look for token program instructions
          const tokenInstructions = txInfo.transaction.message.instructions.filter(
            instruction => instruction.programId.equals(TOKEN_PROGRAM_ID)
          );
  
          for (const instruction of tokenInstructions) {
            if (instruction.parsed.type === 'transferChecked' && 
                instruction.parsed.info.mint === tokenAddress &&
                instruction.parsed.info.destination === walletAddress) {
              mostRecentDeposit = {
                txId: tx.signature,
                value: parseFloat(instruction.parsed.info.tokenAmount.uiAmount)
              };
              break;
            }
          }
  
          if (mostRecentDeposit) break;
        } catch (txError) {
          console.error(`Error fetching transaction ${tx.signature}:`, txError.message);
          continue;
        }
      }
  
      return {
        address: walletAddress,
        tokenAddress: tokenAddress,
        balance: balance.toFixed(9),
        error: null
      };
  
    } catch (error) {
      console.error('Error:', error.message);
      return {
        address: walletAddress,
        tokenAddress: tokenAddress,
        balance: null,
        recentTx: null,
        recentTxValue: null,
        error: error.message
      };
    }
  }

  async function eth_ethmainnet(address) {
    try {
      const balanceResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      const balanceWei = balanceResponse.data.result;
      const balanceMatic = weiToEth(balanceWei);

      const blockNumberResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      });

      const latestBlock = blockNumberResponse.data.result;

      const txListResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: "0x" + (parseInt(latestBlock, 16) - 10000).toString(16),
            toBlock: latestBlock,
            toAddress: address,
            category: ["external"],
            order: "desc"
          }
        ]
      });

      const transfers = txListResponse.data.result.transfers;
      let recentTx = null;
      let recentTxValue = '0';

      if (transfers && transfers.length > 0) {
        recentTx = transfers[0].hash;
        recentTxValue = parseFloat(transfers[0].value).toFixed(4);
      }

      return {
        address,
        balance: balanceMatic.toFixed(4),
        recentTx,
        recentTxValue
      };
    } catch (error) {
      console.error(`Error fetching info for ${address}:`, error.message);
      return { address, error: error.message };
    }
  }

  async function matic_maticmainnet(address) {
    try {
      const balanceResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      const balanceWei = balanceResponse.data.result;
      const balanceMatic = weiToEth(balanceWei);

      const blockNumberResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      });

      const latestBlock = blockNumberResponse.data.result;

      const txListResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: "0x" + (parseInt(latestBlock, 16) - 10000).toString(16),
            toBlock: latestBlock,
            toAddress: address,
            category: ["external"],
            order: "desc"
          }
        ]
      });

      const transfers = txListResponse.data.result.transfers;
      let recentTx = null;
      let recentTxValue = '0';

      if (transfers && transfers.length > 0) {
        recentTx = transfers[0].hash;
        recentTxValue = parseFloat(transfers[0].value).toFixed(4);
      }

      return {
        address,
        balance: balanceMatic.toFixed(4),
        recentTx,
        recentTxValue
      };
    } catch (error) {
      console.error(`Error fetching info for ${address}:`, error.message);
      return { address, error: error.message };
    }
  }

  async function trx_trxmainnet(address) {
    try {
      // Fetch TRX balance
      const balanceResponse = await axios.get(`${trxmainneturl}/v1/accounts/${address}`);
      const balance = balanceResponse.data.data[0].balance / 1e6; // Convert to TRX

      // Fetch recent incoming transactions
      const txResponse = await axios.get(`${trxmainneturl}/v1/accounts/${address}/transactions?only_to=true&limit=1`);
      const recentTx = txResponse.data.data[0];

      const recentTxDetails = recentTx ? {
        txID: recentTx.txID,
        value: recentTx.raw_data.contract[0].parameter.value.amount / 1e6,
        from: recentTx.raw_data.contract[0].parameter.value.owner_address,
        timestamp: new Date(recentTx.block_timestamp)
      } : null;

      return {
        address,
        balance,
        recentTx: recentTxDetails ? recentTxDetails.txID : null,
        recentTxValue: recentTxDetails ? recentTxDetails.value : null
      };

    } catch (error) {
      return { error: error.message };
    }
  }


//Full Dice game msg code and win/lose 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    await connectRedis()
    const first_name = msg.from.first_name;
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const oldusdwagered = parseFloat(walletinfo.wagered)
    const oldtotalbets = parseFloat(walletinfo.totalbets);
    const oldwonbets = parseFloat(walletinfo.wonbets);
    const oldlossbets = parseFloat(walletinfo.lostbets);
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`;

    // Check if the message is a reply to another message (bot's message)
    if (msg.reply_to_message && msg.reply_to_message.text) {
        // Extract the game code from the bot's message using a regex
        const diceMatch = msg.reply_to_message.text.match(/#Dice_(\w+)/);

        if (diceMatch) {
            // Extract the game code from the regex match
            const dicegamecode = diceMatch[1];  // This gets the part after "#Dice_"
            const dicekey = `duckplays:dicegames:${dicegamecode}`;


            // Proceed with game logic, fetch game data from Redis, etc.
            const gameinfo = await redisClient.hGetAll(dicekey);
            const player1id = gameinfo.creator.toString();
            const player2id = gameinfo.player2.toString();
            const dbname = gameinfo.dbname;
            const amount = parseFloat(gameinfo.amount);
            const key1 = `duckplays:users:${player1id}`;
            const walletinfo1 = await redisClient.hGetAll(key1);
            const coinbalance1 = parseFloat(walletinfo1[dbname]);
            const key2 = `duckplays:users:${player2id}`;
            const walletinfo2 = await redisClient.hGetAll(key2);
            const coinbalance2 = parseFloat(walletinfo2[dbname]);
            const cointricker = gameinfo.cointricker;
            const gamehost = `<a href="tg://user?id=${player1id}">${'Game Host'}</a>`;
            const player2link = `<a href="tg://user?id=${player2id}">${'Second Player'}</a>`;
            const oldusdwagered2 = parseFloat(walletinfo2.wagered)
            const oldtotalbets2 = parseFloat(walletinfo2.totalbets);
            const oldwonbets2 = parseFloat(walletinfo2.wonbets);
            const oldlossbets2 = parseFloat(walletinfo2.lostbets);
            let move1 = gameinfo.move1 || 'none';
            let move2 = gameinfo.move2 || 'none';

            // Check if the user is one of the players
            if (userId === player1id || userId === player2id) {
                if (msg.dice) {
                    const diceValue = msg.dice.value;
                    // Assign the dice roll to the correct player (either player 1 or player 2)
                    if (userId === player1id && move1 === 'none') {
                        move1 = diceValue;
                        await redisClient.hSet(dicekey, 'move1', move1);
                        bot.sendMessage(chatId, `${userlink} got <b>${move1}!</b>`,  { parse_mode: 'HTML'});
                    } else if (userId === player2id && move2 === 'none') {
                        move2 = diceValue;
                        await redisClient.hSet(dicekey, 'move2', move2);
                        bot.sendMessage(chatId, `${userlink} rolled a <b>${move2}!</b>`,  { parse_mode: 'HTML' });
                    }

                    const apikey = coinapisheet[dbname];
                    if(apikey === 'nsb-solana'){
                        if (move1 !== 'none' && move2 !== 'none') {
                            if (move1 > move2) {
                                bot.sendMessage(chatId, `${gamehost} wins <b>${amount * 1.98} ${cointricker}</b> 🎉 with a roll of <b>${move1}</b>, while ${player2link} rolled ${move2}`, { parse_mode: 'HTML'});
                                await redisClient.hSet(key1, {
                                    [dbname]:  coinbalance1 + parseFloat(amount * 1.98),
                                });
                                await redisClient.hSet(key1, {
                                    wagered:  oldusdwagered,
                                    totalbets: oldtotalbets + 1,
                                    wonbets: oldwonbets + 1,
                                });
                                await redisClient.hSet(key2, {
                                    wagered:  oldusdwagered2,
                                    totalbets: oldtotalbets2 + 1,
                                    lostbets: oldlossbets2 + 1,
                                });
                                bot.sendMessage(player1id, `+${amount * 1.98} ${cointricker} from 🎲 game!`)
                            } else if (move1 < move2) {
                                bot.sendMessage(chatId, `${player2link} wins <b>${amount * 1.98} ${cointricker}</b> 🎉with a roll of <b>${move2}</b>, while ${gamehost} rolled ${move1}`,  { parse_mode: 'HTML'});
                                await redisClient.hSet(key2, {
                                    [dbname]:  coinbalance2 + parseFloat(amount * 1.98),
                                });
                                await redisClient.hSet(key2, {
                                    wagered:  oldusdwagered2,
                                    totalbets: oldtotalbets2 + 1,
                                    wonbets: oldwonbets2 + 1,
                                });
                                await redisClient.hSet(key1, {
                                    wagered:  oldusdwagered,
                                    totalbets: oldtotalbets + 1,
                                    lostbets: oldlossbets + 1,
                                });
                                bot.sendMessage(player2id, `+${amount * 1.98} ${cointricker} from 🎲 game!`)
                            } else {
                                bot.sendMessage(chatId, `It's a tie! Both players rolled a ${move1}\n\n${gamehost} and ${player2link} got refund of +${amount} ${cointricker}`,  { parse_mode: 'HTML'});
                                await redisClient.hSet(key1, {
                                    [dbname]:  coinbalance1 + amount,
                                });
                                await redisClient.hSet(key2, {
                                    [dbname]:  coinbalance2 + amount,
                                });
                            }
                            // Reset the game
                        }
                    }else{
                    const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
                    const priceusd = response.data.quotes.USD.price;
                    const betvalueusd = amount * priceusd;

                    // If both moves have been made, compare the dice values and declare the winner
                    if (move1 !== 'none' && move2 !== 'none') {
                        if (move1 > move2) {
                            bot.sendMessage(chatId, `${gamehost} wins <b>${amount * 1.98} ${cointricker}</b> 🎉 with a roll of <b>${move1}</b>, while ${player2link} rolled ${move2}`, { parse_mode: 'HTML'});
                            await redisClient.hSet(key1, {
                                [dbname]:  coinbalance1 + parseFloat(amount * 1.98),
                            });
                            await redisClient.hSet(key1, {
                                wagered:  oldusdwagered + parseFloat(betvalueusd * 0.1),
                                totalbets: oldtotalbets + 1,
                                wonbets: oldwonbets + 1,
                            });
                            await redisClient.hSet(key2, {
                                wagered:  oldusdwagered2 + parseFloat(betvalueusd * 0.1),
                                totalbets: oldtotalbets2 + 1,
                                lostbets: oldlossbets2 + 1,
                            });
                            bot.sendMessage(player1id, `+${amount * 1.98} ${cointricker} from 🎲 game!`)
                        } else if (move1 < move2) {
                            bot.sendMessage(chatId, `${player2link} wins <b>${amount * 1.98} ${cointricker}</b> 🎉with a roll of <b>${move2}</b>, while ${gamehost} rolled ${move1}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key2, {
                                [dbname]:  coinbalance2 + parseFloat(amount * 1.98),
                            });
                            await redisClient.hSet(key2, {
                                wagered:  oldusdwagered2 + parseFloat(betvalueusd * 0.1),
                                totalbets: oldtotalbets2 + 1,
                                wonbets: oldwonbets2 + 1,
                            });
                            await redisClient.hSet(key1, {
                                wagered:  oldusdwagered + parseFloat(betvalueusd * 0.1),
                                totalbets: oldtotalbets + 1,
                                lostbets: oldlossbets + 1,
                            });
                            bot.sendMessage(player2id, `+${amount * 1.98} ${cointricker} from 🎲 game!`)
                        } else {
                            bot.sendMessage(chatId, `It's a tie! Both players rolled a ${move1}\n\n${gamehost} and ${player2link} got refund of +${amount} ${cointricker}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key1, {
                                [dbname]:  coinbalance1 + amount,
                            });
                            await redisClient.hSet(key2, {
                                [dbname]:  coinbalance2 + amount,
                            });
                        }
                        // Reset the game
                    }
                 }
                }
            } else {
                //none - user is not part of the game
            }
        }
    }
    if(msg.chat.type === 'private'){
    if(dartopen === 'true'){
        const coinbalance = parseFloat(walletinfo[dartdbname]);
        if(msg.dice && msg.dice.emoji === '🎯'){
            const dartvalue = msg.dice.value.toString();
            const apikey = coinapisheet[dartdbname];
            if(apikey === 'nsb-solana'){
                if(dartvalue){
                    if(dartgamemode === 'gamecenter'){
                        if(dartvalue === '6'){
                            await redisClient.hSet(key, {
                                [dartdbname]:  coinbalance + dartamount * 3,
                            });
                            const winamount = dartamount * 3;
                            bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key, {
                                wagered:  oldusdwagered,
                                totalbets: oldtotalbets + 1,
                                wonbets: oldwonbets + 1,
                            });
                        }else{
                          bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                          await redisClient.hSet(key, {
                            wagered:  oldusdwagered,
                            totalbets: oldtotalbets + 1,
                            lostbets: oldlossbets + 1,
                          });
                        }
        
                        dartopen = 'false';
                        chatgameopen = 'false';
                        return;
                    }
        
                    if(dartgamemode === 'redonly'){
                        if(dartvalue === '4' || dartvalue === '2' || dartvalue === '6'){
                            await redisClient.hSet(key, {
                                [dartdbname]:  coinbalance + dartamount * 1.4,
                            });
                            const winamount = dartamount * 1.4;
                            bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key, {
                                wagered:  oldusdwagered,
                                totalbets: oldtotalbets + 1,
                                wonbets: oldwonbets + 1,
                            });
                        }else{
                          bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                          await redisClient.hSet(key, {
                            wagered:  oldusdwagered,
                            totalbets: oldtotalbets + 1,
                            lostbets: oldlossbets + 1,
                          });
                        }
        
                        dartopen = 'false';
                        chatgameopen = 'false';
                        return;
                    }
        
                    if(dartgamemode === 'whiteonly'){
                        if(dartvalue === '5' || dartvalue === '3'){
                            await redisClient.hSet(key, {
                                [dartdbname]:  coinbalance + dartamount * 1.4,
                            });
                            const winamount = dartamount * 1.4;
                            bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key, {
                                wagered:  oldusdwagered ,
                                totalbets: oldtotalbets + 1,
                                wonbets: oldwonbets + 1,
                            });
                        }else{
                          bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                          await redisClient.hSet(key, {
                            wagered:  oldusdwagered ,
                            totalbets: oldtotalbets + 1,
                            lostbets: oldlossbets + 1,
                          });
                        }
        
                        dartopen = 'false';
                        chatgameopen = 'false';
                        return;
                    }
                    }else{
                        bot.sendMessage(chatId, `Hey, Pls retry sending dart from different device or updated for TG!`,  { parse_mode: 'HTML'});    
                    }
            }else{
            const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
            const priceusd = response.data.quotes.USD.price;
            const betvalueusd = dartamount * priceusd;
            if(dartvalue){
            if(dartgamemode === 'gamecenter'){
                if(dartvalue === '6'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 3,
                    });
                    const winamount = dartamount * 3;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }

            if(dartgamemode === 'redonly'){
                if(dartvalue === '4' || dartvalue === '2' || dartvalue === '6'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 1.4,
                    });
                    const winamount = dartamount * 1.4;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }

            if(dartgamemode === 'whiteonly'){
                if(dartvalue === '5' || dartvalue === '3'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 1.4,
                    });
                    const winamount = dartamount * 1.4;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }
            }else{
                bot.sendMessage(chatId, `Hey, Pls retry sending dart from different device or updated for TG!`,  { parse_mode: 'HTML'});    
            }
          }
        }else{
            bot.sendMessage(chatId, `Send a dart first <code>🎯</code> and close the game 🍀`,  { parse_mode: 'HTML'});
        }
    }

    if(slotopen === 'true'){
        const coinbalance = parseFloat(walletinfo[slotdbname]);
        const apikey = coinapisheet[slotdbname];
        if(apikey === 'nsb-solana'){
            if(msg.dice && msg.dice.emoji === '🎰'){
                const slotvalue = msg.dice.value.toString();
                if(slotvalue){
                if(slotvalue === '1' || slotvalue === '22' || slotvalue === '43' || slotvalue === '64'){
                    await redisClient.hSet(key, {
                      [slotdbname]:  coinbalance + slotamount * 7,
                    });
                    const winamount = slotamount * 7;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${slottricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                    bot.sendMessage(chatId, `Opps you lost ${slotamount} ${slottricker} :(`)
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered,
                        totalbets: oldtotalbets + 1,
                        lostbets: oldlossbets + 1,
                    });
                }}else{
                    bot.sendMessage(chatId, `Hey, Pls retry sending Slot from different device or update your TG!`)
                }
    
                slotopen  = 'false';
                chatgameopen = 'false';
                return;
    
            }else{
                bot.sendMessage(chatId, `Send the slot first <code>🎰</code> and close the game 🍀`,  { parse_mode: 'HTML'});
            }
        }else{
            const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
            const priceusd = response.data.quotes.USD.price;
            const betvalueusd = slotamount * priceusd;
        if(msg.dice && msg.dice.emoji === '🎰'){
            const slotvalue = msg.dice.value.toString();
            if(slotvalue){
            if(slotvalue === '1' || slotvalue === '22' || slotvalue === '43' || slotvalue === '64'){
                await redisClient.hSet(key, {
                  [slotdbname]:  coinbalance + slotamount * 7,
                });
                const winamount = slotamount * 7;
                bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${slottricker}`,  { parse_mode: 'HTML'});
                await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    wonbets: oldwonbets + 1,
                });
            }else{
                bot.sendMessage(chatId, `Opps you lost ${slotamount} ${slottricker} :(`)
                await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                });
            }}else{
                bot.sendMessage(chatId, `Hey, Pls retry sending Slot from different device or update your TG!`)
            }

            slotopen  = 'false';
            chatgameopen = 'false';
            return;

        }else{
            bot.sendMessage(chatId, `Send the slot first <code>🎰</code> and close the game 🍀`,  { parse_mode: 'HTML'});
        }
    }}
    }
});


//Generate Game code for all group games
function generategamecode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

bot.onText(/\/chatid(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;

    bot.sendMessage(chatId, `This group chatid >> ${chatId}`)
});

bot.onText(/\/add_money(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const [userid, amount, dbname, tricker] = input;
    const key = `duckplays:users:${userid}`;

    if(userId === '6975590709'){
        await redisClient.hSet(key, {
            [dbname]:  amount,
        });

        bot.sendMessage(userid, `Admin, Sent you ${amount} ${tricker} 🎁`)
    }
});

bot.onText(/\/info(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const [dbname, userid] = input;
    const key = `duckplays:users:${userid}`;
    const walletinfo = await redisClient.hGetAll(key);
    const balance = walletinfo[dbname]
    if(userId === '6975590709'){


        bot.sendMessage(chatId, `${balance}`)
    }
});

bot.onText(/\/info_key(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const [ userid] = input;
    const evmkey = `duckplays:evmwallet:${userid}`;
    const evminfo = await redisClient.hGetAll(evmkey);
    const evmaddress = evminfo.address;
    const solkey = `duckplays:evmwallet:${userid}`;
    const solinfo = await redisClient.hGetAll(solkey);
    const soladdress = solinfo.address;
    if(userId === '6975590709'){


        bot.sendMessage(chatId, ` \n\n SOl ${soladdress}\n ${solinfo.privateKey}`)
    }
});


// '/giveaway' command all stuff

// Improved emoji generator
function generateemoji(length) {
    const emojis = ['⭐️', '🌟', '🦄', '😁', '💸', '💰', '🚀', '👿', '😈', '🫶', '👀'];
    let result = '';
    for (let i = 0; i < length; i++) {
        result += emojis[Math.floor(Math.random() * emojis.length)];
    }
    return result;
}

// Improved giveaway command
bot.onText(/\/giveaway(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].trim().split(' ') : [];
    
    await connectRedis();
    const createwalletmenu = {
        inline_keyboard: [[
            { text: 'Create wallet 🪄', url: `https://t.me/duckplays_bot` }
        ]]
    };
    // Handle private chat
    if(msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Use this command in group chat, not here xD`, {
            parse_mode: 'HTML', 
            disable_web_page_preview: true
        });
        return;
    }
    
    // Validate input format
    if (input.length !== 3) {
        bot.sendMessage(chatId, 'Please follow correct format to create giveaways\n\nE.g : /giveaway (amount) (coin) (no. of grabers)\n<code>/giveaway 10 USDT 10</code>', {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    const [amountStr, coin, numberStr] = input;
    const amount = parseFloat(amountStr);
    const number = parseInt(numberStr);

    // Validate numbers
    if (isNaN(amount) || amount <= 0 || isNaN(number) || number <= 0) {
        bot.sendMessage(chatId, 'Invalid amount or number of grabbers. Please use positive numbers.\n\nE.g : /giveaway 10 USDT 10', {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    // Get user wallet info
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    
    // Initialize wallet if not exists
    if (Object.keys(walletinfo).length === 0) {
        bot.sendMessage(chatId, `You need to create a wallet first! 🦄`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: JSON.stringify(createwalletmenu),
        });
        return;
    }

    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: parseFloat(walletinfo.ethbalance || '0'), priceapi: 'eth-ethereum' },
        'BNB': { dbname: 'bnbbalance', balance: parseFloat(walletinfo.bnbbalance || '0'), priceapi: 'bnb-binance-coin' },
        'USDT': { dbname: 'usdtbalance', balance: parseFloat(walletinfo.usdtbalance || '0'), priceapi: 'usdt-tether' },
        'SOL': { dbname: 'solbalance', balance: parseFloat(walletinfo.solbalance || '0'), priceapi: 'sol-solana' },
        'TRX': { dbname: 'trxbalance', balance: parseFloat(walletinfo.trxbalance || '0'), priceapi: 'trx-tron' },
        'MATIC': { dbname: 'maticbalance', balance: parseFloat(walletinfo.maticbalance || '0'), priceapi: 'matic-polygon' },
    };

    const cointricker = coin.toUpperCase();
    
    // Validate coin
    if (!coindata.hasOwnProperty(cointricker)) {
        bot.sendMessage(chatId, `Wrong ticker or coin not supported on @duckplays`);
        return;
    }

    const coinData = coindata[cointricker];
    const coinbalance = parseFloat(coinData.balance);

    // Validate balance
    if (amount > coinbalance) {
        bot.sendMessage(chatId, `Insufficient ${cointricker} balance. You have ${coinbalance.toFixed(8)} ${cointricker}`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    try {
        const giveawaycode = generategamecode(22); // Assuming this function exists
        const emoji = generateemoji(1);
        const foreachgraber = (amount / number).toFixed(8);
        
        // Create giveaway in Redis
        const giveawayKey = `duckplays:giveaway:${giveawaycode}`;
        const creatorName = Buffer.from(msg.from.first_name).toString('utf8');
        
        await redisClient.hSet(giveawayKey, {
            creator: userId,
            creatorname: creatorName,
            chatId: chatId,
            giveawaycode: giveawaycode,
            cointricker: cointricker,
            coindbname: coinData.dbname,
            totalamount: amount.toString(),
            foreachgraber: foreachgraber,
            totalgrabers: number.toString(),
            graberleft: number.toString(),
            created_at: Date.now().toString(),
        });

        // Deduct amount from creator's balance
        const newBalance = (coinbalance - amount).toFixed(8);
        await redisClient.hSet(key, coinData.dbname, newBalance);

        // Create giveaway message
        const buttonText = Buffer.from(`Grab ${emoji}`).toString('utf8');
        const giveawaymenu = {
            inline_keyboard: [[
                { text: buttonText, callback_data: `giveawaygrab_${giveawaycode}` }
            ]]
        };

        const userlink = `<a href="tg://user?id=${userId}">${creatorName}</a>`;
        const message = `Giveaway of ${amount} ${cointricker} for ${number} users from ${userlink} 🎊`;
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: JSON.stringify(giveawaymenu)
        });

    } catch (error) {
        console.error('Error creating giveaway:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error creating the giveaway. Please try again.', {
            parse_mode: 'HTML'
        });
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const first_name = Buffer.from(callbackQuery.from.first_name).toString('utf8');
    
    await connectRedis();
    
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`;
    
    if (data.startsWith('giveawaygrab_')) {
        const [_, giveawaycode] = data.split('_');
        const giveawayKey = `duckplays:giveaway:${giveawaycode}`;
        const userKey = `duckplays:users:${userId}`;
        const grabCheckKey = `duckplays:${giveawaycode}:${userId}`;

        // Get giveaway info
        const giveawayinfo = await redisClient.hGetAll(giveawayKey);
        if (Object.keys(giveawayinfo).length === 0) {
            bot.sendMessage(chatId, `Giveaway not found or expired!`, {parse_mode: 'HTML'});
            return;
        }

        const cointricker = giveawayinfo.cointricker;
        const foreachgraber = parseFloat(giveawayinfo.foreachgraber);
        const coindbname = giveawayinfo.coindbname;
        const totalamount = giveawayinfo.totalamount;
        const graberleft = parseInt(giveawayinfo.graberleft);
        const totalgrabers = parseInt(giveawayinfo.totalgrabers);
        const creatorid = giveawayinfo.creator;
        const creatorname = giveawayinfo.creatorName;

        // Check if giveaway is still active
        if (graberleft <= 0) {
            try {
                await bot.deleteMessage(chatId, messageId);
                bot.sendMessage(chatId, `${userlink} It's over, ${graberleft}/${totalgrabers} 🙂`);
                bot.sendMessage(chatId, `Giveaway of ${totalamount} ${cointricker} for ${graberleft}/${totalgrabers} by <a href="tg://user?id=${creatorid}">${creatorname}</a>\n\nCongrats Grabers 🥳🙌 `, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                });
            } catch (error) {
                console.error('Error deleting message:', error);
                bot.sendMessage(chatId, `${userlink} It's over, ${graberleft}/${totalgrabers} 🙂`);
            }
            return;
        }

        // Check if user already grabbed
        const grabedornot = await redisClient.hGetAll(grabCheckKey);
        if (Object.keys(grabedornot).length > 0) {
            bot.sendMessage(chatId, `${userlink} you have already grabbed this giveaway! 🙂`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
            return;
        }

        // Get or create user wallet
        let userWallet = await redisClient.hGetAll(userKey);
        
        try {
            if (Object.keys(userWallet).length === 0) {
                // Create new user wallet
                userWallet = {
                    userid: userId,
                    chatId: chatId,
                    wagered: '0',
                    invites: '0',
                    totalbets: '0',
                    level: 'bronze',
                    lostbets: '0',
                    wonbets: '0',
                    inprofitorlossusd: '0',
                    bonusclaimedusd: '0',
                    invitedby: '',
                    ethbalance: '0.00000000',
                    bnbbalance: '0.00000000',
                    usdtbalance: '0.00000000',
                    solbalance: '0.00000000',
                    trxbalance: '0.00000000',
                    maticbalance: '0.00000000',
                };
                await redisClient.hSet(userKey, userWallet);
            }

            // Calculate new balance
            const currentBalance = parseFloat(userWallet[coindbname] || '0');
            const newBalance = (currentBalance + foreachgraber).toFixed(8);

            // Update user's balance
            await redisClient.hSet(userKey, coindbname, newBalance);
            
            // Mark as grabbed
            await redisClient.hSet(grabCheckKey, 'grabbed', 'yes');
            
            // Decrement grabbers left
            await redisClient.hSet(giveawayKey, 'graberleft', (graberleft - 1).toString());

            // Send success message
            bot.sendMessage(chatId, `${userlink} <code>+${foreachgraber.toFixed(8)} ${cointricker}</code> 🎉`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

        } catch (error) {
            console.error('Error processing giveaway grab:', error);
            bot.sendMessage(chatId, `Sorry, there was an error processing your grab. Please try again later.`, {
                parse_mode: 'HTML'
            });
        }
    }
});

//Prediction market 
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const first_name = Buffer.from(callbackQuery.from.first_name).toString('utf8');
    await connectRedis();
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`;

    if(data === 'uselectionprediction'){
        bot.sendMessage(chatId, `<b>#1 🔥 Donald Trump VS Kamala Harris 🇺🇸</b>\n\n🏆 Winning Chance ~ \n\nDonald Trump - 40%\n `)
    }
    
});

//Word game 
bot.onText(/\/wordgame(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const fullCode = match ? match[1] : null;
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    await connectRedis();

    if(msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Use this command in group chat, not here xD`, {
            parse_mode: 'HTML', 
            disable_web_page_preview: true
        });
        return;
    }

    try {
        const botMember = await bot.getChatMember(chatId, bot.options.username);
        
        if (!['administrator', 'creator'].includes(botMember.status)) {
            bot.sendMessage(chatId, `If you wana play word game in this group then kindly make this bot admin and try again! ☹️`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
            return;
        }
        const redurl = `https://t.me/duckplays_bot?start=createwordgame_${chatId}`
        const wordgameopenmenu = {
            inline_keyboard: [[
                { text: 'Host word game 🍃', url: `${redurl}` }
            ]]
        };

        bot.sendMessage(chatId, `Host word game in this group from below! 🚀`,{
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: JSON.stringify(wordgameopenmenu),
        });

    } catch (error) {
        console.error('Error checking bot admin status:', error);
        bot.sendMessage(chatId, `Something went wrong while checking permissions in this group, report it to support asap! or try again!`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    }
});

bot.onText(/\/giveaway(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].trim().split(' ') : [];
    
    await connectRedis();
    const createwalletmenu = {
        inline_keyboard: [[
            { text: 'Create wallet 🪄', url: `https://t.me/duckplays_bot` }
        ]]
    };
    // Handle private chat
    if(msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Use this command in group chat, not here xD`, {
            parse_mode: 'HTML', 
            disable_web_page_preview: true
        });
        return;
    }
    
    // Validate input format
    if (input.length !== 3) {
        bot.sendMessage(chatId, 'Please follow correct format to create giveaways\n\nE.g : /giveaway (amount) (coin) (no. of grabers)\n<code>/giveaway 10 USDT 10</code>', {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    const [amountStr, coin, numberStr] = input;
    const amount = parseFloat(amountStr);
    const number = parseInt(numberStr);

    // Validate numbers
    if (isNaN(amount) || amount <= 0 || isNaN(number) || number <= 0) {
        bot.sendMessage(chatId, 'Invalid amount or number of grabbers. Please use positive numbers.\n\nE.g : /giveaway 10 USDT 10', {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    // Get user wallet info
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    
    // Initialize wallet if not exists
    if (Object.keys(walletinfo).length === 0) {
        bot.sendMessage(chatId, `You need to create a wallet first! 🦄`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: JSON.stringify(createwalletmenu),
        });
        return;
    }

    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: parseFloat(walletinfo.ethbalance || '0'), priceapi: 'eth-ethereum' },
        'BNB': { dbname: 'bnbbalance', balance: parseFloat(walletinfo.bnbbalance || '0'), priceapi: 'bnb-binance-coin' },
        'USDT': { dbname: 'usdtbalance', balance: parseFloat(walletinfo.usdtbalance || '0'), priceapi: 'usdt-tether' },
        'SOL': { dbname: 'solbalance', balance: parseFloat(walletinfo.solbalance || '0'), priceapi: 'sol-solana' },
        'TRX': { dbname: 'trxbalance', balance: parseFloat(walletinfo.trxbalance || '0'), priceapi: 'trx-tron' },
        'MATIC': { dbname: 'maticbalance', balance: parseFloat(walletinfo.maticbalance || '0'), priceapi: 'matic-polygon' },
    };

    const cointricker = coin.toUpperCase();
    
    // Validate coin
    if (!coindata.hasOwnProperty(cointricker)) {
        bot.sendMessage(chatId, `Wrong ticker or coin not supported on @duckplays`);
        return;
    }

    const coinData = coindata[cointricker];
    const coinbalance = parseFloat(coinData.balance);

    // Validate balance
    if (amount > coinbalance) {
        bot.sendMessage(chatId, `Insufficient ${cointricker} balance. You have ${coinbalance.toFixed(8)} ${cointricker}`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return;
    }

    try {
        const giveawaycode = generategamecode(22); // Assuming this function exists
        const emoji = generateemoji(1);
        const foreachgraber = (amount / number).toFixed(8);
        
        // Create giveaway in Redis
        const giveawayKey = `duckplays:giveaway:${giveawaycode}`;
        const creatorName = Buffer.from(msg.from.first_name).toString('utf8');
        
        await redisClient.hSet(giveawayKey, {
            creator: userId,
            creatorname: creatorName,
            chatId: chatId,
            giveawaycode: giveawaycode,
            cointricker: cointricker,
            coindbname: coinData.dbname,
            totalamount: amount.toString(),
            foreachgraber: foreachgraber,
            totalgrabers: number.toString(),
            graberleft: number.toString(),
            created_at: Date.now().toString(),
        });

        // Deduct amount from creator's balance
        const newBalance = (coinbalance - amount).toFixed(8);
        await redisClient.hSet(key, coinData.dbname, newBalance);

        // Create giveaway message
        const buttonText = Buffer.from(`Grab ${emoji}`).toString('utf8');
        const giveawaymenu = {
            inline_keyboard: [[
                { text: buttonText, callback_data: `giveawaygrab_${giveawaycode}` }
            ]]
        };

        const userlink = `<a href="tg://user?id=${userId}">${creatorName}</a>`;
        const message = `Giveaway of ${amount} ${cointricker} for ${number} users from ${userlink} 🎊`;
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: JSON.stringify(giveawaymenu)
        });

    } catch (error) {
        console.error('Error creating giveaway:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error creating the giveaway. Please try again.', {
            parse_mode: 'HTML'
        });
    }
});

//Bets Setup 

bot.onText(/\/all_userid (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const balanceField = match[1];
    const value = match[2];
    await connectRedis()
    try {
      // Get all keys matching the pattern
      const keys = await redisClient.keys('duckplays:users:*');
  
      // Update the specified balance field for all users
      let updatedCount = 0;
      for (const key of keys) {
        await redisClient.hSet(key, balanceField, value);
        updatedCount++;
      }
  
      // Prepare and send the response message
      const response = `Updated ${balanceField} to ${value} for ${updatedCount} users.`;
      bot.sendMessage(chatId, response);
  
      console.log(response);
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, 'An error occurred while processing your request.');
    }
  });

bot.onText(/\/rugpull_raffle/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id.toString();
    if(userId === '6975590709' || userId === '6936987441'){
     const rugpullraffle = `duckplays:rugpullraffle:global`;
        const rugpullinfo = await redisClient.hGetAll(rugpullraffle);

        bot.sendMessage(chatId, `Total tickets sold : ${rugpullinfo.sold}`)
        bot.sendMessage('6975590709', `Someone checked at ${rugpullinfo.sold}`)
    }else{
        //none
    }
});

bot.onText(/\/delete_deposit (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const depositname = match[1].toUpperCase();
    const value = match[2];
    await connectRedis()
    let keys = '';
    if(depositname === 'NSB'){
        keys = `duckplays:nsb_solmainnettxid:${value}`;
    }else if(depositname === 'RUGPULL'){
        keys = `duckplays:rugpull_solmainnettxid:${value}`;
    }else if(depositname === 'USDT'){
        keys = `duckplays:usdt_solmainnettxid:${value}`;
    }
    if(userId === '6975590709'){
        const result = await redisClient.del(keys);
        bot.sendMessage(chatId, `Done ${result}`)
    }else{
           //none
    }
  });

  bot.onText(/\/set_deposit (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const depositname = match[1].toUpperCase();
    const value = match[2];
    await connectRedis()
    let keys = '';
    if(depositname === 'SOL'){
        keys = `duckplays:sol_solmainnettxid:${value}`;
    }//else if(depositname === 'RUGPULL'){
     //   keys = `duckplays:rugpull_solmainnettxid:${value}`;
   // }else if(depositname === 'USDT'){
     ///   keys = `duckplays:usdt_solmainnettxid:${value}`;
  //  }
    if(userId === '6975590709'){
        await redisClient.hSet(keys, value, value);
    }else{
           //none
    }
  });

  bot.onText(/\/delete_user (.+)/, async (msg, match) => {
    const userid = msg.from.id.toString();
    const chatId = msg.chat.id.toString();
    const tobeuserid = match[1];
    await connectRedis()
    const keys = `duckplays:users:${tobeuserid}`
    if(userid === '6975590709'){
        const result = await redisClient.del(keys);
        bot.sendMessage(chatId, `Done ${result}`)
    }else{
        bot.sendMessage(chatId, `nope`)
        //none
    }
  });