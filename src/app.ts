import { Client, Message, CollectorFilter } from "discord.js";
import {bot_token, owner_id} from "../config.json";
let client = new Client();

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
        const filter:CollectorFilter = function (msg: Message) {
            return msg.author.id == message.author.id && msg.guild == message.guild;
        };
        message.reply("please enter the title:");
        let collector1 = await message.channel.awaitMessages(filter, {max: 1, time: 30000, errors: ['time']});
        let title = collector1.first()?.content;
        message.reply("please enter the description:");
        let collector2 = await message.channel.awaitMessages(filter, {max: 1, time: 30000, errors: ['time']});
        let desc = collector2.first()?.content;
        // TODO: handle timeout event
        // TODO: insert title, desc into Game table
        message.channel.send(`Successfully create new game with title "${title}", description "${desc}"`)
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