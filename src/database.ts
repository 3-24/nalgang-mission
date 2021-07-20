import {Database} from "sqlite3";

const DEBUG = true;
let db_path = DEBUG ? ":memory:" : "./data/database.db";

export class Game{
    public id:number
    public title:string
    public description:string
    public user_id: string
    public channel_id: string
    public status: number
    constructor(id:number,title:string,description:string,user_id:string,channel_id:string,status:number){
        this.id = id;
        this.title = title;
        this.description = description;
        this.user_id = user_id;
        this.channel_id = channel_id;
        this.status = status;
    }
}

export class Bet{
    public game_id: number
    public user_id: string
    public success: number
    public bet_point: number
    constructor(game_id:number, user_id:string, success:number, bet_point:number){
        this.game_id = game_id;
        this.user_id = user_id;
        this.success = success;
        this.bet_point = bet_point;
    }
}

export class DatabaseCursor{
    private db
    constructor(){
        this.db = new Database(db_path, function (err: Error|null){
            if (err) console.error(err.message);
            else console.log("Connected to database.");
        });
    }

    initTable(){
        return new Promise((resolve, reject) => {
            this.db.exec(`CREATE TABLE IF NOT EXISTS Game(
                game_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                status INTEGER NOT NULL
                );`, (err: Error|null) => {
                    if (err === null){
                        this.db.exec(`CREATE TABLE IF NOT EXISTS Bet(
                            bet_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                            game_id INTEGER NOT NULL,
                            user_id TEXT NOT NULL,
                            success INTEGER NOT NULL,
                            bet_point INTEGER NOT NULL
                            );`, (err: Error|null) => {
                                if (err === null) resolve(null);
                                else reject(err);
                            });
                    }
                    else reject(err);
                });
        })}
    
    addGame(title:string, desc:string, user_id:string, channel_id:string, status:number){
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO Game(title,description,user_id,channel_id,status) VALUES (?,?,?,?,?);',
            [title, desc, user_id, channel_id, status],
            function(err: Error|null){
                if (err === null) resolve(null);
                else reject(err);
            });
        })
    }

    addBet(game_id: number, user_id: string, success:boolean, bet_point: number){
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO Bet(game_id, user_id, success, bet_point) VALUES (?,?,?,?);',
            [game_id, user_id, success, bet_point],
            (err: Error|null) => {
                if (err === null) resolve(err);
                else reject(err);
            })
        });
    }

    isFenceSitter(user_id: string, game_id: number, success: boolean){
        const int_success:number = success ? 1 : 0;
        return new Promise((resolve, reject) => {
            this.db.get('SELECT success FROM Bet WHERE user_id = ? AND game_id = ?', [user_id,game_id],
            (err:Error | null, row:any) => {
                if (err !== null) reject(err);
                else resolve(row ? row["success"] !== int_success : false );
            });
        });
    }


    getGameListByTitle(channel_id: string, status: Array<number>, text:string, like: boolean, sort: boolean, user_id:string): Promise<Array<Game>> {
        return new Promise((resolve, reject) => {
            const statusText = "("+status.map((x)=>{return "status = " + x.toString()}).join(" OR ")+")"
            this.db.all(`
                SELECT game_id, title, description, user_id, status 
                FROM Game 
                WHERE channel_id = ? AND `+statusText+` AND ${user_id ? "user_id ="+user_id+" AND": "" } title LIKE ? ${sort ? "ORDER BY title" : ""}`, 
            [channel_id, like? text+'%' : text],
            (err:Error | null, rows) => {
                if (err !== null) reject(err);
                else resolve(rows.map((x)=>{
                    return new Game(x["game_id"],x["title"], x["description"], x["user_id"],channel_id,x["status"])
                }))
            });
        });
    }
    
    getGameList(channel_id: string, status: Array<number>, like:boolean, sort:boolean, user_id:string): Promise<Array<Game>>{
        return this.getGameListByTitle(channel_id, status, "", like, sort,user_id);
    }

    changeGameStatus(game_id:number, status: number){
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE Game SET status = ? WHERE game_id = ?',[status, game_id],
            (err:Error | null) =>{
                if (err !== null) reject(err);
                else resolve(null);
            });
        })
    }

    getGameBetPointSum(game_id:number): Promise<[number, number]> {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT success, SUM(bet_point) AS sum FROM Bet WHERE game_id = ? GROUP BY success`, game_id,
            (err:Error | null, rows)=>{
                if (err !== null) reject(err);
                else {
                    let sum_success = 0;
                    let sum_fail = 0;
                    rows.forEach((value) => {
                        if (value["success"]) sum_success += value["sum"];
                        else sum_fail += value["sum"];
                    })
                    resolve([sum_fail, sum_success]);
                }
            });
        });
    }

    getUserBet(user_id:string, game_id:number): Promise<Bet>{
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT success, SUM(bet_point) AS bet_point FROM Bet WHERE user_id = ? AND game_id = ?`,[user_id, game_id], 
            (err:Error | null, row) => {
                if (err !== null) reject(err);
                else resolve(row ? new Bet(game_id, user_id, row["success"], row["bet_point"]) : new Bet(game_id, user_id, -1, 0));
            });
        })
    }

    getBetWinnerList(game_id:number, success:boolean): Promise<Array<Bet>> {
        const int_success:number = success ? 1 : 0;
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT user_id, SUM(bet_point) AS bet_point FROM Bet WHERE game_id = ? AND success = ? GROUP BY user_id`, 
            [game_id, success],
            (err:Error | null, rows) => {
                if (err !== null) reject(err);
                else {
                    resolve(rows.map(function(x){return new Bet(game_id, x["user_id"], int_success, x["bet_point"]);} ));
                }
            });
        })
    }
}