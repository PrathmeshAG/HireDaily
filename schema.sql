-- Ye table aapke D1 mein pehle se hai (login ka email + sha256 hash). Pehle se ho to kuch nahi badalta.
CREATE TABLE IF NOT EXISTS emergency_admin_credentials (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Galat login koshishon ki ginti (brute-force se bachav)
CREATE TABLE IF NOT EXISTS login_fails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_fails ON login_fails(ip, ts);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id TEXT NOT NULL UNIQUE,
  post_label TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  links TEXT NOT NULL,
  replies TEXT NOT NULL,
  reply_enabled INTEGER NOT NULL DEFAULT 1,
  dm_enabled INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  rule_id INTEGER NOT NULL,
  user_id TEXT,
  username TEXT,
  text TEXT,
  source TEXT NOT NULL DEFAULT 'webhook',
  comment_ts INTEGER NOT NULL,
  reply_status TEXT NOT NULL DEFAULT 'pending',
  dm_status TEXT NOT NULL DEFAULT 'pending',
  reply_text TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lock_until INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_media_user ON comments(media_id, user_id);

-- Rule save karte waqt purane comments ki list yahan rakhi jaati hai, cron dheere dheere nipta deta hai
CREATE TABLE IF NOT EXISTS backfill (
  rule_id INTEGER PRIMARY KEY,
  media_id TEXT NOT NULL,
  items TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
