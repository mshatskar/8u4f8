//1


bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const fullCode = match ? match[1] : null; // get full code from the url like 'ref_xyz' from tg.bot/bot?start=ref_xyz
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    const xCodeMatch = fullCode ? fullCode.match(/^x_(.*)$/) : null;
    const refCodeMatch = fullCode ? fullCode.match(/^ref_(.*)$/) : null; //take refcodematch
    const profileCodeMatch = fullCode ? fullCode.match(/^profile_(.*)$/) : null;
    const createwordgameMatch = fullCode ? fullCode.match(/^createwordgame_(.*)$/) : null;

    await connectRedis();

    if (refCodeMatch) { //check that refcode match 
        const refcode = refCodeMatch[1]; //if it's 'ref_77' then refcode value will '77'
        //continue the function and stuff after getting the ref code
        
    } 
 
    //if user already exist or come without affilate
    if (msg.chat.type === 'private') {
        // if /start command used in private then what to do 
    }else{
       // if /start command sent in group chat or else then what to do 
    }
});
