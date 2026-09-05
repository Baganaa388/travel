import { Router } from 'express';
import { db } from '../../db/index.js';

const router = Router();

router.get('/stats', (req, res) => {
  const one = (sql) => db.prepare(sql).get()?.n ?? 0;

  const stats = {
    tours: one('SELECT COUNT(*) n FROM tours'),
    toursActive: one('SELECT COUNT(*) n FROM tours WHERE is_active = 1'),
    photos: one('SELECT COUNT(*) n FROM gallery'),
    photosActive: one('SELECT COUNT(*) n FROM gallery WHERE is_active = 1'),
    highlights: one(`SELECT COUNT(*) n FROM tour_includes WHERE kind = 'high'`),
    days: one('SELECT COUNT(*) n FROM tour_days'),
  };

  const byRegion = db
    .prepare(`SELECT region_key k, COUNT(*) n FROM gallery WHERE is_active = 1 GROUP BY k`)
    .all();

  // Орчуулга дутуу байгаа эсэх — admin-д юу дүүргэхийг шууд харуулна
  const missing = db
    .prepare(
      `SELECT id, slug, title_mn,
              (title_en = '' OR summary_en = '' OR body_en = '') AS en_gap,
              (title_kr = '' OR summary_kr = '' OR body_kr = '') AS kr_gap
       FROM tours ORDER BY sort_order, id`
    )
    .all()
    .filter((t) => t.en_gap || t.kr_gap);

  const recent = db
    .prepare('SELECT id, slug, title_mn, updated_at FROM tours ORDER BY updated_at DESC LIMIT 5')
    .all();

  res.json({ stats, byRegion, missing, recent });
});

export default router;
