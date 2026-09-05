import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient, sampleTour } from './helpers.js';

let app;
let c;

test.before(async () => {
  app = await startApp();
  c = makeClient(app.base);
  await c.login();
  await c.req('/api/admin/tours', { method: 'POST', body: sampleTour() });
  await c.req('/api/admin/tours', {
    method: 'POST',
    body: sampleTour({ slug: 'hidden-route', isActive: false, titleMn: 'Нуусан' }),
  });
  await c.req('/api/admin/gallery', {
    method: 'POST',
    body: {
      image: '/images/gallery/gobi-02.jpg',
      regionKey: 'gobi',
      placeMn: 'Хонгорын элс',
      placeEn: 'Khongoryn Els',
      placeKr: '홍고린 엘스',
      captionMn: 'Тайлбар',
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

test('/api/tours зөвхөн идэвхтэйг буцаана', async () => {
  const r = await c.req('/api/tours');
  assert.equal(r.status, 200);
  assert.equal(r.data.tours.length, 1);
  assert.equal(r.data.tours[0].slug, 'test-route');
});

test('чиглэлийн гурван хэл бүрэн ирнэ', async () => {
  const { data } = await c.req('/api/tours/test-route');
  assert.equal(data.tour.title.mn, 'Туршилтын чиглэл');
  assert.equal(data.tour.title.en, 'Test route');
  assert.equal(data.tour.title.kr, '테스트 코스');
});

test('хоосон орчуулга MN руу унана', async () => {
  const { data } = await c.req('/api/tours/test-route');
  assert.equal(data.tour.area.en, 'Өмнөговь', 'EN хоосон бол MN-ээр нөхөнө');
});

test('өдрийн хуваарь дараалалтай, амралтын өдөр 0 км', async () => {
  const { data } = await c.req('/api/tours/test-route');
  const days = data.tour.itinerary;
  assert.equal(days.length, 3);
  assert.deepEqual(days.map((d) => d.dayNo), [1, 2, 3]);
  assert.equal(days[1].km, 0);
});

test('багц high/in/out болж хуваагдана', async () => {
  const { data } = await c.req('/api/tours/test-route');
  assert.equal(data.tour.highlights.length, 1);
  assert.equal(data.tour.includes.length, 1);
  assert.equal(data.tour.excludes.length, 1);
  assert.equal(data.tour.highlights[0].text.mn, 'Онцлох мөч');
  assert.equal(data.tour.excludes[0].text.mn, 'Нислэг');
});

test('байхгүй чиглэл 404', async () => {
  const r = await c.req('/api/tours/no-such-route');
  assert.equal(r.status, 404);
});

test('нуусан чиглэл нийтэд харагдахгүй', async () => {
  const r = await c.req('/api/tours/hidden-route');
  assert.equal(r.status, 404);
});

test('/api/gallery thumb замыг өгнө', async () => {
  const { data } = await c.req('/api/gallery');
  assert.equal(data.photos.length, 1);
  const p = data.photos[0];
  assert.equal(p.image, '/images/gallery/gobi-02.jpg');
  assert.equal(p.thumb, '/images/gallery/thumbs/gobi-02.jpg');
  assert.equal(p.place.kr, '홍고린 엘스');
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
  assert.deepEqual(Object.keys(r.data.settings).sort(), ['contact']);
});

test('API-ийн үл мэдэгдэх зам JSON 404 буцаана', async () => {
  const r = await c.req('/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.data.error, 'Олдсонгүй');
});
