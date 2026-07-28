const Database = require('/home/ubuntu/torneos-app/server/node_modules/better-sqlite3');
const db = new Database('/home/ubuntu/torneos-app/server/db/torneos.db');

// Link "PokeJgamer Test" participant to "PokeJgamer2 Testeos" user
const result = db.prepare('UPDATE participants SET user_id = ? WHERE id = ? AND user_id IS NULL').run(
  '6f958512-124c-4f51-adc0-6afdb63d4d4e',
  '5c15e6d6-9c9d-4328-a245-0b73cf997b0b'
);
console.log('Updated rows:', result.changes);

// Verify
const participants = db.prepare('SELECT id, tournament_id, user_id, name FROM participants').all();
console.log('Participants now:', JSON.stringify(participants, null, 2));

db.close();
