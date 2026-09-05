/* Admin — аяллын чиглэлийн CRUD (өдрийн хуваарь, багцын жагсаалт хамт). */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { notFound, badRequest } from '../../lib/httpError.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const REGIONS = ['gobi', 'khuvsgul', 'tuv', 'other'];

const text = (max = 400) => z.string().trim().max(max).default('');

const daySchema = z.object({
  dayNo: z.number().int().min(1).max(60),
  routeMn: text(300),
  routeEn: text(300),
  routeKr: text(300),
  sleepMn: text(120),
  sleepEn: text(120),
  sleepKr: text(120),
  km: z.number().int().min(0).max(3000).default(0),
});

const inclSchema = z.object({
  kind: z.enum(['in', 'out', 'high']),
  textMn: text(300),
  textEn: text(300),
  textKr: text(300),
});

const tourSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Зөвхөн жижиг латин үсэг, тоо, зураас'),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  cover: text(300),
  regionKey: z.enum(REGIONS).default('other'),
  titleMn: z.string().trim().min(1, 'Гарчиг шаардлагатай').max(120),
  titleEn: text(120),
  titleKr: text(120),
  areaMn: text(120),
  areaEn: text(120),
  areaKr: text(120),
  summaryMn: text(600),
  summaryEn: text(600),
  summaryKr: text(600),
  bodyMn: text(4000),
  bodyEn: text(4000),
  bodyKr: text(4000),
  days: z.number().int().min(0).max(60).default(0),
  kmTotal: z.number().int().min(0).max(100000).default(0),
  groupMin: z.number().int().min(1).max(50).default(4),
  groupMax: z.number().int().min(1).max(50).default(6),
  seasonFrom: z.number().int().min(1).max(12).default(5),
  seasonTo: z.number().int().min(1).max(12).default(9),
  itinerary: z.array(daySchema).max(60).default([]),
  includes: z.array(inclSchema).max(40).default([]),
});

function loadFull(id) {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(id);
  if (!tour) return null;
  tour.itinerary = db
    .prepare('SELECT * FROM tour_days WHERE tour_id = ? ORDER BY day_no')
    .all(id);
  tour.includes = db
    .prepare('SELECT * FROM tour_includes WHERE tour_id = ? ORDER BY kind, sort_order, id')
    .all(id);
  return tour;
}

const writeChildren = db.transaction((tourId, itinerary, includes) => {
  db.prepare('DELETE FROM tour_days WHERE tour_id = ?').run(tourId);
  const insDay = db.prepare(
    `INSERT INTO tour_days
     (tour_id, day_no, route_mn, route_en, route_kr, sleep_mn, sleep_en, sleep_kr, km)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  for (const d of itinerary) {
    insDay.run(tourId, d.dayNo, d.routeMn, d.routeEn, d.routeKr, d.sleepMn, d.sleepEn, d.sleepKr, d.km);
  }

  db.prepare('DELETE FROM tour_includes WHERE tour_id = ?').run(tourId);
  const insInc = db.prepare(
    `INSERT INTO tour_includes (tour_id, kind, sort_order, text_mn, text_en, text_kr)
     VALUES (?,?,?,?,?,?)`
  );
  includes.forEach((x, i) => insInc.run(tourId, x.kind, i, x.textMn, x.textEn, x.textKr));
});

router.get('/tours', (req, res) => {
  const rows = db.prepare('SELECT * FROM tours ORDER BY sort_order, id').all();
  res.json({ tours: rows });
});

router.get('/tours/:id', (req, res, next) => {
  const tour = loadFull(Number(req.params.id));
  if (!tour) return next(notFound('Чиглэл олдсонгүй'));
  res.json({ tour });
});

router.post('/tours', validateBody(tourSchema), (req, res, next) => {
  const v = req.valid;
  if (db.prepare('SELECT 1 FROM tours WHERE slug = ?').get(v.slug)) {
    return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));
  }
  const info = db
    .prepare(
      `INSERT INTO tours
       (slug, sort_order, is_active, cover, region_key,
        title_mn, title_en, title_kr, area_mn, area_en, area_kr,
        summary_mn, summary_en, summary_kr, body_mn, body_en, body_kr,
        days, km_total, group_min, group_max, season_from, season_to)
       VALUES (?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?)`
    )
    .run(
      v.slug, v.sortOrder, v.isActive ? 1 : 0, v.cover, v.regionKey,
      v.titleMn, v.titleEn, v.titleKr, v.areaMn, v.areaEn, v.areaKr,
      v.summaryMn, v.summaryEn, v.summaryKr, v.bodyMn, v.bodyEn, v.bodyKr,
      v.days, v.kmTotal, v.groupMin, v.groupMax, v.seasonFrom, v.seasonTo
    );
  writeChildren(info.lastInsertRowid, v.itinerary, v.includes);
  res.status(201).json({ tour: loadFull(info.lastInsertRowid) });
});

router.put('/tours/:id', validateBody(tourSchema), (req, res, next) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM tours WHERE id = ?').get(id)) {
    return next(notFound('Чиглэл олдсонгүй'));
  }
  const v = req.valid;
  const dup = db.prepare('SELECT id FROM tours WHERE slug = ? AND id <> ?').get(v.slug, id);
  if (dup) return next(badRequest('Энэ slug аль хэдийн бий', { slug: 'Давхардсан' }));

  db.prepare(
    `UPDATE tours SET
       slug=?, sort_order=?, is_active=?, cover=?, region_key=?,
       title_mn=?, title_en=?, title_kr=?, area_mn=?, area_en=?, area_kr=?,
       summary_mn=?, summary_en=?, summary_kr=?, body_mn=?, body_en=?, body_kr=?,
       days=?, km_total=?, group_min=?, group_max=?, season_from=?, season_to=?,
       updated_at=datetime('now')
     WHERE id=?`
  ).run(
    v.slug, v.sortOrder, v.isActive ? 1 : 0, v.cover, v.regionKey,
    v.titleMn, v.titleEn, v.titleKr, v.areaMn, v.areaEn, v.areaKr,
    v.summaryMn, v.summaryEn, v.summaryKr, v.bodyMn, v.bodyEn, v.bodyKr,
    v.days, v.kmTotal, v.groupMin, v.groupMax, v.seasonFrom, v.seasonTo,
    id
  );
  writeChildren(id, v.itinerary, v.includes);
  res.json({ tour: loadFull(id) });
});

router.delete('/tours/:id', (req, res, next) => {
  const info = db.prepare('DELETE FROM tours WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return next(notFound('Чиглэл олдсонгүй'));
  res.json({ ok: true });
});

export default router;
