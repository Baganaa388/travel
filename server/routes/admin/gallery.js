/* Admin — зургийн цомгийн CRUD. */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { notFound } from '../../lib/httpError.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const text = (max = 200) => z.string().trim().max(max).default('');

const photoSchema = z.object({
  image: z.string().trim().min(1, 'Зураг сонгоно уу').max(300),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  regionKey: z.enum(['gobi', 'khuvsgul', 'tuv', 'other']).default('other'),
  placeMn: text(120),
  placeEn: text(120),
  placeKr: text(120),
  captionMn: text(300),
  captionEn: text(300),
  captionKr: text(300),
  credit: text(200),
});

const args = (v) => [
  v.image, v.sortOrder, v.isActive ? 1 : 0, v.regionKey,
  v.placeMn, v.placeEn, v.placeKr,
  v.captionMn, v.captionEn, v.captionKr, v.credit,
];

router.get('/gallery', (req, res) => {
  res.json({ photos: db.prepare('SELECT * FROM gallery ORDER BY sort_order, id').all() });
});

router.post('/gallery', validateBody(photoSchema), (req, res) => {
  const info = db
    .prepare(
      `INSERT INTO gallery
       (image, sort_order, is_active, region_key, place_mn, place_en, place_kr,
        caption_mn, caption_en, caption_kr, credit)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(...args(req.valid));
  res.status(201).json({
    photo: db.prepare('SELECT * FROM gallery WHERE id = ?').get(info.lastInsertRowid),
  });
});

router.put('/gallery/:id', validateBody(photoSchema), (req, res, next) => {
  const id = Number(req.params.id);
  const info = db
    .prepare(
      `UPDATE gallery SET
         image=?, sort_order=?, is_active=?, region_key=?,
         place_mn=?, place_en=?, place_kr=?,
         caption_mn=?, caption_en=?, caption_kr=?, credit=?
       WHERE id=?`
    )
    .run(...args(req.valid), id);
  if (!info.changes) return next(notFound('Зураг олдсонгүй'));
  res.json({ photo: db.prepare('SELECT * FROM gallery WHERE id = ?').get(id) });
});

router.delete('/gallery/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM gallery WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Зураг олдсонгүй'));
  res.json({ ok: true });
});

/** Дараалал зэрэг шинэчлэх. */
const reorderSchema = z.object({
  order: z.array(z.number().int().positive()).max(500),
});

router.post('/gallery/reorder', validateBody(reorderSchema), (req, res) => {
  const stmt = db.prepare('UPDATE gallery SET sort_order = ? WHERE id = ?');
  db.transaction((ids) => ids.forEach((id, i) => stmt.run(i, id)))(req.valid.order);
  res.json({ ok: true });
});

export default router;
