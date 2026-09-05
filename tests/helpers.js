/* Тестийн туслах — түр зуурын SQLite сан дээр аппыг өргөнө. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function startApp({ admin = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ds-test-'));
  process.env.DB_FILE = path.join(dir, 'test.db');
  process.env.NODE_ENV = 'test';
  process.env.COOKIE_SECURE = '0';

  // db/index.js нь DB_FILE-г import үедээ уншдаг тул дараа нь дуудна
  const { db } = await import('../server/db/index.js');
  db.exec(readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8'));

  const { hashPassword } = await import('../server/lib/password.js');
  if (admin) {
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
      'tester',
      hashPassword('Passw0rd!test')
    );
  }

  const { createApp } = await import('../server/app.js');
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    db,
    base,
    async close() {
      await new Promise((r) => server.close(r));
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Cookie-г санадаг жижиг fetch бүрхүүл. */
export function makeClient(base) {
  const jar = new Map();
  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  return {
    csrf: '',
    async req(path, { method = 'GET', body, headers = {}, raw } = {}) {
      const h = { accept: 'application/json', ...headers };
      if (jar.size) h.cookie = cookieHeader();
      if (body !== undefined) h['content-type'] = 'application/json';
      if (this.csrf && method !== 'GET') h['x-csrf-token'] = this.csrf;

      const res = await fetch(base + path, {
        method,
        headers: h,
        body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
      });
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        jar.set(pair.slice(0, i), pair.slice(i + 1));
      }
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json')
        ? await res.json().catch(() => null)
        : await res.text();
      return { status: res.status, data, headers: res.headers };
    },
    async login(username = 'tester', password = 'Passw0rd!test') {
      const r = await this.req('/api/admin/login', { method: 'POST', body: { username, password } });
      if (r.status === 200) this.csrf = r.data.csrf;
      return r;
    },
  };
}

/** Жишээ чиглэл үүсгэх (admin API-аар). */
export const sampleTour = (over = {}) => ({
  slug: 'test-route',
  sortOrder: 1,
  isActive: true,
  cover: '/images/tours/gobi-02.jpg',
  regionKey: 'gobi',
  titleMn: 'Туршилтын чиглэл',
  titleEn: 'Test route',
  titleKr: '테스트 코스',
  areaMn: 'Өмнөговь',
  summaryMn: 'Товч тайлбар',
  bodyMn: 'Дэлгэрэнгүй',
  days: 3,
  kmTotal: 900,
  groupMin: 4,
  groupMax: 6,
  seasonFrom: 5,
  seasonTo: 9,
  itinerary: [
    { dayNo: 1, routeMn: 'УБ → А', sleepMn: 'Гэр', km: 300 },
    { dayNo: 2, routeMn: 'А — амралт', sleepMn: 'Гэр', km: 0 },
    { dayNo: 3, routeMn: 'А → УБ', sleepMn: '—', km: 600 },
  ].map((d) => ({ routeEn: '', routeKr: '', sleepEn: '', sleepKr: '', ...d })),
  includes: [
    { kind: 'high', textMn: 'Онцлох мөч', textEn: '', textKr: '' },
    { kind: 'in', textMn: 'Хөтөч', textEn: '', textKr: '' },
    { kind: 'out', textMn: 'Нислэг', textEn: '', textKr: '' },
  ],
  ...over,
});
