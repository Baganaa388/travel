/* Admin — сайтын тохиргоо. Хоёр бүлэг:
     site   — лого, брэнд нэр, цэс, нүүрний зураг/бичвэр, Instagram/Naver холбоос
     footer — хөлийн мэдээлэл (компанийн нэр, захирал, бүртгэл, хаяг, утас, и-мэйл, © мөр) */
import { Router } from 'express';
import { z } from 'zod';
import { getSetting, setSetting } from '../../db/index.js';
import { badRequest } from '../../lib/httpError.js';

const router = Router();

const t = (max = 200) => z.string().trim().max(max).default('');
const i18nText = (max = 300) => z.object({ kr: t(max), en: t(max) }).default({ kr: '', en: '' });

export const SCHEMAS = {
  site: z.object({
    logo: t(300),
    brand: t(60),
    instagram: t(300),
    naver: t(300),
    nav: z
      .object({ home: i18nText(40), tours: i18nText(40), gallery: i18nText(40) })
      .default({
        home: { kr: '', en: '' },
        tours: { kr: '', en: '' },
        gallery: { kr: '', en: '' },
      }),
    hero: z
      .object({
        image: t(300),
        line1: i18nText(80),
        line2: i18nText(80),
        button: i18nText(40),
      })
      .default({
        image: '',
        line1: { kr: '', en: '' },
        line2: { kr: '', en: '' },
        button: { kr: '', en: '' },
      }),
    instaLabel: i18nText(40),
    galleryTitle: i18nText(60),
  }),
  footer: z.object({
    company: i18nText(120),
    ceo: t(80),
    regNo: t(80),
    address: i18nText(200),
    phone: t(60),
    email: t(120),
    copyright: i18nText(160),
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
