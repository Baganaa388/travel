import { HttpError } from '../lib/httpError.js';

/** 404 — API замд JSON, бусдад дараагийн handler. */
export function apiNotFound(req, res) {
  res.status(404).json({ error: 'Олдсонгүй' });
}

/** Төвлөрсөн алдаа боловсруулагч. Дотоод алдааг client рүү задруулахгүй. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Хэт том өгөгдөл' });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Зураг хэт том (дээд тал нь 6 МБ)' });
  }
  console.error('[error]', err?.stack || err);
  res.status(500).json({ error: 'Дотоод алдаа гарлаа' });
}
