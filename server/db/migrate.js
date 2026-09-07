/* Схем үүсгэх. `--reset` өгвөл бүх хүснэгтийг устгаад дахин үүсгэнэ.
   Хуучин (MN/EN/KR, гурван аяллын) схемтэй санг шинэ (KR/EN, ангилалтай) схем рүү шилжүүлнэ:
   аяллын хуучин хүснэгтүүд устаж (seed дахин бөглөнө), цомгийн KR/EN бичвэр хадгалагдана. */
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

/* ── Хуучин схемээс шилжих ─────────────────────────────────────────────── */
db.pragma('foreign_keys = OFF');
if (has('tours') && !cols('tours').includes('category_id')) {
  db.exec(
    'DROP TABLE IF EXISTS tour_days; DROP TABLE IF EXISTS tour_includes; DROP TABLE IF EXISTS tours;'
  );
  console.log('· Хуучин аяллын хүснэгтүүдийг устгав (seed дахин бөглөнө)');
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
if (has('settings')) {
  db.prepare(`DELETE FROM settings WHERE key = 'contact'`).run();
}
db.pragma('foreign_keys = ON');

db.exec(readFileSync(path.join(here, 'schema.sql'), 'utf8'));
console.log(`✓ Схем бэлэн — ${DB_FILE}`);
