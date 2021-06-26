import { Client, Message } from "discord.js";
import {bot_token, owner_id} from "../config.json";
let client = new Client();
client.on('message', (message: Message) => {
    const prefix = 'bet.'
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift();
    if (command == "shutdown"){
        if (message.author.id == owner_id){
            message.channel.send("Shutting down...").then(m=>{
                client.destroy();
            });
        }
    }
});
client.login(bot_token);