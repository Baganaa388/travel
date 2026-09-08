/* Схем үүсгэх. `--reset` өгвөл бүх хүснэгтийг устгаад дахин үүсгэнэ.
   Хуучин санг алдагдалгүй шинэ схем рүү шилжүүлнэ:
     v6 (MN/EN/KR, гурван аялал)  → аяллын хүснэгт устаж seed дахин бөглөнө, цомгийн KR/EN хадгалагдана
     v7 (ангилал → өдөр бүр карт) → ангилал бүрд нэг багц (аялал) үүсч, хуучин картууд түүний өдрүүд болно */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, DB_FILE } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

const cols = (table) =>
  db
    .prepare(`PRAGMA table_info("${table}")`)
    .all()
    .map((c) => c.name);
const has = (table) =>
  !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(table);

if (reset) {
  db.pragma('foreign_keys = OFF');
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all();
  for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  db.pragma('foreign_keys = ON');
  console.log(`· ${tables.length} хүснэгт устгав`);
}

db.pragma('foreign_keys = OFF');

/* ── v6 → : хуучин гурван аяллын хүснэгтүүд ────────────────────────────── */
if (has('tours') && !cols('tours').includes('category_id')) {
  db.exec(
    'DROP TABLE IF EXISTS tour_days; DROP TABLE IF EXISTS tour_includes; DROP TABLE IF EXISTS tours;'
  );
  console.log('· Хуучин (v6) аяллын хүснэгтүүдийг устгав (seed дахин бөглөнө)');
}
if (has('gallery') && cols('gallery').includes('place_mn')) {
  db.exec(`
    CREATE TABLE gallery_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1, image TEXT NOT NULL,
      region_key TEXT NOT NULL DEFAULT 'other',
      place_kr TEXT NOT NULL DEFAULT '', place_en TEXT NOT NULL DEFAULT '',
      caption_kr TEXT NOT NULL DEFAULT '', caption_en TEXT NOT NULL DEFAULT '',
      credit TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO gallery_new (id, sort_order, is_active, image, region_key, place_kr, place_en,
      caption_kr, caption_en, credit, created_at)
      SELECT id, sort_order, is_active, image, region_key, place_kr, place_en,
        caption_kr, caption_en, credit, created_at FROM gallery;
    DROP TABLE gallery; ALTER TABLE gallery_new RENAME TO gallery;`);
  console.log('· Цомгийн хүснэгтээс MN баганыг хасав');
}
if (has('settings')) db.prepare(`DELETE FROM settings WHERE key = 'contact'`).run();

/* ── v7 → v8: ангилал доторх картууд → багц + өдрүүд ───────────────────── */
if (
  has('tours') &&
  cols('tours').includes('category_id') &&
  !cols('tours').includes('duration_kr')
) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE tours_v8 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES tour_categories(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1, cover TEXT NOT NULL DEFAULT '',
        title_kr TEXT NOT NULL, title_en TEXT NOT NULL DEFAULT '',
        duration_kr TEXT NOT NULL DEFAULT '', duration_en TEXT NOT NULL DEFAULT '',
        summary_kr TEXT NOT NULL DEFAULT '', summary_en TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE tour_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        day_no INTEGER NOT NULL DEFAULT 1, images TEXT NOT NULL DEFAULT '[]',
        title_kr TEXT NOT NULL DEFAULT '', title_en TEXT NOT NULL DEFAULT '',
        place_kr TEXT NOT NULL DEFAULT '', place_en TEXT NOT NULL DEFAULT '',
        meta_kr TEXT NOT NULL DEFAULT '', meta_en TEXT NOT NULL DEFAULT '',
        summary_kr TEXT NOT NULL DEFAULT '', summary_en TEXT NOT NULL DEFAULT '',
        body_kr TEXT NOT NULL DEFAULT '', body_en TEXT NOT NULL DEFAULT '');`);

    const cats = db.prepare('SELECT * FROM tour_categories ORDER BY sort_order, id').all();
    const insTour = db.prepare(
      `INSERT INTO tours_v8 (category_id, slug, sort_order, is_active, cover, title_kr, title_en,
         duration_kr, duration_en) VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const insDay = db.prepare(
      `INSERT INTO tour_days (tour_id, day_no, images, title_kr, title_en, place_kr, place_en,
         meta_kr, meta_en, summary_kr, summary_en, body_kr, body_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const c of cats) {
      const old = db
        .prepare('SELECT * FROM tours WHERE category_id = ? ORDER BY sort_order, day_no, id')
        .all(c.id);
      if (!old.length) continue;
      const cover = c.cover || JSON.parse(old[0].images || '[]')[0] || '';
      const { lastInsertRowid: tourId } = insTour.run(
        c.id,
        c.slug,
        1,
        c.is_active,
        cover,
        c.name_kr,
        c.name_en,
        c.sub_kr || '',
        c.sub_en || ''
      );
      old.forEach((t, i) =>
        insDay.run(
          tourId,
          t.day_no || i + 1,
          t.images,
          t.title_kr,
          t.title_en,
          t.place_kr,
          t.place_en,
          t.meta_kr,
          t.meta_en,
          t.summary_kr,
          t.summary_en,
          t.body_kr,
          t.body_en
        )
      );
    }
    db.exec(`
      DROP TABLE tours; ALTER TABLE tours_v8 RENAME TO tours;
      CREATE TABLE cat_v8 (
        id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
        cover TEXT NOT NULL DEFAULT '', name_kr TEXT NOT NULL, name_en TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO cat_v8 (id, slug, sort_order, is_active, cover, name_kr, name_en, created_at, updated_at)
        SELECT id, slug, sort_order, is_active, cover, name_kr, name_en, created_at, updated_at
        FROM tour_categories;
      DROP TABLE tour_categories; ALTER TABLE cat_v8 RENAME TO tour_categories;`);
  })();
  console.log('· v7 → v8: ангилал бүрд багц үүсгэж, картуудыг өдрүүд болгов');
}

db.pragma('foreign_keys = ON');

db.exec(readFileSync(path.join(here, 'schema.sql'), 'utf8'));
console.log(`✓ Схем бэлэн — ${DB_FILE}`);
