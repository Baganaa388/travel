import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient } from './helpers.js';

let app;
let c;

test.before(async () => {
  app = await startApp();
  c = makeClient(app.base);
});
test.after(async () => app.close());

const PAGES = ['/', '/tours', '/tour/gobi', '/gallery', '/about', '/contact'];

for (const p of PAGES) {
  test(`хуудас ${p} 200 буцаана`, async () => {
    const r = await c.req(p, { headers: { accept: 'text/html' } });
    assert.equal(r.status, 200);
    assert.match(r.data, /<!DOCTYPE html>/i);
  });
}

test('байхгүй хуудас 404 + 404.html', async () => {
  const r = await c.req('/no-such-page', { headers: { accept: 'text/html' } });
  assert.equal(r.status, 404);
  assert.match(r.data, /404/);
});

test('.html зам цэвэр зам руу 301', async () => {
  const res = await fetch(`${app.base}/tours.html`, { redirect: 'manual' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/tours');
});

test('index.html нүүр рүү 301', async () => {
  const res = await fetch(`${app.base}/index.html`, { redirect: 'manual' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/');
});

test('admin login хуудас нээгдэнэ', async () => {
  const r = await c.req('/admin/login', { headers: { accept: 'text/html' } });
  assert.equal(r.status, 200);
  assert.match(r.data, /admin\/js\/login\.js/);
});

test('аюулгүйн толгойнууд тавигдсан', async () => {
  const res = await fetch(`${app.base}/`);
  const csp = res.headers.get('content-security-policy') || '';
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('CSP нь fonts.googleapis.com-ыг зөвшөөрнө', async () => {
  const res = await fetch(`${app.base}/`);
  const csp = res.headers.get('content-security-policy') || '';
  assert.match(csp, /fonts\.googleapis\.com/);
  assert.match(csp, /fonts\.gstatic\.com/);
});

test('upload устгах зам traversal-аас хамгаалагдсан', async () => {
  const admin = makeClient(app.base);
  await admin.login();
  const r = await admin.req('/api/admin/upload/..%2F..%2Fpackage.json', { method: 'DELETE' });
  assert.ok([400, 404].includes(r.status), `хүлээгдсэн 400/404, ирсэн ${r.status}`);
});

test('статик зураг кэштэй ирнэ', async () => {
  const res = await fetch(`${app.base}/images/site/logo.jpg`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control') || '', /max-age=\d+/);
});
