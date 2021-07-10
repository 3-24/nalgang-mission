import { Client, Message, CollectorFilter } from "discord.js";
import { bot_token, owner_id } from "../config.json";
import { DatabaseCursor } from "./database";
import { GameUser } from "./user";
let client = new Client();

const timeoutAnswer:string = "Bye-bye, little challenger!";         // TODO: more reactions!
const timeout = 30000;      // 30s
const databaseErrorAnswer:string = "Error on database. Maybe our query is caught by curious fairies.."
let cursor: DatabaseCursor;
const titleLengthLimit: number = 200;
const descriptionLengthLimit: number = 1000;
const STATUS_OPEN = 0;
const STATUS_CLOSED = 1;
const STATUS_END = 2;

async function getOneInput(message: Message){
    const filter:CollectorFilter = function (msg: Message) {
        return msg.author.id == message.author.id && msg.guild == message.guild;
    };

    const collector = await message.channel.awaitMessages(filter, {max: 1, time: timeout, errors: ['time']})
    .catch (function(_){message.channel.send(timeoutAnswer);});

    return collector?.first()?.content;
}

async function findGameLexically(searchString: string, channelId: string, status: number, message: Message){
    const rows = await cursor.getGameListByTitle(channelId, status, searchString);
    console.log(rows);
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
    const gameUser: GameUser = new GameUser(message.author);
    gameUser.setChannelId(message.channel.id);

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
            await cursor.addGame(title, desc, gameUser.id, gameUser.channelId, STATUS_OPEN)
            message.channel.send(`Successfully created new game with title "${title}", description "${desc}"`);
        }
        catch (err){ message.channel.send(databaseErrorAnswer); }
        return;
    }
    else if (command == "open"){
        // TODO: If the number of owned Games is <= 1, no interaction.
        let res = findGameLexically("A", message.channel.id, STATUS_OPEN, message);
        
        // TODO: get collector
        // TODO: update the game status in database
    }
    else if (command == "close"){
        // TODO: If number of owned Game is <= 1, no interaction
        message.reply("enter the title:")
    }
    else if (command == "bet"){
        message.reply("enter the title of game to bet:");
        // TODO: get title response by text
        message.reply("success or fail?");
        // TODO: get emoji response
        message.reply("bet amount:");
        // TODO: get title response by text
    }
    else if (command == "end"){
        message.reply("enter the title of game to end:");
        // TODO: get title and match it with database
        message.reply("success or fail?");
        // TODO: get result by emoji
        // TODO: query the profits by winners
        message.reply("Ending process is done. I hope you are satisfied with the result :)");
    }
    else if (command == "status"){
        // TODO: specify which game?
        // TODO: show status of game(title, desc, yes/no amount)
    }
    else if (command == "mybets"){
        // TODO: show your bets
    }
    else if (command == "gamelist"){
        // TODO: get status: open(default), closed, idle
        // TODO: show game list
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