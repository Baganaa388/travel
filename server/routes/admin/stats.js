import { Router } from 'express';
import { db } from '../../db/index.js';

const router = Router();

router.get('/stats', (req, res) => {
  const one = (sql) => db.prepare(sql).get()?.n ?? 0;

  const stats = {
    categories: one('SELECT COUNT(*) n FROM tour_categories'),
    categoriesActive: one('SELECT COUNT(*) n FROM tour_categories WHERE is_active = 1'),
    tours: one('SELECT COUNT(*) n FROM tours'),
    toursActive: one('SELECT COUNT(*) n FROM tours WHERE is_active = 1'),
    days: one('SELECT COUNT(*) n FROM tour_days'),
    photos: one('SELECT COUNT(*) n FROM gallery'),
    photosActive: one('SELECT COUNT(*) n FROM gallery WHERE is_active = 1'),
  };

  const byRegion = db
    .prepare(`SELECT region_key k, COUNT(*) n FROM gallery WHERE is_active = 1 GROUP BY k`)
    .all();

  // Англи орчуулга дутуу багцууд — admin-д юу дүүргэхийг шууд харуулна
  const missing = db
    .prepare(
      `SELECT DISTINCT t.id, t.title_kr FROM tours t
       LEFT JOIN tour_days d ON d.tour_id = t.id
       WHERE t.title_en = '' OR d.title_en = '' OR d.body_en = ''
       ORDER BY t.category_id, t.sort_order, t.id`
    )
    .all();

  const recent = db
    .prepare('SELECT id, slug, title_kr, updated_at FROM tours ORDER BY updated_at DESC LIMIT 5')
    .all();

  res.json({ stats, byRegion, missing, recent });
});

export default router;
