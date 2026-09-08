import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient, sampleTour, sampleCategory, sampleDay } from './helpers.js';

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

test('ангилал үүсгэх, засах, устгах — slug автоматаар, давхардвал -2', async () => {
  const c = makeClient(app.base);
  await c.login();
  const a = await c.req('/api/admin/categories', {
    method: 'POST',
    body: sampleCategory({ nameEn: 'Gobi' }),
  });
  assert.equal(a.status, 201);
  assert.equal(a.data.category.slug, 'gobi');
  const b = await c.req('/api/admin/categories', {
    method: 'POST',
    body: sampleCategory({ nameEn: 'Gobi' }),
  });
  assert.equal(b.data.category.slug, 'gobi-2');
  const kr = await c.req('/api/admin/categories', {
    method: 'POST',
    body: sampleCategory({ nameEn: '', nameKr: '홉스골' }),
  });
  assert.match(kr.data.category.slug, /^t-[a-f0-9]{6}$/);

  const id = a.data.category.id;
  const updated = await c.req(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: sampleCategory({ nameKr: '수정됨', nameEn: 'Gobi' }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.category.name_kr, '수정됨');
  assert.equal(updated.data.category.slug, 'gobi', 'засахад slug өөрчлөгдөхгүй');

  for (const x of [a, b, kr]) {
    assert.equal(
      (await c.req(`/api/admin/categories/${x.data.category.id}`, { method: 'DELETE' })).status,
      200
    );
  }
  assert.equal((await c.req(`/api/admin/categories/${id}`)).status, 404);
});

test('багц үүсгэх, засах, устгах — өдрүүд хамт хадгалагдана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const cat = await c.makeCategory({ nameEn: 'Tour cat' });

  const created = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour(cat.id) });
  assert.equal(created.status, 201);
  const t = created.data.tour;
  assert.equal(t.slug, 'central-mongolia-tour');
  assert.equal(t.days.length, 2);
  assert.deepEqual(
    t.days.map((d) => d.day_no),
    [1, 2]
  );
  assert.deepEqual(t.days[0].images, ['/images/tours/ugii-1.jpg', '/images/tours/ugii-2.jpg']);
  assert.equal(t.cover, '/images/tours/ugii-1.jpg', 'cover хоосон бол эхний өдрийн зураг');

  const updated = await c.req(`/api/admin/tours/${t.id}`, {
    method: 'PUT',
    body: sampleTour(cat.id, {
      titleKr: '수정됨',
      cover: '/uploads/x.jpg',
      days: [sampleDay({ titleKr: '하나' })],
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.tour.title_kr, '수정됨');
  assert.equal(updated.data.tour.cover, '/uploads/x.jpg');
  assert.equal(updated.data.tour.days.length, 1);
  assert.equal(updated.data.tour.days[0].title_kr, '하나');

  assert.equal((await c.req(`/api/admin/tours/${t.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.req(`/api/admin/tours/${t.id}`)).status, 404);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM tour_days WHERE tour_id = ?').get(t.id).n, 0);
});

test('гарчиггүй багц 400, байхгүй ангилалтай багц 400', async () => {
  const c = makeClient(app.base);
  await c.login();
  const cat = await c.makeCategory({ nameEn: 'Title cat' });
  const r = await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(cat.id, { titleKr: '' }),
  });
  assert.equal(r.status, 400);
  assert.ok(r.data.details.titleKr);
  const r2 = await c.req('/api/admin/tours', { method: 'POST', body: sampleTour(999999) });
  assert.equal(r2.status, 400);
});

test('ангилал устахад багцууд, өдрүүд нь хамт устана', async () => {
  const c = makeClient(app.base);
  await c.login();
  const cat = await c.makeCategory({ nameEn: 'Cascade cat' });
  const t = await c.makeTour(cat.id);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM tour_days WHERE tour_id = ?').get(t.id).n, 2);
  await c.req(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
  assert.equal(
    app.db.prepare('SELECT COUNT(*) n FROM tours WHERE category_id = ?').get(cat.id).n,
    0
  );
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM tour_days WHERE tour_id = ?').get(t.id).n, 0);
});

test('ангилал, багцын дараалал солигдоно', async () => {
  const c = makeClient(app.base);
  await c.login();
  const a = await c.makeCategory({ nameEn: 'Order A' });
  const b = await c.makeCategory({ nameEn: 'Order B' });
  assert.ok(a.sort_order < b.sort_order);
  const re = await c.req('/api/admin/categories/reorder', {
    method: 'POST',
    body: { order: [b.id, a.id] },
  });
  assert.equal(re.status, 200);
  const list = (await c.req('/api/admin/categories')).data.categories.map((x) => x.id);
  assert.ok(list.indexOf(b.id) < list.indexOf(a.id));
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

test('тохиргоо хадгалж, нийтэд гарна; утгын өмнөх «:» хасагдана', async () => {
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
        ceo: ':M.Battsetseg',
        licenseNo: '제2026-000001호',
        phone: '+976 1111 2222',
        email: ' : x@y.mn',
      },
    },
  });
  assert.equal(footer.status, 200);

  const pub = await c.req('/api/settings');
  assert.equal(pub.data.settings.site.hero.line1.kr, 'YOUR JOURNEY');
  assert.equal(pub.data.settings.site.instagram, 'https://instagram.com/x');
  assert.equal(pub.data.settings.footer.ceo, 'M.Battsetseg');
  assert.equal(pub.data.settings.footer.email, 'x@y.mn');
  assert.equal(pub.data.settings.footer.licenseNo, '제2026-000001호');
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
  assert.equal(typeof r.data.stats.days, 'number');
  assert.ok(Array.isArray(r.data.byRegion));
});
