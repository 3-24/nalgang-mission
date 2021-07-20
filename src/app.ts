import { Client, Message, CollectorFilter, TextChannel, Guild } from "discord.js";
import { bot_token, owner_id } from "../config.json";
import { DatabaseCursor } from "./database";
import { GameUser } from "./user";
let client = new Client();

const timeoutAnswer:string = "Bye-bye, little challenger!";         // TODO: more reactions!
export const timeout = 30000;      // 30s
const databaseErrorAnswer:string = "Error on database. Maybe our query is caught by curious fairies.."
const unknownErrorAnswer:string = "Some nasty bug is caught :("
let cursor: DatabaseCursor;
const titleLengthLimit: number = 200;
const descriptionLengthLimit: number = 1000;
const STATUS_OPEN = 0;
const STATUS_CLOSED = 1;
const STATUS_END = 2;
const STATUS_LOCK = 3;
const BET_SUCCESS  = true;
const BET_FAIL = false;

async function getOneInput(message: Message){
    const filter:CollectorFilter = function (msg: Message) {
        return msg.author.id == message.author.id && msg.guild == message.guild;
    };

    const collector = await message.channel.awaitMessages(filter, {max: 1, time: timeout, errors: ['time']})
    .catch (function(_){message.reply(timeoutAnswer);});

    return collector?.first()?.content;
}

async function getSuccessOrFail(message: Message): Promise<boolean | undefined>{
    const questionMessage = await message.reply("success or fail?");
    await Promise.all([
        questionMessage.react('⭕'),
        questionMessage.react('❌')
    ]);
    const filter:CollectorFilter = function (reaction, user){
        return ['⭕', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
    }

    return new Promise((resolve, reject) => {
        questionMessage.awaitReactions(filter, {max: 1, time: timeout, errors: ['time']})
        .then(collected => {
            const reaction = collected.first();
            if (reaction === undefined) reject(undefined);
            else if (reaction.emoji.name === '⭕') resolve(BET_SUCCESS);
            else resolve(BET_FAIL);
        })
        .catch(collected => {
            message.reply(timeoutAnswer);
            reject(undefined);
        })
    });
}

async function getNumberInput(message: Message): Promise<number> {
    const numberInputString: undefined | string = await getOneInput(message);
    if (numberInputString === undefined) throw "No input";
    const number: number = parseInt(numberInputString, 10);
    if (number === NaN) throw "NaN";
    else return number;
}

async function findGameLexicallyWithInput(channelId: string, status: number | number[], message: Message): Promise<undefined | number> {
    message.reply("Enter the title:")
    const searchString : undefined | string = await getOneInput(message);
    if (searchString === undefined){
        return undefined;
    }
    return await findGameLexically(searchString, channelId, status, message);
}

async function findGameLexically(searchString: string, channelId: string, status: number | Array<number>, message: Message): Promise<undefined|number> {
    let statusArray: number[];
    if (typeof status === "number"){statusArray = [status]}
    else statusArray = status;
    let rows: Array<Record<string, number|string>> = [];
    for (const s of statusArray){
        rows = rows.concat(await cursor.getGameListByTitle(channelId, s, searchString))
    }
    if (rows.length === 0){
        await message.reply("No such title :(")
        return undefined;
    }
    else {
        if (rows.length > 1){
            await message.reply("There are many results:");
            for (const [index, row] of rows.entries()){
                await message.reply( `${index}. ${row["title"]}`);
            }
            await message.reply("Please answer the number of your intended title:")
            const numberInput: number = await getNumberInput(message);
            const row = rows[numberInput];
            if ("game_id" in row){
                return row["game_id"] as number;
            } else {
                await message.reply("Unexpected number input..");
                return undefined;
            }
        } else {
            return rows[0]["game_id"] as number;
        }
    }
}

client.once('ready', () => {
    if (client.user == null){
        console.error("FATAL");
        return;
    }
    client.user.setActivity("bet.help", {type: "LISTENING"})
    cursor = new DatabaseCursor();
    cursor.initTable();
    console.log("nalgang-mission is ready.");
});

client.on('message', async (message: Message) => {
    const prefix = 'bet.'
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift();
    let gameUser: GameUser;
    if (!(message.channel instanceof TextChannel && message.guild !== null) ){
        return;
    }
    try{
        gameUser = new GameUser(message.channel, message.guild, message.author);
    } catch (e){
        return;
    }

    if (command == "help"){
        message.channel.send("On construction")
        // TODO: Send help embed message
    }
    else if (command == "new"){
        message.reply("please enter the title:");
        const title = await getOneInput(message);
        if (title === undefined){
            message.reply(`No input.`);
            return;
        }
        if (title.length > titleLengthLimit){
            message.reply(`Title should not exceed the length limit ${titleLengthLimit} characters`);
            return;
        }
        message.reply("please enter the description:");
        const desc = await getOneInput(message);
        if (desc === undefined){
            message.reply(`No input.`);
            return;
        }
        if (desc.length > descriptionLengthLimit){
            message.reply(`Description should not exceed the length limit ${descriptionLengthLimit} characters`);
        }
        try {
            await cursor.addGame(title, desc, gameUser.user.id, gameUser.channel.id, STATUS_OPEN)
            message.channel.send(`Successfully created new game with title "${title}", description "${desc}"`);
        }
        catch (err){ message.channel.send(databaseErrorAnswer); }
        return;
    }
    else if (command == "open" || command === "close"){
        const beforeStatus: number = (command === "open") ? STATUS_CLOSED : STATUS_OPEN;
        const afterStatus: number = (command === "open") ? STATUS_OPEN : STATUS_CLOSED;

        const lineInput: string = message.content.slice((prefix.length + command.length)).trim();
        const gameId: number | undefined = await findGameLexically(lineInput, message.channel.id, beforeStatus, message);
        if (gameId === undefined) return;
        try {
            await cursor.changeGameStatus(gameId, afterStatus);
            const game: Record<string, string|number> = (await cursor.getGameById(gameId)) as Record<string, string|number>;
            message.channel.send(`Successfully ${(command === "open") ? "opened" : "closed"} the game "${game["title"]}"`)
        } catch (err) {message.channel.send(databaseErrorAnswer);}
        return;
    }
    else if (command == "bet"){
        const game_id : number | undefined = await findGameLexicallyWithInput(gameUser.channel.id, STATUS_OPEN, message);
        if (game_id === undefined) return;
        const is_success: boolean | undefined = await getSuccessOrFail(message);
        if (is_success === undefined) return;
        if (await cursor.isFenceSitter(gameUser.user.id, game_id, is_success)){
            await message.reply("You cannot bet on both side.");
            return;
        }
        const userNalgangPoint: number = await gameUser.getUserNalgangPoint()
        message.reply("bet amount:");
        let bet_amount: number;
        try {
            bet_amount = await getNumberInput(message);
        } catch (err){
            await message.reply("Unexpected number input");
            return;
        }
        if (bet_amount <= 0){
            await message.reply("Invalid bet amount");
            return;
        }
        if (bet_amount > userNalgangPoint){
            await message.reply("Not enough points.");
            return;
        }

        if (!await gameUser.addUserNalgangPoint(-bet_amount)){
            return;
        }

        try {await cursor.addBet(game_id, gameUser.user.id, is_success, bet_amount)}
        catch (err) {message.reply(databaseErrorAnswer)};
        return;
    }
    else if (command == "end"){
        const game_id : number | undefined = await findGameLexicallyWithInput(gameUser.channel.id, STATUS_CLOSED, message);
        if (game_id === undefined) return;
        try {
            await cursor.changeGameStatus(game_id, STATUS_LOCK);
        } catch(err){
            await message.reply(databaseErrorAnswer);
            return;
        }
        try {
            const row: Record<string, number|string> = await cursor.getGameById(game_id);
            if (row["user_id"] !== gameUser.user.id){
                message.reply("You are not the owner of the game!");
                return;
            }
        } catch (err){
            message.reply(databaseErrorAnswer);
            return;
        }
        const is_success: boolean | undefined = await getSuccessOrFail(message);
        if (is_success === undefined) return;
        let sums : [number, number];
        try{
            sums = await cursor.getGameBetPointSum(game_id);
        } catch(err){
            await message.reply(databaseErrorAnswer);
            return;
        }
        const sum_winning = sums[Number(is_success)];
        if (sum_winning === 0){
        }
        const sum_losing = sums[Number(!is_success)];
        const sum_total = sum_winning + sum_losing;

        let winningArray: Array<[string, number]>;
        try{winningArray = await cursor.getBetWinnerList(game_id, is_success);} catch(err){await message.reply(databaseErrorAnswer); return;}
        for (const [user_id, bet_amount] of winningArray){
            let winningUser;
            try{ winningUser = await client.users.fetch(user_id);} catch(err){await message.channel.send(unknownErrorAnswer); return;}
            const winningGameUser: GameUser = new GameUser(message.channel as TextChannel, message.guild as Guild, winningUser);
            await winningGameUser.addUserNalgangPoint(Math.floor(bet_amount * sum_total / sum_winning));
        }

        await message.reply("Ending process is done. I hope you are satisfied with the result :)");
        try {
            await cursor.changeGameStatus(game_id, STATUS_END);
        } catch(err){
            await message.reply(databaseErrorAnswer);
            return;
        }
    }
    else if (command == "status"){
        const game_id : number | undefined = await findGameLexicallyWithInput(gameUser.channel.id, [STATUS_OPEN, STATUS_CLOSED], message);
        if (game_id === undefined) return;
        const game: Record<string, number|string> = await cursor.getGameById(game_id);
        await message.reply(`
        title: ${game["title"]}
        description: ${game["description"]}
        registered by ${game["user_id"]}
        status: ${game["status"] ? "Closed" : "Open"}
        `);
        const [bet_fail, bet_success] : [number, number] = await cursor.getGameBetPointSum(game_id);
        const your_bet : [number, number] | [] = await cursor.getUserBet(message.author.id, game_id);
        message.reply(`
        Total bets on success: ${bet_success}
        Total bets on fail: ${bet_fail}
        ${(your_bet === []) ? "You didn't make any bet" : ("You betted on " + (your_bet[0] === 1 ? "success" : "fail") + " with " + (your_bet[1] ? your_bet[1] : 0) + " points")}
        `)
    }
    else if (command == "shutdown"){
        if (message.author.id == owner_id){
            message.channel.send("Shutting down...").then(m=>{
                client.destroy();
            });
        }
    }
});
client.login(bot_token);