import {Database} from "sqlite3";

class DatabaseCursor{
    db
    constructor(){
        this.db = new Database("./data/database.db", function (err: Error|null){
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
                guild_id TEXT NOT NULL,
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
    
    addGame(title:string, desc:string, user_id:string, guild_id:string, status:number){
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO Game(title,description,user_id,guild_id,status) VALUES (?,?,?,?,?);',
            [title, desc, user_id, guild_id, status],
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

    isFenceSitter(user_id: String, game_id: number, success: boolean){
        const int_success:number = success ? 1 : 0;
        return new Promise((resolve, reject) => {
            this.db.get('SELECT success FROM Bet WHERE user_id = ? AND game_id = ?', [user_id,game_id],
            (err:Error | null, row:any) => {
                if (err !== null) reject(err);
                else resolve(row ? row["success"] !== int_success : false );
            });
        });
    }
}

(async () => {
    let c:DatabaseCursor = new DatabaseCursor();
    await c.initTable()
    let x = await c.addGame("","","","",1);
    await c.addBetQuery(1, "1", false, 1);
    let y = await c.isFenceSitter('1',1,true);
    console.log(y);

})();