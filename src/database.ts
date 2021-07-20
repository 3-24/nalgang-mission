import {Database} from "sqlite3";

const DEBUG = true;
let db_path = DEBUG ? ":memory:" : "./data/database.db";

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


    getGameListByTitle(channel_id: string, status: number, text:string): Promise<Array<Record<string, number|string>>> {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT game_id, title, description FROM Game WHERE channel_id = ? AND status = ? AND title LIKE ?`, 
            [channel_id, status, text+'%'],
            (err:Error | null, rows) => {
                if (err !== null) reject(err);
                else resolve(rows);
            });
        })
    }

    getGameById(game_id: number):Promise<Record<string, number|string>> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT game_id, title, description, user_id, channel_id, status FROM Game WHERE game_id = ?`,
            game_id, 
            (err, row) => {
                if (err !== null) reject(err);
                else resolve(row);
            });
        });
    }

    getGameList(channel_id: string, status: number): Promise<Array<Record<string, number|string>>>{
        return this.getGameListByTitle(channel_id, status, "");
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

    getUserBet(user_id:string, game_id:number): Promise<[number, number] | []>{
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT success, SUM(bet_point) AS bet_point FROM Bet WHERE user_id = ? AND game_id = ?`,[user_id, game_id], 
            (err:Error | null, row) => {
                if (err !== null) reject(err);
                else resolve(row ? [row["success"], row["bet_point"]] : []);
            });
        })
    }

    getBetWinnerList(game_id:number, success:boolean): Promise<Array<[string, number]>> {
        const int_success:number = success ? 1 : 0;
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT user_id, SUM(bet_point) AS bet_point FROM Bet WHERE game_id = ? AND success = ? GROUP BY user_id`, 
            [game_id, success],
            (err:Error | null, rows) => {
                if (err !== null) reject(err);
                else {
                    resolve(rows.map(function(x){return [ x["user_id"], x["bet_point"] ];} ));
                }
            });
        })
    }
}