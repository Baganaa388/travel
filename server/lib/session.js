/* Сессийг SQLite-д хадгална. Cookie-д зөвхөн id (санамсаргүй 32 байт). */
import { randomBytes } from 'node:crypto';
import { db } from '../db/index.js';

export const SESSION_COOKIE = 'ds_sid';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 цаг

export function createSession(userId) {
  const id = randomBytes(32).toString('hex');
  const csrf = randomBytes(24).toString('hex');
  const expires = Date.now() + TTL_MS;
  db.prepare('INSERT INTO sessions (id, user_id, csrf, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    csrf,
    expires
  );
  return { id, csrf, expires };
}

export function readSession(id) {
  if (!id || typeof id !== 'string' || id.length !== 64) return null;
  const row = db
    .prepare(
      `SELECT s.id, s.csrf, s.expires_at, s.user_id, u.username
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(id);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(id);
    return null;
  }
  return row;
}

export function destroySession(id) {
  if (id) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function purgeExpired() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === '1',
    path: '/',
    maxAge: TTL_MS,
  };
}
