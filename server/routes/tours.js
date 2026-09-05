/* Нийтийн API — аяллын чиглэлүүд. Зөвхөн уншина. */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { notFound } from '../lib/httpError.js';
import { publicTour } from '../lib/serialize.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

const listQuery = z.object({
  region: z.enum(['gobi', 'khuvsgul', 'tuv', 'other']).optional(),
});

const LIST_COLS = `id, slug, sort_order, cover, region_key, days, km_total,
  group_min, group_max, season_from, season_to,
  title_mn, title_en, title_kr, area_mn, area_en, area_kr,
  summary_mn, summary_en, summary_kr`;

router.get('/tours', validateQuery(listQuery), (req, res) => {
  const { region } = req.validQuery;
  const rows = region
    ? db
        .prepare(
          `SELECT ${LIST_COLS} FROM tours WHERE is_active = 1 AND region_key = ? ORDER BY sort_order, id`
        )
        .all(region)
    : db
        .prepare(`SELECT ${LIST_COLS} FROM tours WHERE is_active = 1 ORDER BY sort_order, id`)
        .all();
  // Онцлох мөчүүдийг нэг query-гээр авч жагсаалтад хавсаргана (карт дээр харагдана)
  const highs = rows.length
    ? db
        .prepare(
          `SELECT * FROM tour_includes WHERE kind = 'high' AND tour_id IN (${rows.map(() => '?').join(',')})
           ORDER BY sort_order, id`
        )
        .all(...rows.map((r) => r.id))
    : [];
  res.json({
    tours: rows.map((r) =>
      publicTour(r, { includes: highs.filter((h) => h.tour_id === r.id) })
    ),
  });
});

router.get('/tours/:slug', (req, res, next) => {
  const row = db.prepare('SELECT * FROM tours WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!row) return next(notFound('Ийм чиглэл олдсонгүй'));

  const days = db
    .prepare('SELECT * FROM tour_days WHERE tour_id = ? ORDER BY day_no')
    .all(row.id);
  const includes = db
    .prepare('SELECT * FROM tour_includes WHERE tour_id = ? ORDER BY kind, sort_order, id')
    .all(row.id);

  res.json({ tour: publicTour(row, { days, includes }) });
});

export default router;
