import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient, sampleTour } from './helpers.js';

let app;
let c;

test.before(async () => {
  app = await startApp();
  c = makeClient(app.base);
  await c.login();
  const catId = await c.makeCategory();
  const hiddenCat = await c.makeCategory({ slug: 'hidden-cat', isActive: false, nameKr: '숨김' });
  await c.req('/api/admin/tours', { method: 'POST', body: sampleTour(catId) });
  await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(catId, { slug: 'hidden-route', isActive: false, titleKr: '숨김', dayNo: 2 }),
  });
  await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour(hiddenCat, { slug: 'in-hidden-cat', titleKr: '숨김 안' }),
  });
  await c.req('/api/admin/gallery', {
    method: 'POST',
    body: {
      image: '/images/gallery/gobi-02.jpg',
      regionKey: 'gobi',
      placeKr: '홍고린 엘스',
      placeEn: 'Khongoryn Els',
      captionKr: '설명',
      isActive: true,
      sortOrder: 0,
      credit: 'Author · CC0',
    },
  });
});

test.after(async () => app.close());

test('health эсэн мэнд', async () => {
  const r = await c.req('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test('/api/tours зөвхөн идэвхтэй ангилал, идэвхтэй аяллыг буцаана', async () => {
  const r = await c.req('/api/tours');
  assert.equal(r.status, 200);
  assert.equal(r.data.categories.length, 1);
  const cat = r.data.categories[0];
  assert.equal(cat.slug, 'test-cat');
  assert.equal(cat.tours.length, 1);
  assert.equal(cat.tours[0].slug, 'test-route');
});

test('ангилал, аяллын хоёр хэл бүрэн ирнэ', async () => {
  const { data } = await c.req('/api/tours');
  const cat = data.categories[0];
  assert.equal(cat.name.kr, '테스트 투어');
  assert.equal(cat.name.en, 'Test tour');
  assert.equal(cat.sub.kr, '4박5일');
  const t = cat.tours[0];
  assert.equal(t.title.kr, '우기 호수');
  assert.equal(t.title.en, 'Ugii Lake');
  assert.equal(t.dayNo, 1);
});

test('хоосон орчуулга KR руу унана', async () => {
  const { data } = await c.req('/api/tours/test-route');
  assert.equal(data.tour.place.en, '아르항가이', 'EN хоосон бол KR-ээр нөхөнө');
});

test('аяллын зургууд thumb замтай ирнэ, эхнийх нь cover', async () => {
  const { data } = await c.req('/api/tours/test-route');
  assert.equal(data.tour.images.length, 2);
  assert.equal(data.tour.cover, '/images/tours/ugii-1.jpg');
  assert.equal(data.tour.coverThumb, '/images/tours/thumbs/ugii-1.jpg');
  assert.equal(data.tour.images[1].thumb, '/images/tours/thumbs/ugii-2.jpg');
});

test('байхгүй аялал 404', async () => {
  const r = await c.req('/api/tours/no-such-route');
  assert.equal(r.status, 404);
});

test('нуусан аялал болон нуусан ангиллын аялал нийтэд харагдахгүй', async () => {
  assert.equal((await c.req('/api/tours/hidden-route')).status, 404);
  assert.equal((await c.req('/api/tours/in-hidden-cat')).status, 404);
});

test('/api/gallery thumb замыг өгнө', async () => {
  const { data } = await c.req('/api/gallery');
  assert.equal(data.photos.length, 1);
  const p = data.photos[0];
  assert.equal(p.image, '/images/gallery/gobi-02.jpg');
  assert.equal(p.thumb, '/images/gallery/thumbs/gobi-02.jpg');
  assert.equal(p.place.kr, '홍고린 엘스');
  assert.equal(p.place.en, 'Khongoryn Els');
});

test('gallery нутгаар шүүнэ', async () => {
  const a = await c.req('/api/gallery?region=gobi');
  assert.equal(a.data.photos.length, 1);
  const b = await c.req('/api/gallery?region=tuv');
  assert.equal(b.data.photos.length, 0);
});

test('буруу region 400', async () => {
  const r = await c.req('/api/gallery?region=mars');
  assert.equal(r.status, 400);
});

test('/api/settings нийтийн түлхүүрүүдийг өгнө', async () => {
  const r = await c.req('/api/settings');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data.settings).sort(), ['footer', 'site']);
});

test('API-ийн үл мэдэгдэх зам JSON 404 буцаана', async () => {
  const r = await c.req('/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.data.error, 'Олдсонгүй');
});
