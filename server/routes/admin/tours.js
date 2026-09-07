/* Admin — аяллын ангилал ба аяллын CRUD. */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { notFound, badRequest } from '../../lib/httpError.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const text = (max = 400) => z.string().trim().max(max).default('');
const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Зөвхөн жижиг латин үсэг, тоо, зураас');

/* ── Ангилал ────────────────────────────────────────────────────────────── */
const catSchema = z.object({
  slug,
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  cover: text(300),
  nameKr: z.string().trim().min(1, 'Нэр шаардлагатай').max(120),
  nameEn: text(120),
  subKr: text(80),
  subEn: text(80),
  noteKr: text(300),
  noteEn: text(300),
});

const catArgs = (v) => [
  v.slug,
  v.sortOrder,
  v.isActive ? 1 : 0,
  v.cover,
  v.nameKr,
  v.nameEn,
  v.subKr,
  v.subEn,
  v.noteKr,
  v.noteEn,
];

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
  cat.tours = db
    .prepare('SELECT * FROM tours WHERE category_id = ? ORDER BY sort_order, day_no, id')
    .all(cat.id);
  res.json({ category: cat });
});

router.post('/categories', validateBody(catSchema), (req, res, next) => {
  const v = req.valid;
  if (db.prepare('SELECT 1 FROM tour_categories WHERE slug = ?').get(v.slug)) {
    return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));
  }
  const info = db
    .prepare(
      `INSERT INTO tour_categories
       (slug, sort_order, is_active, cover, name_kr, name_en, sub_kr, sub_en, note_kr, note_en)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(...catArgs(v));
  res.status(201).json({
    category: db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(info.lastInsertRowid),
  });
});

router.put('/categories/:id', validateBody(catSchema), (req, res, next) => {
  const id = Number(req.params.id);
  const v = req.valid;
  if (db.prepare('SELECT id FROM tour_categories WHERE slug = ? AND id <> ?').get(v.slug, id)) {
    return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));
  }
  const info = db
    .prepare(
      `UPDATE tour_categories SET slug=?, sort_order=?, is_active=?, cover=?,
         name_kr=?, name_en=?, sub_kr=?, sub_en=?, note_kr=?, note_en=?, updated_at=datetime('now')
       WHERE id=?`
    )
    .run(...catArgs(v), id);
  if (!info.changes) return next(notFound('Ангилал олдсонгүй'));
  res.json({ category: db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(id) });
});

router.delete('/categories/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM tour_categories WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Ангилал олдсонгүй'));
  res.json({ ok: true });
});

/* ── Аялал ──────────────────────────────────────────────────────────────── */
const tourSchema = z.object({
  categoryId: z.number().int().positive(),
  slug,
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  dayNo: z.number().int().min(0).max(60).default(0),
  images: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  titleKr: z.string().trim().min(1, 'Гарчиг шаардлагатай').max(120),
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

const tourArgs = (v) => [
  v.categoryId,
  v.slug,
  v.sortOrder,
  v.isActive ? 1 : 0,
  v.dayNo,
  JSON.stringify(v.images),
  v.titleKr,
  v.titleEn,
  v.placeKr,
  v.placeEn,
  v.metaKr,
  v.metaEn,
  v.summaryKr,
  v.summaryEn,
  v.bodyKr,
  v.bodyEn,
];

const withImages = (row) => row && { ...row, images: JSON.parse(row.images || '[]') };

router.get('/tours', (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, c.name_kr AS category_name FROM tours t
       JOIN tour_categories c ON c.id = t.category_id
       ORDER BY c.sort_order, c.id, t.sort_order, t.day_no, t.id`
    )
    .all();
  res.json({ tours: rows.map(withImages) });
});

router.get('/tours/:id', (req, res, next) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(Number(req.params.id));
  if (!tour) return next(notFound('Аялал олдсонгүй'));
  res.json({ tour: withImages(tour) });
});

function checkCategory(v, next) {
  if (!db.prepare('SELECT 1 FROM tour_categories WHERE id = ?').get(v.categoryId)) {
    next(badRequest('Ангилал олдсонгүй', { categoryId: 'Байхгүй ангилал' }));
    return false;
  }
  return true;
}

router.post('/tours', validateBody(tourSchema), (req, res, next) => {
  const v = req.valid;
  if (!checkCategory(v, next)) return;
  if (db.prepare('SELECT 1 FROM tours WHERE slug = ?').get(v.slug)) {
    return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));
  }
  const info = db
    .prepare(
      `INSERT INTO tours
       (category_id, slug, sort_order, is_active, day_no, images,
        title_kr, title_en, place_kr, place_en, meta_kr, meta_en,
        summary_kr, summary_en, body_kr, body_en)
       VALUES (?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?)`
    )
    .run(...tourArgs(v));
  res.status(201).json({
    tour: withImages(db.prepare('SELECT * FROM tours WHERE id = ?').get(info.lastInsertRowid)),
  });
});

router.put('/tours/:id', validateBody(tourSchema), (req, res, next) => {
  const id = Number(req.params.id);
  const v = req.valid;
  if (!checkCategory(v, next)) return;
  if (db.prepare('SELECT id FROM tours WHERE slug = ? AND id <> ?').get(v.slug, id)) {
    return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));
  }
  const info = db
    .prepare(
      `UPDATE tours SET
         category_id=?, slug=?, sort_order=?, is_active=?, day_no=?, images=?,
         title_kr=?, title_en=?, place_kr=?, place_en=?, meta_kr=?, meta_en=?,
         summary_kr=?, summary_en=?, body_kr=?, body_en=?, updated_at=datetime('now')
       WHERE id=?`
    )
    .run(...tourArgs(v), id);
  if (!info.changes) return next(notFound('Аялал олдсонгүй'));
  res.json({ tour: withImages(db.prepare('SELECT * FROM tours WHERE id = ?').get(id)) });
});

router.delete('/tours/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM tours WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Аялал олдсонгүй'));
  res.json({ ok: true });
});

export default router;
