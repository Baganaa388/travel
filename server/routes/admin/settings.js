/* Admin — сайтын тохиргоо.
   Ганц бүлэг: холбоо барих мэдээлэл + лого. Бусад бичвэр нь хуудсанд шууд байна. */
import { Router } from 'express';
import { z } from 'zod';
import { getSetting, setSetting } from '../../db/index.js';
import { badRequest } from '../../lib/httpError.js';

const router = Router();

const t = (max = 200) => z.string().trim().max(max).default('');
const i18nText = (max = 300) =>
  z.object({ mn: t(max), en: t(max), kr: t(max) }).default({ mn: '', en: '', kr: '' });

export const SCHEMAS = {
  contact: z.object({
    phone: t(40),
    email: t(120),
    kakao: t(200),
    instagram: t(200),
    naver: t(200),
    logo: t(300),
    address: i18nText(200),
    hours: i18nText(140),
  }),
};

const KEYS = Object.keys(SCHEMAS);

router.get('/settings', (req, res) => {
  const out = {};
  for (const k of KEYS) out[k] = getSetting(k, null);
  res.json({ settings: out });
});

router.put('/settings/:key', (req, res, next) => {
  const schema = SCHEMAS[req.params.key];
  if (!schema) return next(badRequest('Ийм тохиргоо байхгүй'));

  const parsed = schema.safeParse(req.body?.value);
  if (!parsed.success) {
    const details = {};
    for (const i of parsed.error.issues) details[i.path.join('.') || '_'] = i.message;
    return next(badRequest('Оруулсан утга буруу байна', details));
  }
  setSetting(req.params.key, parsed.data);
  res.json({ ok: true, value: parsed.data });
});

export default router;
