import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient, sampleTour, sampleCategory } from './helpers.js';

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
  const r = await c.req('/api/admin/categories', { method: 'POST', body: sampleCategory() });
  assert.equal(r.status, 403);
  c.csrf = good;
});

test('буруу CSRF токен 403', async () => {
  const c = makeClient(app.base);
  await c.login();
  c.csrf = 'deadbeef'.repeat(6);
  const r = await c.req('/api/admin/categories', { method: 'POST', body: sampleCategory() });
  assert.equal(r.status, 403);
});

test('ангилал үүсгэх, засах, устгах', async () => {
  const c = makeClient(app.base);
  await c.login();
  const created = await c.req('/api/admin/categories', {
    method: 'POST',
    body: sampleCategory({ slug: 'crud-cat' }),
  });
  assert.equal(created.status, 201);
  const id = created.data.category.id;

  const updated = await c.req(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: sampleCategory({ slug: 'crud-cat', nameKr: '수정됨' }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.category.name_kr, '수정됨');

  const list = await c.req('/api/admin/categories');
  assert.ok(list.data.categories.some((x) => x.id === id));

  assert.equal((await c.req(`/api/admin/categories/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.req(`/api/admin/categories/${id}`)).status, 404);
});

test('аялал үүсгэх, засах, устгах — зургууд JSON-оор хадгалагдана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory({ slug: 'tour-cat' });

  const created = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'crud-route' }),
  });
  assert.equal(created.status, 201);
  const id = created.data.tour.id;
  assert.deepEqual(created.data.tour.images, [
    '/images/tours/ugii-1.jpg',
    '/images/tours/ugii-2.jpg',
  ]);

  const updated = await c.req(`/api/admin/tours/${id}`, {
    method: 'PUT',
    body: sampleTour(catId, {
      slug: 'crud-route',
      titleKr: '수정됨',
      dayNo: 3,
      images: ['/uploads/x.jpg'],
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.tour.title_kr, '수정됨');
  assert.equal(updated.data.tour.day_no, 3);
  assert.deepEqual(updated.data.tour.images, ['/uploads/x.jpg']);

  assert.equal((await c.req(`/api/admin/tours/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.req(`/api/admin/tours/${id}`)).status, 404);
});

test('давхардсан slug 400 + талбарын алдаа', async () => {
  const c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory({ slug: 'dup-cat' });
  await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'dup-route' }),
  });
  const r = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'dup-route' }),
  });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.slug);
});

test('буруу slug хэлбэр 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory({ slug: 'slug-cat' });
  const r = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'Буруу Slug' }),
  });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.slug);
});

test('гарчиггүй аялал 400, байхгүй ангилалтай аялал 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory({ slug: 'title-cat' });
  const r = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'no-title', titleKr: '' }),
  });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.titleKr);
  const r2 = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(999999, { slug: 'no-cat' }),
  });
  assert.equal(r2.status, 400);
});

test('ангилал устахад аяллууд нь хамт устана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory({ slug: 'cascade-cat' });
  await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'cascade-route' }),
  });
  assert.equal(
    app.db.prepare('SELECT COUNT(*) n FROM tours WHERE category_id = ?').get(catId).n,
    1
  );
  await c.req(`/api/admin/categories/${catId}`, { method: 'DELETE' });
  assert.equal(
    app.db.prepare('SELECT COUNT(*) n FROM tours WHERE category_id = ?').get(catId).n,
    0
  );
});

test('зургийн CRUD ба дараалал', async () => {
  const c = makeClient(app.base);
  await c.login();
  const mk = (n) =>
    c.req('/api/admin/gallery', {
      method: 'POST',
      body: {
        image: `/images/gallery/x${n}.jpg`,
        regionKey: 'tuv',
        placeKr: `사진 ${n}`,
        sortOrder: n,
      },
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
  const site = await c.req('/api/admin/settings/site', {
    method: 'PUT',
    body: {
      value: {
        logo: '/images/site/logo.jpg',
        brand: 'Dream Spark',
        instagram: 'https://instagram.com/x',
        naver: '',
        hero: {
          image: '/images/gallery/cliffs-04.jpg',
          line1: { kr: 'YOUR JOURNEY', en: 'YOUR JOURNEY' },
          line2: { kr: 'YOUR STORY', en: 'YOUR STORY' },
          button: { kr: '투어 보기', en: 'View tours' },
        },
      },
    },
  });
  assert.equal(site.status, 200);
  const footer = await c.req('/api/admin/settings/footer', {
    method: 'PUT',
    body: {
      value: {
        company: { kr: '드림스파크', en: 'Dream Spark' },
        ceo: 'M.BATTSETSEG',
        phone: '+976 1111 2222',
      },
    },
  });
  assert.equal(footer.status, 200);

  const pub = await c.req('/api/settings');
  assert.equal(pub.data.settings.site.hero.line1.kr, 'YOUR JOURNEY');
  assert.equal(pub.data.settings.site.instagram, 'https://instagram.com/x');
  assert.equal(pub.data.settings.footer.ceo, 'M.BATTSETSEG');
  assert.equal(pub.data.settings.footer.phone, '+976 1111 2222');
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
  assert.equal(typeof r.data.stats.categories, 'number');
  assert.ok(Array.isArray(r.data.byRegion));
});
