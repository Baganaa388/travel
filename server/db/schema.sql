-- ============================================================================
-- Dream Spark Travel — SQLite schema (v8)
-- Бүх бичвэр талбар нь _kr / _en гэсэн 2 хувилбартай (сайтын анхдагч хэл — солонгос).
-- Аялал: ангилал (нутаг) → аялал (хоногийн багц, өөрийн хуудастай) → өдрүүд.
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Аяллын ангилал (ж. «중부 몽골», «고비사막») ──────────────────────────────
CREATE TABLE IF NOT EXISTS tour_categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  cover         TEXT    NOT NULL DEFAULT '',
  name_kr       TEXT    NOT NULL,
  name_en       TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cat_active ON tour_categories(is_active, sort_order);

-- ── Аялал — хоногийн багц (дөрвөлжин карт, өөрийн хуудастай) ────────────────
CREATE TABLE IF NOT EXISTS tours (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES tour_categories(id) ON DELETE CASCADE,
  slug          TEXT    NOT NULL UNIQUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  cover         TEXT    NOT NULL DEFAULT '',
  title_kr      TEXT    NOT NULL,
  title_en      TEXT    NOT NULL DEFAULT '',
  duration_kr   TEXT    NOT NULL DEFAULT '',        -- «4박5일»
  duration_en   TEXT    NOT NULL DEFAULT '',
  summary_kr    TEXT    NOT NULL DEFAULT '',        -- нэг мөр тайлбар
  summary_en    TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tours_cat ON tours(category_id, is_active, sort_order);

-- ── Өдрүүд (аяллын хуудсан дээр дарааллаар) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_days (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id       INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  day_no        INTEGER NOT NULL DEFAULT 1,
  images        TEXT    NOT NULL DEFAULT '[]',      -- JSON: ["/images/tours/….jpg", …]
  title_kr      TEXT    NOT NULL DEFAULT '',
  title_en      TEXT    NOT NULL DEFAULT '',
  place_kr      TEXT    NOT NULL DEFAULT '',        -- газрын нэр (дэд гарчиг)
  place_en      TEXT    NOT NULL DEFAULT '',
  meta_kr       TEXT    NOT NULL DEFAULT '',        -- «약 350km / 6-7시간 이동»
  meta_en       TEXT    NOT NULL DEFAULT '',
  summary_kr    TEXT    NOT NULL DEFAULT '',        -- гол үйл ажиллагаа
  summary_en    TEXT    NOT NULL DEFAULT '',
  body_kr       TEXT    NOT NULL DEFAULT '',        -- мөр бүр = нэг цэг
  body_en       TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tour_days ON tour_days(tour_id, day_no);

-- ── Зургийн цомог ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  image       TEXT    NOT NULL,
  region_key  TEXT    NOT NULL DEFAULT 'other',     -- gobi | khuvsgul | tuv | other
  place_kr    TEXT    NOT NULL DEFAULT '',
  place_en    TEXT    NOT NULL DEFAULT '',
  caption_kr  TEXT    NOT NULL DEFAULT '',
  caption_en  TEXT    NOT NULL DEFAULT '',
  credit      TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery(is_active, sort_order);

-- ── Сайтын тохиргоо (key → JSON) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Admin ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  csrf       TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
