/* Нийтийн API — сайтын тохиргоо (лого, нүүрний бичвэр, хөл, Instagram). */
import { Router } from 'express';
import { getSetting } from '../db/index.js';

const router = Router();

export const PUBLIC_KEYS = ['site', 'footer'];

router.get('/settings', (req, res) => {
  const out = {};
  for (const key of PUBLIC_KEYS) out[key] = getSetting(key, {});
  res.json({ settings: out });
});

export default router;
