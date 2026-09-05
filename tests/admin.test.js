import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient, sampleTour } from './helpers.js';

let app;

test.before(async () => {
  app = await startApp();
});
test.after(async () => app.close());

test('нэвтрээгүй үед admin API 401', async () => {
  const c = makeClient(app.base);
  const r = await c.req('/api/admin/tours');
  assert.equal(r.status, 401);
});

test('буруу нууц үгээр нэвтэрч чадахгүй', async () => {
  const c = makeClient(app.base);
  const r = await c.login('tester', 'wrong-password');
  assert.equal(r.status, 401);
});

test('зөв мэдээллээр нэвтэрч CSRF токен авна', async () => {
  const c = makeClient(app.base);
  const r = await c.login();
  assert.equal(r.status, 200);
  assert.equal(r.data.user.username, 'tester');
  assert.match(r.data.csrf, /^[a-f0-9]{48}$/);
});

test('cookie нь httpOnly', async () => {
  const c = makeClient(app.base);
  const r = await c.login();
  const cookies = r.headers.getSetCookie().join(';');
  assert.match(cookies, /HttpOnly/i);
});

test('CSRF токенгүй бичих үйлдэл 403', async () => {
  const c = makeClient(app.base);
  await c.login();
  const good = c.csrf;
  c.csrf = '';
  const r = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour() });
  assert.equal(r.status, 403);
  c.csrf = good;
});

test('буруу CSRF токен 403', async () => {
  const c = makeClient(app.base);
  await c.login();
  c.csrf = 'deadbeef'.repeat(6);
  const r = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour() });
  assert.equal(r.status, 403);
});

test('аялал үүсгэх, засах, устгах', async () => {
  const c = makeClient(app.base);
  await c.login();

  const created = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'crud-route' }) });
  assert.equal(created.status, 201);
  const id = created.data.tour.id;
  assert.equal(created.data.tour.itinerary.length, 3);

  const updated = await c.req(`/api/admin/tours/${id}`, {
    method: 'PUT',
    body: sampleTour({ slug: 'crud-route', titleMn: 'Шинэчилсэн', days: 4 }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.tour.title_mn, 'Шинэчилсэн');

  const del = await c.req(`/api/admin/tours/${id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);

  const gone = await c.req(`/api/admin/tours/${id}`);
  assert.equal(gone.status, 404);
});

test('давхардсан slug 400 + талбарын алдаа', async () => {
  const c = makeClient(app.base);
  await c.login();
  await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'dup-route' }) });
  const r = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'dup-route' }) });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.slug);
});

test('буруу slug хэлбэр 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'Буруу Slug' }) });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.slug);
});

test('гарчиггүй чиглэл 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'no-title', titleMn: '' }) });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.titleMn);
});

test('чиглэл устахад өдрийн хуваарь нь хамт устана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const { data } = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour({ slug: 'cascade-route' }) });
  const id = data.tour.id;
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM tour_days WHERE tour_id = ?').get(id).n, 3);
  await c.req(`/api/admin/tours/${id}`, { method: 'DELETE' });
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM tour_days WHERE tour_id = ?').get(id).n, 0);
});

test('зургийн CRUD ба дараалал', async () => {
  const c = makeClient(app.base);
  await c.login();
  const mk = (n) =>
    c.req('/api/admin/gallery', {
      method: 'POST',
      body: { image: `/images/gallery/x${n}.jpg`, regionKey: 'tuv', placeMn: `Зураг ${n}`, sortOrder: n },
    });
  const a = await mk(1);
  const b = await mk(2);
  assert.equal(a.status, 201);

  const re = await c.req('/api/admin/gallery/reorder', {
    method: 'POST',
    body: { order: [b.data.photo.id, a.data.photo.id] },
  });
  assert.equal(re.status, 200);
  const list = await c.req('/api/admin/gallery');
  const ids = list.data.photos.map((p) => p.id);
  assert.equal(ids.indexOf(b.data.photo.id) < ids.indexOf(a.data.photo.id), true);

  const del = await c.req(`/api/admin/gallery/${a.data.photo.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
});

test('зурагт зам заавал', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/gallery', { method: 'POST', body: { image: '' } });
  assert.equal(r.status, 400);
});

test('тохиргоо хадгалж, нийтэд гарна', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/settings/contact', {
    method: 'PUT',
    body: {
      value: {
        phone: '+976 1111 2222',
        email: 'x@y.mn',
        kakao: 'https://pf.kakao.com/x',
        instagram: 'https://instagram.com/x',
        naver: 'https://blog.naver.com/x',
        logo: '/images/site/logo.jpg',
        address: { mn: 'УБ', en: 'UB', kr: '울란바토르' },
        hours: { mn: '09-18', en: '09-18', kr: '09-18' },
      },
    },
  });
  assert.equal(r.status, 200);
  const pub = await c.req('/api/settings');
  assert.equal(pub.data.settings.contact.phone, '+976 1111 2222');
  assert.equal(pub.data.settings.contact.address.kr, '울란바토르');
});

test('үл мэдэгдэх тохиргооны түлхүүр 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/settings/hack', { method: 'PUT', body: { value: {} } });
  assert.equal(r.status, 400);
});

test('гарсны дараа сесс хүчингүй', async () => {
  const c = makeClient(app.base);
  await c.login();
  assert.equal((await c.req('/api/admin/stats')).status, 200);
  assert.equal((await c.req('/api/admin/logout', { method: 'POST' })).status, 200);
  assert.equal((await c.req('/api/admin/stats')).status, 401);
});

test('stats тоонуудыг буцаана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const r = await c.req('/api/admin/stats');
  assert.equal(r.status, 200);
  assert.equal(typeof r.data.stats.tours, 'number');
  assert.ok(Array.isArray(r.data.byRegion));
});
