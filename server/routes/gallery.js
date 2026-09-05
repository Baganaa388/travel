/* Нийтийн API — зургийн цомог. */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { publicPhoto } from '../lib/serialize.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

const q = z.object({
  region: z.enum(['gobi', 'khuvsgul', 'tuv', 'other']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get('/gallery', validateQuery(q), (req, res) => {
  const { region, limit } = req.validQuery;
  const where = region ? 'AND region_key = ?' : '';
  const args = region ? [region] : [];
  const rows = db
    .prepare(
      `SELECT * FROM gallery WHERE is_active = 1 ${where} ORDER BY sort_order, id LIMIT ?`
    )
    .all(...args, limit ?? 200);
  res.json({ photos: rows.map(publicPhoto) });
});

export default router;
