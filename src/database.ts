import { rejects } from "assert/strict";
import {Database} from "sqlite3";
import { threadId } from "worker_threads";

const DEBUG = true;
let db_path = DEBUG ? ":memory:" : "./data/database.db";


class DatabaseCursor{
    db
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
                if (err === null) resolve(err);
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


    getGameListByTitle(channel_id: string, status: number, text:string){
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT game_id, title, description FROM Game WHERE channel_id = ? AND status = ? AND title LIKE ?`, 
            [channel_id, status, text+'%'],
            (err:Error | null, rows: any) => {
                if (err !== null) reject(err);
                else resolve(rows);
            });
        })
    }

    getGameList(channel_id: string, status: number){
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

    getGameBetPointSum(game_id:number){
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
                    resolve([sum_success,sum_fail]);
                }
            });
        });
    }

    getUserBet(user_id:string, game_id:number){
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT success, SUM(bet_point) AS bet_point FROM Bet WHERE user_id = ? AND game_id = ?`,[user_id, game_id], 
            (err:Error | null, rows: any) => {
                if (err !== null) reject(err);
                else resolve(rows);
            });
        })
    }

    getBetWinnerList(game_id:number, success:boolean){
        const int_success:number = success ? 1 : 0;
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT user_id, SUM(bet_point) AS bet_point FROM Bet WHERE game_id = ? AND success = ? GROUP BY user_id`, 
            [game_id, success],
            (err:Error | null, rows: any) => {
                if (err !== null) reject(err);
                else resolve(rows);
            });
        })
    }
}

(async () => {
    let c:DatabaseCursor = new DatabaseCursor();
    await c.initTable()
    /*
    let x = await c.addGame("abc","","","",0);
    let x2 = await c.addGame("abd","","","",0);
    let x3 = await c.addGame("bcd","","","",0);
    let x4 = await c.addGame("abe","","","",1);
    //await c.addBet(1, "1", false, 1);
    //let y = await c.isFenceSitter('1',1,true);
    
    let w = await c.changeGameStatus(1, 1);
    await c.changeGameStatus(4,0);
    let z = await c.getOpenGameList("");

    console.log(z);
    */
   await c.addBet(1,"a",true, 1);
   await c.addBet(1,"b",false, 1);
   await c.addBet(1,"b",false, 3);
   await c.addBet(1,"c",true, 2);
   await c.addBet(1,"d",false, 1);
   await c.addBet(1,"e",false, 3);
   await c.addBet(1,"b",false, 1);
   await c.addBet(1,"e",false, 3);


   let v = await c.getGameBetPointSum(1);
   let u = await c.getBetWinnerList(1,false);
   console.log(u);

})();