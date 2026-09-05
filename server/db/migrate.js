/* Схем үүсгэх. `--reset` өгвөл бүх хүснэгтийг устгаад дахин үүсгэнэ. */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, DB_FILE } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

if (reset) {
  db.pragma('foreign_keys = OFF');
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all();
  for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  db.pragma('foreign_keys = ON');
  console.log(`· ${tables.length} хүснэгт устгав`);
}

db.exec(readFileSync(path.join(here, 'schema.sql'), 'utf8'));
console.log(`✓ Схем бэлэн — ${DB_FILE}`);
