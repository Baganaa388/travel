/* Admin — аяллын ангилал, багц (өдрүүдтэй нь хамт) CRUD.
   Slug-ийг admin бичихгүй — гарчгаас (эсвэл санамсаргүй) сервер өөрөө үүсгэнэ. */
import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { db } from '../../db/index.js';
import { notFound, badRequest } from '../../lib/httpError.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const text = (max = 400) => z.string().trim().max(max).default('');

/** Латин гарчгаас slug; латин үсэггүй бол богино санамсаргүй. Хүснэгтэд давхардахгүй. */
function makeSlug(table, titleEn, titleKr, excludeId = 0) {
  let base = String(titleEn || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (!base) {
    const latin = String(titleKr || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    base = latin || `t-${randomBytes(3).toString('hex')}`;
  }
  const taken = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id <> ?`);
  let slug = base;
  for (let n = 2; taken.get(slug, excludeId); n++) slug = `${base}-${n}`;
  return slug;
}

const nextOrder = (table, where = '', args = []) =>
  db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 n FROM ${table} ${where}`).get(...args)?.n ??
  1;

/* ── Ангилал ────────────────────────────────────────────────────────────── */
const catSchema = z.object({
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).optional(),
  cover: text(300),
  nameKr: z.string().trim().min(1, 'Нэр шаардлагатай').max(120),
  nameEn: text(120),
});

router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM tour_categories ORDER BY sort_order, id').all();
  const counts = db.prepare('SELECT category_id k, COUNT(*) n FROM tours GROUP BY k').all();
  res.json({
    categories: cats.map((c) => ({ ...c, tours: counts.find((x) => x.k === c.id)?.n ?? 0 })),
  });
});

router.get('/categories/:id', (req, res, next) => {
  const cat = db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(Number(req.params.id));
  if (!cat) return next(notFound('Ангилал олдсонгүй'));
  res.json({ category: cat });
});

router.post('/categories', validateBody(catSchema), (req, res) => {
  const v = req.valid;
  const info = db
    .prepare(
      `INSERT INTO tour_categories (slug, sort_order, is_active, cover, name_kr, name_en)
       VALUES (?,?,?,?,?,?)`
    )
    .run(
      makeSlug('tour_categories', v.nameEn, v.nameKr),
      v.sortOrder ?? nextOrder('tour_categories'),
      v.isActive ? 1 : 0,
      v.cover,
      v.nameKr,
      v.nameEn
    );
  res.status(201).json({
    category: db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(info.lastInsertRowid),
  });
});

router.put('/categories/:id', validateBody(catSchema), (req, res, next) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(id);
  if (!cur) return next(notFound('Ангилал олдсонгүй'));
  const v = req.valid;
  db.prepare(
    `UPDATE tour_categories SET sort_order=?, is_active=?, cover=?, name_kr=?, name_en=?,
       updated_at=datetime('now') WHERE id=?`
  ).run(v.sortOrder ?? cur.sort_order, v.isActive ? 1 : 0, v.cover, v.nameKr, v.nameEn, id);
  res.json({ category: db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(id) });
});

router.delete('/categories/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM tour_categories WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Ангилал олдсонгүй'));
  res.json({ ok: true });
});

/** Дараалал зэрэг шинэчлэх (ангилал эсвэл багц). */
const reorderSchema = z.object({ order: z.array(z.number().int().positive()).max(500) });
for (const [route, table] of [
  ['/categories/reorder', 'tour_categories'],
  ['/tours/reorder', 'tours'],
]) {
  router.post(route, validateBody(reorderSchema), (req, res) => {
    const stmt = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
    db.transaction((ids) => ids.forEach((id, i) => stmt.run(i + 1, id)))(req.valid.order);
    res.json({ ok: true });
  });
}

/* ── Багц + өдрүүд ──────────────────────────────────────────────────────── */
const daySchema = z.object({
  images: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  titleKr: text(120),
  titleEn: text(120),
  placeKr: text(120),
  placeEn: text(120),
  metaKr: text(160),
  metaEn: text(160),
  summaryKr: text(300),
  summaryEn: text(300),
  bodyKr: text(3000),
  bodyEn: text(3000),
});

const tourSchema = z.object({
  categoryId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).optional(),
  cover: text(300),
  titleKr: z.string().trim().min(1, 'Гарчиг шаардлагатай').max(120),
  titleEn: text(120),
  durationKr: text(60),
  durationEn: text(60),
  summaryKr: text(400),
  summaryEn: text(400),
  infoKr: text(3000),
  infoEn: text(3000),
  days: z.array(daySchema).max(60).default([]),
});

const parseDay = (d) => ({ ...d, images: JSON.parse(d.images || '[]') });

function loadFull(id) {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(id);
  if (!tour) return null;
  tour.days = db
    .prepare('SELECT * FROM tour_days WHERE tour_id = ? ORDER BY day_no, id')
    .all(id)
    .map(parseDay);
  return tour;
}

const writeDays = db.transaction((tourId, days) => {
  db.prepare('DELETE FROM tour_days WHERE tour_id = ?').run(tourId);
  const ins = db.prepare(
    `INSERT INTO tour_days (tour_id, day_no, images, title_kr, title_en, place_kr, place_en,
       meta_kr, meta_en, summary_kr, summary_en, body_kr, body_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  days.forEach((d, i) =>
    ins.run(
      tourId,
      i + 1,
      JSON.stringify(d.images),
      d.titleKr,
      d.titleEn,
      d.placeKr,
      d.placeEn,
      d.metaKr,
      d.metaEn,
      d.summaryKr,
      d.summaryEn,
      d.bodyKr,
      d.bodyEn
    )
  );
});

router.get('/tours', (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM tour_days d WHERE d.tour_id = t.id) AS days_count
       FROM tours t ORDER BY t.category_id, t.sort_order, t.id`
    )
    .all();
  res.json({ tours: rows });
});

router.get('/tours/:id', (req, res, next) => {
  const tour = loadFull(Number(req.params.id));
  if (!tour) return next(notFound('Аялал олдсонгүй'));
  res.json({ tour });
});

function checkCategory(v, next) {
  if (!db.prepare('SELECT 1 FROM tour_categories WHERE id = ?').get(v.categoryId)) {
    next(badRequest('Ангилал олдсонгүй', { categoryId: 'Байхгүй ангилал' }));
    return false;
  }
  return true;
}

/** Нүүр зураг өгөөгүй бол эхний өдрийн эхний зураг. */
const coverOf = (v) => v.cover || v.days.find((d) => d.images.length)?.images[0] || '';

router.post('/tours', validateBody(tourSchema), (req, res, next) => {
  const v = req.valid;
  if (!checkCategory(v, next)) return;
  const info = db
    .prepare(
      `INSERT INTO tours (category_id, slug, sort_order, is_active, cover, title_kr, title_en,
         duration_kr, duration_en, summary_kr, summary_en, info_kr, info_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      v.categoryId,
      makeSlug('tours', v.titleEn, v.titleKr),
      v.sortOrder ?? nextOrder('tours', 'WHERE category_id = ?', [v.categoryId]),
      v.isActive ? 1 : 0,
      coverOf(v),
      v.titleKr,
      v.titleEn,
      v.durationKr,
      v.durationEn,
      v.summaryKr,
      v.summaryEn,
      v.infoKr,
      v.infoEn
    );
  writeDays(info.lastInsertRowid, v.days);
  res.status(201).json({ tour: loadFull(info.lastInsertRowid) });
});

router.put('/tours/:id', validateBody(tourSchema), (req, res, next) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM tours WHERE id = ?').get(id);
  if (!cur) return next(notFound('Аялал олдсонгүй'));
  const v = req.valid;
  if (!checkCategory(v, next)) return;
  db.prepare(
    `UPDATE tours SET category_id=?, sort_order=?, is_active=?, cover=?, title_kr=?, title_en=?,
       duration_kr=?, duration_en=?, summary_kr=?, summary_en=?, info_kr=?, info_en=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    v.categoryId,
    v.sortOrder ?? cur.sort_order,
    v.isActive ? 1 : 0,
    coverOf(v),
    v.titleKr,
    v.titleEn,
    v.durationKr,
    v.durationEn,
    v.summaryKr,
    v.summaryEn,
    v.infoKr,
    v.infoEn,
    id
  );
  writeDays(id, v.days);
  res.json({ tour: loadFull(id) });
});

router.delete('/tours/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM tours WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Аялал олдсонгүй'));
  res.json({ ok: true });
});

export default router;
