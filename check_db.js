const Database = require('/home/ubuntu/torneos-app/server/node_modules/better-sqlite3');
const db = new Database('/home/ubuntu/torneos-app/server/db/torneos.db', {readonly:true});
console.log('=== TOURNAMENTS ===');
console.log(JSON.stringify(db.prepare('SELECT id, name, status, current_match_order, creator_id FROM tournaments').all(), null, 2));
console.log('=== PARTICIPANTS ===');
console.log(JSON.stringify(db.prepare('SELECT id, tournament_id, user_id, name, flag FROM participants').all(), null, 2));
console.log('=== USERS ===');
console.log(JSON.stringify(db.prepare('SELECT id, nickname FROM users').all(), null, 2));
db.close();
