/* Нийтийн API — аяллын ангилал ба аяллууд. Зөвхөн уншина. */
import { Router } from 'express';
import { db } from '../db/index.js';
import { notFound } from '../lib/httpError.js';
import { publicCategory, publicTour } from '../lib/serialize.js';

const router = Router();

/** Ангилал бүр аяллуудаа хамт өгнө — нэг л хүсэлт. */
router.get('/tours', (req, res) => {
  const cats = db
    .prepare('SELECT * FROM tour_categories WHERE is_active = 1 ORDER BY sort_order, id')
    .all();
  const tours = cats.length
    ? db
        .prepare(
          `SELECT * FROM tours WHERE is_active = 1 AND category_id IN (${cats.map(() => '?').join(',')})
           ORDER BY sort_order, day_no, id`
        )
        .all(...cats.map((c) => c.id))
    : [];
  res.json({
    categories: cats.map((c) =>
      publicCategory(
        c,
        tours.filter((t) => t.category_id === c.id)
      )
    ),
  });
});

router.get('/tours/:slug', (req, res, next) => {
  const row = db
    .prepare(
      `SELECT t.* FROM tours t JOIN tour_categories c ON c.id = t.category_id
       WHERE t.slug = ? AND t.is_active = 1 AND c.is_active = 1`
    )
    .get(req.params.slug);
  if (!row) return next(notFound('Ийм аялал олдсонгүй'));
  res.json({ tour: publicTour(row) });
});

export default router;
