/* Admin — зураг байршуулах. Зөвхөн зураг, 6 МБ хүртэл, нэрийг серверээс өгнө. */
import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { badRequest, notFound } from '../../lib/httpError.js';

const router = Router();
const here = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(here, '..', '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Хэрэглэгчийн өгсөн нэрийг ХЭЗЭЭ Ч ашиглахгүй — path traversal-аас сэргийлнэ
  filename: (req, file, cb) =>
    cb(null, `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}${ALLOWED.get(file.mimetype)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(badRequest('Зөвхөн JPG, PNG, WebP, AVIF')),
});

router.post('/upload', upload.single('file'), (req, res, next) => {
  if (!req.file) return next(badRequest('Файл ирээгүй'));
  res.status(201).json({ url: `/uploads/${req.file.filename}`, name: req.file.filename });
});

router.delete('/upload/:name', (req, res, next) => {
  const name = req.params.name;
  if (!/^[a-z0-9-]+\.(jpg|png|webp|avif)$/i.test(name)) return next(badRequest('Нэр буруу'));
  const file = path.join(UPLOAD_DIR, name);
  if (!file.startsWith(UPLOAD_DIR) || !existsSync(file)) return next(notFound('Файл олдсонгүй'));
  unlinkSync(file);
  res.json({ ok: true });
});

export default router;
