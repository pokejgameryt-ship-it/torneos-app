CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  games TEXT DEFAULT '[]',
  avatar TEXT DEFAULT '',
  country TEXT DEFAULT '',
  continent TEXT DEFAULT '',
  default_nickname TEXT DEFAULT '',
  default_flag TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game TEXT DEFAULT '',
  tournament_type TEXT NOT NULL DEFAULT '1v1',
  elimination_type TEXT NOT NULL DEFAULT 'single',
  bracket_size INTEGER NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  password TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_match_order INTEGER NOT NULL DEFAULT 0,
  sequential_matches INTEGER NOT NULL DEFAULT 0,
  creator_id TEXT,
  game_type TEXT DEFAULT 'other',
  open_team_sheets INTEGER DEFAULT 0,
  format_mode TEXT DEFAULT 'singles',
  allow_gentleman INTEGER DEFAULT 1,
  requirements TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  timezone TEXT DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  flag TEXT DEFAULT '',
  user_id TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  bracket_type TEXT NOT NULL,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  player1_id TEXT,
  player2_id TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  next_match_id TEXT,
  next_slot INTEGER,
  is_reset INTEGER DEFAULT 0,
  match_order INTEGER DEFAULT 0,
  team_paste_url TEXT,
  stage_used TEXT,
  character1 TEXT DEFAULT '',
  character2 TEXT DEFAULT '',
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES participants(id),
  FOREIGN KEY (player2_id) REFERENCES participants(id),
  FOREIGN KEY (winner_id) REFERENCES participants(id),
  FOREIGN KEY (next_match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS tournament_formats (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'Bo3',
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS overlay_settings (
  tournament_id TEXT PRIMARY KEY,
  style TEXT NOT NULL DEFAULT 'esports-gold',
  pc TEXT NOT NULL DEFAULT '#d4af37',
  pc2 TEXT NOT NULL DEFAULT '#f5d77a',
  font TEXT NOT NULL DEFAULT 'Impact',
  shape TEXT NOT NULL DEFAULT 'rect',
  score_shape TEXT NOT NULL DEFAULT 'square',
  show_phase INTEGER NOT NULL DEFAULT 1,
  show_format INTEGER NOT NULL DEFAULT 1,
  show_tournament INTEGER NOT NULL DEFAULT 1,
  show_flags INTEGER NOT NULL DEFAULT 0,
  show_logo INTEGER NOT NULL DEFAULT 0,
  show_sponsor INTEGER NOT NULL DEFAULT 0,
  show_score INTEGER NOT NULL DEFAULT 1,
  custom_colors INTEGER NOT NULL DEFAULT 0,
  overlay_shape TEXT NOT NULL DEFAULT 'rect',
  logo TEXT DEFAULT '',
  sponsor TEXT DEFAULT '',
  visual_effect TEXT NOT NULL DEFAULT 'none',
  visual_effect_side TEXT NOT NULL DEFAULT 'interior',
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_match ON chat_messages(match_id);

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
);

CREATE TABLE IF NOT EXISTS match_stage_mode (
  match_id TEXT PRIMARY KEY,
  mode TEXT DEFAULT 'dsr',
  agreed_by_p1 INTEGER DEFAULT 0,
  agreed_by_p2 INTEGER DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_rps (
  match_id TEXT NOT NULL,
  game_number INTEGER NOT NULL DEFAULT 1,
  player1_choice TEXT,
  player2_choice TEXT,
  winner INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (match_id, game_number),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);
