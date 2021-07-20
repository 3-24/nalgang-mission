import { User, Guild, Message, TextChannel, CollectorFilter, Collection } from "discord.js";
import axios from "axios";

const nalgangId = "692341237302165554";

export class GameUser {
    public channel: TextChannel;
    public guild: Guild;
    public user: User;

    constructor(channel: TextChannel, guild: Guild, user: User){
        this.channel = channel;
        this.guild = guild;
        this.user = user;
    }

    async getUserNalgangPoint(): Promise<number> {
        const response = await axios.get(`http://api.youngseok.dev/nalgang?guild=${this.guild.id}&id=${this.user.id}`);
        if (response["status"] !== 200 || !response.hasOwnProperty("data")){
            throw new Error("API request failed");
        }
        else return response["data"];
    }
    
    async addUserNalgangPoint(point: number): Promise<boolean>{
        await this.channel.send(`!점수추가 ${this.user} ${point}`);
        const filter:CollectorFilter = (msg: Message)  => (msg.author.id === nalgangId && msg.channel === this.channel)
        let collector: Collection<string, Message>;
        try {
            collector = await this.channel.awaitMessages(filter, {max: 1, time: 5000, errors: ['time']});
        } catch (err) {
            throw err;
        }

        return (collector.first()?.content !== "점수가 부족합니다");
    }
}