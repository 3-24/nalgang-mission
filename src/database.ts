const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./data/database.db");

async function initTable(){
    await db.exec(`CREATE TABLE IF NOT EXISTS Game(
        game_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        status INTEGER NOT NULL
        );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS Bet(
        bet_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        game_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        success INTEGER NOT NULL,
        bet_point INTEGER NOT NULL
        );`);
}


async function addGame(title:string, desc:string, user_id:string, guild_id:string, status:number){
    await db.run('INSERT INTO Game(title,description,user_id,guild_id,status) VALUES (?,?,?,?,?);',
        [title, desc, user_id, guild_id, status]);
}

async function getSuccess(query:string){
    return new Promise(function(resolve,reject){
        db.get(query, function(err:any,res:any){
           if(err){return reject(err);}
           resolve(res? res["success"]: 2);
         });
    });
}

async function isFenceSitter(user_id:string, game_id:number, success:boolean){
    const int_success = success ? 1 : 0;
    const query = 'SELECT success FROM Bet WHERE user_id = '+user_id+' AND game_id ='+game_id;
    const get_db = await getSuccess(query);
    console.log(get_db);
    if(get_db == int_success || get_db == 2) return true;
    else return false
}

async function addBet(title:string, user_id:string, success:boolean, point:number){
    const int_success = success ? 1 : 0;
}

async function main(){
    await initTable();
    //db.exec(`INSERT INTO Bet(game_id, user_id, success,bet_point) VALUES (1,'1',1,1),(1,'1',1,2),(1,'2',0,1),(1,'2',0,2);`);
    const test = await isFenceSitter('1',1,true);
    const test2 = await isFenceSitter('1',1,false);
    const test3 = await isFenceSitter('3',1,true);
    console.log(test,test2, test3);
}

main();