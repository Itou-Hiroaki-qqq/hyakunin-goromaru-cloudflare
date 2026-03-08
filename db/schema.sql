-- poems: 百人一首の歌データ（100行）
CREATE TABLE IF NOT EXISTS poems (
  id INTEGER PRIMARY KEY,
  kami TEXT NOT NULL,
  shimo TEXT NOT NULL,
  kami_hiragana TEXT NOT NULL,
  shimo_hiragana TEXT NOT NULL,
  kami_tts TEXT,
  shimo_tts TEXT,
  kami_goro TEXT,
  shimo_goro TEXT,
  kami_goro_tts TEXT,
  shimo_goro_tts TEXT,
  goro_kaisetsu TEXT,
  kami_audio_url TEXT,
  shimo_audio_url TEXT,
  kami_goro_audio_url TEXT,
  shimo_goro_audio_url TEXT
);

-- users: ユーザー認証情報（JWT自前実装用）
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- user_test_clears: テストクリア状況
CREATE TABLE IF NOT EXISTS user_test_clears (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  test_type TEXT NOT NULL,
  range_key TEXT NOT NULL,
  cleared_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, test_type, range_key)
);

-- user_test_best_scores: ベストスコア
CREATE TABLE IF NOT EXISTS user_test_best_scores (
  user_id TEXT NOT NULL,
  test_key TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, test_key)
);
