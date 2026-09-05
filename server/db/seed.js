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

/* ── Аяллын чиглэл ──────────────────────────────────────────────────────── */
const upsertTour = db.prepare(`
  INSERT INTO tours
    (slug, sort_order, is_active, cover, region_key,
     title_mn, title_en, title_kr, area_mn, area_en, area_kr,
     summary_mn, summary_en, summary_kr, body_mn, body_en, body_kr,
     days, km_total, group_min, group_max, season_from, season_to)
  VALUES (@slug, @sortOrder, 1, @cover, @regionKey,
          @titleMn, @titleEn, @titleKr, @areaMn, @areaEn, @areaKr,
          @summaryMn, @summaryEn, @summaryKr, @bodyMn, @bodyEn, @bodyKr,
          @days, @kmTotal, @groupMin, @groupMax, @seasonFrom, @seasonTo)
  ON CONFLICT(slug) DO UPDATE SET
    sort_order=excluded.sort_order, cover=excluded.cover, region_key=excluded.region_key,
    title_mn=excluded.title_mn, title_en=excluded.title_en, title_kr=excluded.title_kr,
    area_mn=excluded.area_mn, area_en=excluded.area_en, area_kr=excluded.area_kr,
    summary_mn=excluded.summary_mn, summary_en=excluded.summary_en, summary_kr=excluded.summary_kr,
    body_mn=excluded.body_mn, body_en=excluded.body_en, body_kr=excluded.body_kr,
    days=excluded.days, km_total=excluded.km_total,
    group_min=excluded.group_min, group_max=excluded.group_max,
    season_from=excluded.season_from, season_to=excluded.season_to,
    updated_at=datetime('now')
`);

const insDay = db.prepare(`
  INSERT INTO tour_days (tour_id, day_no, route_mn, route_en, route_kr, sleep_mn, sleep_en, sleep_kr, km)
  VALUES (@tourId, @dayNo, @routeMn, @routeEn, @routeKr, @sleepMn, @sleepEn, @sleepKr, @km)
`);
const insInc = db.prepare(`
  INSERT INTO tour_includes (tour_id, kind, sort_order, text_mn, text_en, text_kr)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seedTours = db.transaction(() => {
  for (const t of data.tours) {
    upsertTour.run(t);
    const { id } = db.prepare('SELECT id FROM tours WHERE slug = ?').get(t.slug);

    db.prepare('DELETE FROM tour_days WHERE tour_id = ?').run(id);
    for (const d of t.itinerary || []) insDay.run({ tourId: id, ...d });

    db.prepare('DELETE FROM tour_includes WHERE tour_id = ?').run(id);
    (t.highlights || []).forEach((h, i) => insInc.run(id, 'high', i, h.mn, h.en, h.kr));
    data.includes.forEach((x, i) => insInc.run(id, x.kind, i, x.textMn, x.textEn, x.textKr));
  }
});

/* ── Зургийн цомог ──────────────────────────────────────────────────────── */
const seedGallery = db.transaction(() => {
  const ins = db.prepare(`
    INSERT INTO gallery
      (image, sort_order, is_active, region_key, place_mn, place_en, place_kr,
       caption_mn, caption_en, caption_kr, credit)
    VALUES (?,?,1,?,?,?,?,?,?,?,?)
  `);
  const has = db.prepare('SELECT 1 FROM gallery WHERE image = ?');
  data.gallery.forEach((g, i) => {
    const url = `/images/gallery/${g.image}`;
    if (has.get(url)) return;
    ins.run(
      url, i, g.regionKey,
      g.placeMn, g.placeEn, g.placeKr,
      g.captionMn, g.captionEn, g.captionKr,
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
    return console.warn('! ADMIN_PASSWORD хоосон — admin үүсгэсэнгүй. .env-д бөглөөд дахин ажиллуулна уу.');
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
console.log(`✓ Seed дууслаа — чиглэл ${n('tours')}, өдөр ${n('tour_days')}, зураг ${n('gallery')}`);
