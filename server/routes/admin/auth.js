import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { unauthorized } from '../../lib/httpError.js';
import { verifyPassword, hashPassword } from '../../lib/password.js';
import {
  createSession,
  destroySession,
  cookieOptions,
  SESSION_COOKIE,
} from '../../lib/session.js';
import { loginLimiter } from '../../middleware/security.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

router.post('/login', loginLimiter, validateBody(loginSchema), (req, res, next) => {
  const { username, password } = req.valid;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

  // Хэрэглэгч байхгүй үед ч hash тооцоолж, хугацааны ялгаагаар мэдэгдэхээс сэргийлнэ
  const ok = user
    ? verifyPassword(password, user.password_hash)
    : verifyPassword(password, hashPassword('never-matches'));

  if (!ok) {
    console.warn(`[auth] амжилтгүй нэвтрэлт: ${username} · ${req.ip}`);
    return next(unauthorized('Нэр эсвэл нууц үг буруу'));
  }

  const s = createSession(user.id);
  res.cookie(SESSION_COOKIE, s.id, cookieOptions());
  console.info(`[auth] нэвтэрлээ: ${user.username} · ${req.ip}`);
  res.json({ user: { username: user.username }, csrf: s.csrf });
});

router.post('/logout', requireAuth, requireCsrf, (req, res) => {
  destroySession(req.session.id);
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { username: req.session.username }, csrf: req.session.csrf });
});

const passSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(8, 'Дор хаяж 8 тэмдэгт').max(200),
});

router.post('/password', requireAuth, requireCsrf, validateBody(passSchema), (req, res, next) => {
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.session.user_id);
  if (!user || !verifyPassword(req.valid.current, user.password_hash)) {
    return next(unauthorized('Одоогийн нууц үг буруу'));
  }
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(
    hashPassword(req.valid.next),
    user.id
  );
  // Бусад бүх сессийг хаана
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(user.id, req.session.id);
  res.json({ ok: true });
});

export default router;
