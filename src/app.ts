import { Client, Message, CollectorFilter } from "discord.js";
import {bot_token, owner_id} from "../config.json";
let client = new Client();

const timeoutAnswer:string = "Bye-bye, little challenger!";         // TODO: more reactions!
const timeout = 30000;      // 30s

async function getOneInput(message: Message){
    const filter:CollectorFilter = function (msg: Message) {
        return msg.author.id == message.author.id && msg.guild == message.guild;
    };

    const collector = await message.channel.awaitMessages(filter, {max: 1, time: timeout, errors: ['time']})
    .catch (function(_){message.channel.send(timeoutAnswer);});

    return collector?.first()?.content;
}

client.once('ready', () => {
    if (client.user == null){
        console.log("FATAL");
        return;
    }
    client.user.setActivity("bet.help", {type: "LISTENING"})
});

client.on('message', async (message: Message) => {
    const prefix = 'bet.'
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift();
    if (command == "help"){
        message.channel.send("On construction")
        // TODO: Send help embed message
    }
    else if (command == "new"){
        message.reply("please enter the title:");
        let title = await getOneInput(message);
        message.reply("please enter the description:");
        let desc = await getOneInput(message);
        // TODO: handle timeout event
        // TODO: insert title, desc into Game table
        message.channel.send(`Successfully created new game with title "${title}", description "${desc}"`);
    }
    else if (command == "open"){
        // TODO: If the number of owned Games is <= 1, no interaction.
        message.reply("enter the title:")
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