/* Анхны агуулга — идэмпотент. Ангилал, багц нь slug-аар байхгүй үед л нэмэгдэнэ
   (admin-аас засварласан агуулгыг дарж бичихгүй). Цомгийн зураг нь зам давхардахгүй бол нэмэгдэнэ. */
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

/* ── Аяллын ангилал → багц → өдрүүд ────────────────────────────────────── */
const insCat = db.prepare(`
  INSERT INTO tour_categories (slug, sort_order, is_active, cover, name_kr, name_en)
  VALUES (@slug, @sortOrder, 1, @cover, @nameKr, @nameEn)
`);
const insTour = db.prepare(`
  INSERT INTO tours (category_id, slug, sort_order, is_active, cover, title_kr, title_en,
    duration_kr, duration_en, summary_kr, summary_en, info_kr, info_en)
  VALUES (@categoryId, @slug, @sortOrder, 1, @cover, @titleKr, @titleEn,
    @durationKr, @durationEn, @summaryKr, @summaryEn, @infoKr, @infoEn)
`);
const insDay = db.prepare(`
  INSERT INTO tour_days (tour_id, day_no, images, title_kr, title_en, place_kr, place_en,
    meta_kr, meta_en, summary_kr, summary_en, body_kr, body_en)
  VALUES (@tourId, @dayNo, @images, @titleKr, @titleEn, @placeKr, @placeEn,
    @metaKr, @metaEn, @summaryKr, @summaryEn, @bodyKr, @bodyEn)
`);
const bySlug = (table) => db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);

let added = 0;
const seedTours = db.transaction(() => {
  data.categories.forEach((c, ci) => {
    let cat = bySlug('tour_categories').get(c.slug);
    if (!cat) {
      insCat.run({ sortOrder: ci + 1, cover: '', ...c });
      cat = bySlug('tour_categories').get(c.slug);
    }
    (c.tours || []).forEach((t, ti) => {
      const existing = bySlug('tours').get(t.slug);
      if (existing) {
        // Байгаа багцын «투어 안내» хоосон бол л нөхнө (admin-ийн засварыг дарахгүй)
        db.prepare(
          `UPDATE tours SET info_kr = @infoKr, info_en = @infoEn WHERE id = @id AND info_kr = ''`
        ).run({ id: existing.id, infoKr: t.infoKr || '', infoEn: t.infoEn || '' });
        return;
      }
      const { lastInsertRowid: tourId } = insTour.run({
        categoryId: cat.id,
        sortOrder: ti + 1,
        cover: '',
        summaryKr: '',
        summaryEn: '',
        infoKr: '',
        infoEn: '',
        ...t,
      });
      (t.days || []).forEach((d, di) =>
        insDay.run({
          tourId,
          dayNo: di + 1,
          placeKr: '',
          placeEn: '',
          metaKr: '',
          metaEn: '',
          summaryKr: '',
          summaryEn: '',
          bodyKr: '',
          bodyEn: '',
          ...d,
          images: JSON.stringify((d.images || []).map((f) => `/images/tours/${f}`)),
        })
      );
      added++;
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
  `✓ Seed дууслаа — шинээр ${added} багц; нийт ангилал ${n('tour_categories')}, багц ${n('tours')}, өдөр ${n('tour_days')}, зураг ${n('gallery')}`
);
