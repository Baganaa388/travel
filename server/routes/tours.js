/* Нийтийн API — аяллын ангилал, багц, өдрүүд. Зөвхөн уншина. */
import { Router } from 'express';
import { db } from '../db/index.js';
import { notFound } from '../lib/httpError.js';
import { publicCategory, publicTour } from '../lib/serialize.js';

const router = Router();

/** Ангилал бүр багцуудаа (картуудаа) хамт өгнө — нэг л хүсэлт. */
router.get('/tours', (req, res) => {
  const cats = db
    .prepare('SELECT * FROM tour_categories WHERE is_active = 1 ORDER BY sort_order, id')
    .all();
  const tours = cats.length
    ? db
        .prepare(
          `SELECT t.*, (SELECT COUNT(*) FROM tour_days d WHERE d.tour_id = t.id) AS days_count
           FROM tours t WHERE t.is_active = 1 AND t.category_id IN (${cats.map(() => '?').join(',')})
           ORDER BY t.sort_order, t.id`
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

/** Багцын дэлгэрэнгүй — өдрүүдтэй. */
router.get('/tours/:slug', (req, res, next) => {
  const row = db
    .prepare(
      `SELECT t.* FROM tours t JOIN tour_categories c ON c.id = t.category_id
       WHERE t.slug = ? AND t.is_active = 1 AND c.is_active = 1`
    )
    .get(req.params.slug);
  if (!row) return next(notFound('Ийм аялал олдсонгүй'));
  const category = db.prepare('SELECT * FROM tour_categories WHERE id = ?').get(row.category_id);
  const days = db
    .prepare('SELECT * FROM tour_days WHERE tour_id = ? ORDER BY day_no, id')
    .all(row.id);
  res.json({ tour: publicTour(row, { days, category }) });
});

export default router;
