/* Admin нэвтрэлт + CSRF. Cookie нь httpOnly тул JS токеныг header-ээр илгээнэ. */
import { forbidden, unauthorized } from '../lib/httpError.js';
import { readSession, SESSION_COOKIE } from '../lib/session.js';

/** Сесс уншиж req.session-д тавина (нэвтрээгүй байж болно). */
export function loadSession(req, res, next) {
  req.session = readSession(req.cookies?.[SESSION_COOKIE]) || null;
  next();
}

/** Нэвтэрсэн байхыг шаардана. */
export function requireAuth(req, res, next) {
  if (!req.session) return next(unauthorized());
  next();
}

/** Төлөв өөрчлөх бүх хүсэлтэд CSRF токен шалгана. */
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('x-csrf-token');
  if (!req.session || !sent || sent !== req.session.csrf) {
    return next(forbidden('CSRF токен буруу. Хуудсыг дахин ачаална уу.'));
  }
  next();
}
