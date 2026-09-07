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
    photos: one('SELECT COUNT(*) n FROM gallery'),
    photosActive: one('SELECT COUNT(*) n FROM gallery WHERE is_active = 1'),
  };

  const byRegion = db
    .prepare(`SELECT region_key k, COUNT(*) n FROM gallery WHERE is_active = 1 GROUP BY k`)
    .all();

  // Англи орчуулга дутуу аяллууд — admin-д юу дүүргэхийг шууд харуулна
  const missing = db
    .prepare(
      `SELECT id, slug, title_kr FROM tours
       WHERE title_en = '' OR summary_en = '' OR body_en = ''
       ORDER BY category_id, sort_order, id`
    )
    .all();

  const recent = db
    .prepare('SELECT id, slug, title_kr, updated_at FROM tours ORDER BY updated_at DESC LIMIT 5')
    .all();

  res.json({ stats, byRegion, missing, recent });
});

export default router;
