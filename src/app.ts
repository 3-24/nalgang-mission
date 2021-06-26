import { Client, Message } from "discord.js";
import {bot_token, owner_id} from "../config.json";
let client = new Client();

client.once('ready', () => {
    if (client.user == null){
        console.log("FATAL");
        return;
    }
    client.user.setActivity("bet.help", {type: "LISTENING"})
});

client.on('message', (message: Message) => {
    const prefix = 'bet.'
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift();
    if (command == "help"){
        message.channel.send("On construction")
        // TODO
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