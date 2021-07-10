import { User } from "discord.js";

export class GameUser {
    public channelId = "";
    public id;
    private user;
    constructor(user: User){
        this.user = user;
        this.id = user.id;
    }

    setChannelId(n: string){
        this.channelId = n;
        return;
    }
}