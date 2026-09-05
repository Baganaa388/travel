-- ============================================================================
-- Dream Spark Travel — SQLite schema
-- Бүх бичвэр талбар нь _mn / _en / _kr гэсэн 3 хувилбартай.
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Аяллын чиглэл ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tours (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,

  cover         TEXT    NOT NULL DEFAULT '',
  region_key    TEXT    NOT NULL DEFAULT 'other',   -- gobi | khuvsgul | tuv | other

  title_mn      TEXT    NOT NULL,
  title_en      TEXT    NOT NULL DEFAULT '',
  title_kr      TEXT    NOT NULL DEFAULT '',

  area_mn       TEXT    NOT NULL DEFAULT '',        -- «Өмнөговь»
  area_en       TEXT    NOT NULL DEFAULT '',
  area_kr       TEXT    NOT NULL DEFAULT '',

  summary_mn    TEXT    NOT NULL DEFAULT '',
  summary_en    TEXT    NOT NULL DEFAULT '',
  summary_kr    TEXT    NOT NULL DEFAULT '',

  body_mn       TEXT    NOT NULL DEFAULT '',
  body_en       TEXT    NOT NULL DEFAULT '',
  body_kr       TEXT    NOT NULL DEFAULT '',

  days          INTEGER NOT NULL DEFAULT 0,
  km_total      INTEGER NOT NULL DEFAULT 0,
  group_min     INTEGER NOT NULL DEFAULT 4,
  group_max     INTEGER NOT NULL DEFAULT 6,
  season_from   INTEGER NOT NULL DEFAULT 5,         -- сар
  season_to     INTEGER NOT NULL DEFAULT 9,

  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(is_active, sort_order);

-- ── Өдрийн хуваарь ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_days (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id    INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  day_no     INTEGER NOT NULL,
  route_mn   TEXT    NOT NULL DEFAULT '',
  route_en   TEXT    NOT NULL DEFAULT '',
  route_kr   TEXT    NOT NULL DEFAULT '',
  sleep_mn   TEXT    NOT NULL DEFAULT '',
  sleep_en   TEXT    NOT NULL DEFAULT '',
  sleep_kr   TEXT    NOT NULL DEFAULT '',
  km         INTEGER NOT NULL DEFAULT 0,            -- 0 = амралтын өдөр
  UNIQUE(tour_id, day_no)
);
CREATE INDEX IF NOT EXISTS idx_tour_days ON tour_days(tour_id, day_no);

-- ── Багцад багтсан / багтаагүй ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_includes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id    INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL DEFAULT 'in',         -- in | out | high
  sort_order INTEGER NOT NULL DEFAULT 0,
  text_mn    TEXT    NOT NULL DEFAULT '',
  text_en    TEXT    NOT NULL DEFAULT '',
  text_kr    TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tour_incl ON tour_includes(tour_id, kind, sort_order);

-- ── Зургийн цомог ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  image       TEXT    NOT NULL,
  region_key  TEXT    NOT NULL DEFAULT 'other',     -- gobi | khuvsgul | tuv | other
  place_mn    TEXT    NOT NULL DEFAULT '',
  place_en    TEXT    NOT NULL DEFAULT '',
  place_kr    TEXT    NOT NULL DEFAULT '',
  caption_mn  TEXT    NOT NULL DEFAULT '',
  caption_en  TEXT    NOT NULL DEFAULT '',
  caption_kr  TEXT    NOT NULL DEFAULT '',
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
