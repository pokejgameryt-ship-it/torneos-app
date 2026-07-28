const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'torneos.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    // Migrations: add columns that may not exist in older DBs
    const cols = db.prepare("PRAGMA table_info(overlay_settings)").all().map(c => c.name);
    const ucols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    const tcols = db.prepare("PRAGMA table_info(tournaments)").all().map(c => c.name);
    const mcols = db.prepare("PRAGMA table_info(matches)").all().map(c => c.name);
    const pcols = db.prepare("PRAGMA table_info(participants)").all().map(c => c.name);
    if (!cols.includes('custom_colors')) {
      db.exec("ALTER TABLE overlay_settings ADD COLUMN custom_colors INTEGER NOT NULL DEFAULT 0");
    }
    if (!cols.includes('overlay_shape')) {
      db.exec("ALTER TABLE overlay_settings ADD COLUMN overlay_shape TEXT NOT NULL DEFAULT 'rect'");
    }

    if (!pcols.includes('flag')) {
      db.exec("ALTER TABLE participants ADD COLUMN flag TEXT DEFAULT ''");
    }

    if (!tcols.includes('current_match_order')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN current_match_order INTEGER NOT NULL DEFAULT 0");
    }
    if (!tcols.includes('sequential_matches')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN sequential_matches INTEGER NOT NULL DEFAULT 0");
    }

    if (!mcols.includes('match_order')) {
      db.exec("ALTER TABLE matches ADD COLUMN match_order INTEGER DEFAULT 0");
    }

    if (!cols.includes('visual_effect')) {
      db.exec("ALTER TABLE overlay_settings ADD COLUMN visual_effect TEXT NOT NULL DEFAULT 'none'");
    }
    if (!cols.includes('visual_effect_side')) {
      db.exec("ALTER TABLE overlay_settings ADD COLUMN visual_effect_side TEXT NOT NULL DEFAULT 'interior'");
    }

    if (!tcols.includes('creator_id')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN creator_id TEXT");
    }
    if (!tcols.includes('game_type')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN game_type TEXT DEFAULT 'other'");
    }
    if (!tcols.includes('open_team_sheets')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN open_team_sheets INTEGER DEFAULT 0");
    }
    if (!tcols.includes('format_mode')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN format_mode TEXT DEFAULT 'singles'");
    }
    if (!tcols.includes('allow_gentleman')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN allow_gentleman INTEGER DEFAULT 1");
    }

    if (!pcols.includes('user_id')) {
      db.exec("ALTER TABLE participants ADD COLUMN user_id TEXT");
    }

    if (!mcols.includes('team_paste_url')) {
      db.exec("ALTER TABLE matches ADD COLUMN team_paste_url TEXT");
    }
    if (!mcols.includes('stage_used')) {
      db.exec("ALTER TABLE matches ADD COLUMN stage_used TEXT");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_chat_match ON chat_messages(match_id)');

    db.exec(`
      CREATE TABLE IF NOT EXISTS stage_picks (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        action TEXT NOT NULL,
        phase TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS match_stage_mode (
        match_id TEXT PRIMARY KEY,
        mode TEXT DEFAULT 'dsr',
        agreed_by_p1 INTEGER DEFAULT 0,
        agreed_by_p2 INTEGER DEFAULT 0,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      )
    `);

    if (!ucols.includes('display_name')) {
      db.exec("ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT ''");
    }
    if (!ucols.includes('bio')) {
      db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
    }
    if (!ucols.includes('games')) {
      db.exec("ALTER TABLE users ADD COLUMN games TEXT DEFAULT '[]'");
    }
    if (!ucols.includes('avatar')) {
      db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''");
    }
    if (!ucols.includes('country')) {
      db.exec("ALTER TABLE users ADD COLUMN country TEXT DEFAULT ''");
    }
    if (!ucols.includes('continent')) {
      db.exec("ALTER TABLE users ADD COLUMN continent TEXT DEFAULT ''");
    }
    if (!ucols.includes('default_nickname')) {
      db.exec("ALTER TABLE users ADD COLUMN default_nickname TEXT DEFAULT ''");
    }
    if (!ucols.includes('default_flag')) {
      db.exec("ALTER TABLE users ADD COLUMN default_flag TEXT DEFAULT ''");
    }

    if (!tcols.includes('requirements')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN requirements TEXT DEFAULT '[]'");
    }
    if (!tcols.includes('description')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN description TEXT DEFAULT ''");
    }
    if (!tcols.includes('banner')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN banner TEXT DEFAULT ''");
    }
    if (!tcols.includes('start_date')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN start_date TEXT DEFAULT ''");
    }
    if (!tcols.includes('start_time')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN start_time TEXT DEFAULT ''");
    }
    if (!tcols.includes('timezone')) {
      db.exec("ALTER TABLE tournaments ADD COLUMN timezone TEXT DEFAULT 'UTC'");
    }

    if (!mcols.includes('character1')) {
      db.exec("ALTER TABLE matches ADD COLUMN character1 TEXT DEFAULT ''");
    }
    if (!mcols.includes('character2')) {
      db.exec("ALTER TABLE matches ADD COLUMN character2 TEXT DEFAULT ''");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id)');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
