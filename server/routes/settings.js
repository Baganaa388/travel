/* Нийтийн API — сайтын тохиргоо (холбоо барих, сүлжээ, нүүрний бичвэр). */
import { Router } from 'express';
import { getSetting } from '../db/index.js';

const router = Router();

export const PUBLIC_KEYS = ['contact'];

router.get('/settings', (req, res) => {
  const out = {};
  for (const key of PUBLIC_KEYS) out[key] = getSetting(key, {});
  res.json({ settings: out });
});

export default router;
