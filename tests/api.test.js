import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, makeClient } from './helpers.js';

let app;
let c;
let tourSlug;

test.before(async () => {
  app = await startApp();
  c = makeClient(app.base);
  await c.login();
  const cat = await c.makeCategory();
  const hiddenCat = await c.makeCategory({ isActive: false, nameKr: '숨김', nameEn: 'Hidden cat' });
  tourSlug = (await c.makeTour(cat.id)).slug;
  await c.makeTour(cat.id, { isActive: false, titleKr: '숨김', titleEn: 'Hidden route' });
  await c.makeTour(hiddenCat.id, { titleKr: '숨김 안', titleEn: 'In hidden cat' });
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

test('/api/tours зөвхөн идэвхтэй ангилал, идэвхтэй багцыг буцаана', async () => {
  const r = await c.req('/api/tours');
  assert.equal(r.status, 200);
  assert.equal(r.data.categories.length, 1);
  const cat = r.data.categories[0];
  assert.equal(cat.name.kr, '중부 몽골');
  assert.equal(cat.tours.length, 1);
  assert.equal(cat.tours[0].slug, tourSlug);
  assert.equal(cat.tours[0].daysCount, 2);
});

test('slug нь англи гарчгаас үүснэ', async () => {
  assert.equal(tourSlug, 'central-mongolia-tour');
  const { data } = await c.req('/api/tours');
  assert.equal(data.categories[0].slug, 'central-mongolia');
});

test('картын cover нь өгөөгүй бол 1-р өдрийн эхний зураг', async () => {
  const { data } = await c.req('/api/tours');
  const t = data.categories[0].tours[0];
  assert.equal(t.cover, '/images/tours/ugii-1.jpg');
  assert.equal(t.coverThumb, '/images/tours/thumbs/ugii-1.jpg');
  assert.equal(t.duration.kr, '4박5일');
});

test('багцын хуудас өдрүүд, ангиллаа хамт өгнө', async () => {
  const { data } = await c.req(`/api/tours/${tourSlug}`);
  const t = data.tour;
  assert.equal(t.title.en, 'Central Mongolia Tour');
  assert.equal(t.category.slug, 'central-mongolia');
  assert.equal(t.days.length, 2);
  assert.deepEqual(
    t.days.map((d) => d.dayNo),
    [1, 2]
  );
  assert.equal(t.days[0].title.kr, '우기 호수');
  assert.equal(t.days[0].images[1].thumb, '/images/tours/thumbs/ugii-2.jpg');
  assert.equal(t.days[0].place.en, '아르항가이', 'EN хоосон бол KR-ээр нөхөнө');
});

test('байхгүй багц 404', async () => {
  const r = await c.req('/api/tours/no-such-route');
  assert.equal(r.status, 404);
});

test('нуусан багц болон нуусан ангиллын багц нийтэд харагдахгүй', async () => {
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
