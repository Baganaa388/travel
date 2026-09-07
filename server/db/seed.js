/* Анхны агуулга — идэмпотент (дахин ажиллуулбал байгаа мөрийг шинэчилнэ).
   Зургийн зохиогч/лицензийг public/images/gallery/CREDITS.json-оос уншиж бичнэ. */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, setSetting } from './index.js';
import { hashPassword } from '../lib/password.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..');
const data = JSON.parse(readFileSync(path.join(here, 'seed-data.json'), 'utf8'));

/* ── Зургийн credit ─────────────────────────────────────────────────────── */
const creditsPath = path.join(ROOT, 'public', 'images', 'gallery', 'CREDITS.json');
const credits = new Map();
if (existsSync(creditsPath)) {
  for (const c of JSON.parse(readFileSync(creditsPath, 'utf8'))) {
    const author = (c.author || '').trim();
    const lic = (c.licence || '').trim();
    credits.set(c.file, [author, lic].filter(Boolean).join(' · '));
  }
}

/* ── Аяллын ангилал + аяллууд ───────────────────────────────────────────── */
const upsertCat = db.prepare(`
  INSERT INTO tour_categories
    (slug, sort_order, is_active, cover, name_kr, name_en, sub_kr, sub_en, note_kr, note_en)
  VALUES (@slug, @sortOrder, 1, @cover, @nameKr, @nameEn, @subKr, @subEn, @noteKr, @noteEn)
  ON CONFLICT(slug) DO UPDATE SET
    sort_order=excluded.sort_order, cover=excluded.cover,
    name_kr=excluded.name_kr, name_en=excluded.name_en,
    sub_kr=excluded.sub_kr, sub_en=excluded.sub_en,
    note_kr=excluded.note_kr, note_en=excluded.note_en,
    updated_at=datetime('now')
`);

const upsertTour = db.prepare(`
  INSERT INTO tours
    (category_id, slug, sort_order, is_active, day_no, images,
     title_kr, title_en, place_kr, place_en, meta_kr, meta_en,
     summary_kr, summary_en, body_kr, body_en)
  VALUES (@categoryId, @slug, @sortOrder, 1, @dayNo, @images,
          @titleKr, @titleEn, @placeKr, @placeEn, @metaKr, @metaEn,
          @summaryKr, @summaryEn, @bodyKr, @bodyEn)
  ON CONFLICT(slug) DO UPDATE SET
    category_id=excluded.category_id, sort_order=excluded.sort_order, day_no=excluded.day_no,
    images=excluded.images,
    title_kr=excluded.title_kr, title_en=excluded.title_en,
    place_kr=excluded.place_kr, place_en=excluded.place_en,
    meta_kr=excluded.meta_kr, meta_en=excluded.meta_en,
    summary_kr=excluded.summary_kr, summary_en=excluded.summary_en,
    body_kr=excluded.body_kr, body_en=excluded.body_en,
    updated_at=datetime('now')
`);

const seedTours = db.transaction(() => {
  data.categories.forEach((c, ci) => {
    upsertCat.run({ sortOrder: ci + 1, noteKr: '', noteEn: '', ...c });
    const { id } = db.prepare('SELECT id FROM tour_categories WHERE slug = ?').get(c.slug);
    (c.tours || []).forEach((t, ti) => {
      upsertTour.run({
        categoryId: id,
        sortOrder: ti + 1,
        dayNo: ti + 1,
        placeKr: '',
        placeEn: '',
        metaKr: '',
        metaEn: '',
        summaryKr: '',
        summaryEn: '',
        bodyKr: '',
        bodyEn: '',
        ...t,
        images: JSON.stringify((t.images || []).map((f) => `/images/tours/${f}`)),
      });
    });
  });
});

/* ── Зургийн цомог ──────────────────────────────────────────────────────── */
const seedGallery = db.transaction(() => {
  const ins = db.prepare(`
    INSERT INTO gallery
      (image, sort_order, is_active, region_key, place_kr, place_en, caption_kr, caption_en, credit)
    VALUES (?,?,1,?,?,?,?,?,?)
  `);
  const has = db.prepare('SELECT 1 FROM gallery WHERE image = ?');
  data.gallery.forEach((g, i) => {
    const url = `/images/gallery/${g.image}`;
    if (has.get(url)) return;
    ins.run(
      url,
      i,
      g.regionKey,
      g.placeKr,
      g.placeEn,
      g.captionKr,
      g.captionEn,
      credits.get(g.image) || ''
    );
  });
});

/* ── Тохиргоо ───────────────────────────────────────────────────────────── */
function seedSettings() {
  for (const [key, value] of Object.entries(data.settings)) {
    const row = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
    if (!row) setSetting(key, value);
  }
}

/* ── Admin ──────────────────────────────────────────────────────────────── */
function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (existing) return console.log(`· Admin «${username}» аль хэдийн бий`);
  if (!password) {
    return console.warn(
      '! ADMIN_PASSWORD хоосон — admin үүсгэсэнгүй. .env-д бөглөөд дахин ажиллуулна уу.'
    );
  }
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
    username,
    hashPassword(password)
  );
  console.log(`✓ Admin «${username}» үүсгэв`);
}

seedTours();
seedGallery();
seedSettings();
seedAdmin();

const n = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(
  `✓ Seed дууслаа — ангилал ${n('tour_categories')}, аялал ${n('tours')}, зураг ${n('gallery')}`
);
