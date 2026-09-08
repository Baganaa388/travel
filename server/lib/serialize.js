/* DB мөрийг нийтийн API хэлбэрт хөрвүүлнэ — зөвхөн зөвшөөрсөн талбарууд гарна. */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['kr', 'en'];

/* Жижиг хувилбар (thumbs/) байвал жагсаалт, картад түүнийг өгнө — том нь lightbox-д. */
const IMAGES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'public',
  'images'
);
const thumbSets = new Map();
export function thumbFor(image) {
  const m = /^\/images\/(gallery|tours)\/([^/]+)$/.exec(image || '');
  if (!m) return image;
  const [, dir, file] = m;
  if (!thumbSets.has(dir)) {
    try {
      thumbSets.set(dir, new Set(readdirSync(path.join(IMAGES, dir, 'thumbs'))));
    } catch {
      thumbSets.set(dir, new Set());
    }
  }
  return thumbSets.get(dir).has(file) ? `/images/${dir}/thumbs/${file}` : image;
}

/** {title_kr, title_en} → {kr, en}; хоосон хэл нь KR руу унана. */
export function i18n(row, base) {
  const out = {};
  for (const l of LANGS) {
    const v = row[`${base}_${l}`];
    out[l] = v && String(v).trim() ? v : row[`${base}_kr`] || '';
  }
  return out;
}

export function parseImages(json) {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x) : [];
  } catch {
    return [];
  }
}

export function publicDay(row) {
  const images = parseImages(row.images);
  return {
    dayNo: row.day_no,
    images: images.map((src) => ({ src, thumb: thumbFor(src) })),
    title: i18n(row, 'title'),
    place: i18n(row, 'place'),
    meta: i18n(row, 'meta'),
    summary: i18n(row, 'summary'),
    body: i18n(row, 'body'),
  };
}

/** Багц (карт). days өгвөл дэлгэрэнгүй хуудасны хэлбэр. */
export function publicTour(row, { days = null, category = null } = {}) {
  const t = {
    slug: row.slug,
    cover: row.cover,
    coverThumb: thumbFor(row.cover),
    title: i18n(row, 'title'),
    duration: i18n(row, 'duration'),
    summary: i18n(row, 'summary'),
    daysCount: row.days_count ?? (days ? days.length : undefined),
  };
  if (days) {
    t.days = days.map(publicDay);
    t.info = i18n(row, 'info');
  }
  if (category) t.category = { slug: category.slug, name: i18n(category, 'name') };
  return t;
}

export function publicCategory(row, tours = []) {
  return {
    slug: row.slug,
    cover: row.cover,
    coverThumb: thumbFor(row.cover),
    name: i18n(row, 'name'),
    tours: tours.map((t) => publicTour(t)),
  };
}

export const publicPhoto = (g) => ({
  id: g.id,
  image: g.image,
  thumb: thumbFor(g.image),
  regionKey: g.region_key,
  place: i18n(g, 'place'),
  caption: i18n(g, 'caption'),
  credit: g.credit || '',
});
