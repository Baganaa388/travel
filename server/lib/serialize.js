/* DB мөрийг нийтийн API хэлбэрт хөрвүүлнэ — зөвхөн зөвшөөрсөн талбарууд гарна. */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['mn', 'en', 'kr'];

/* Жижиг хувилбар (thumbs/) байвал жагсаалт, картад түүнийг өгнө — том нь lightbox, толгойд. */
const IMAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'images');
const thumbSets = new Map();
function thumbFor(image) {
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

/** {title_mn, title_en, title_kr} → {mn, en, kr}; хоосон хэл нь MN руу унана. */
function i18n(row, base) {
  const out = {};
  for (const l of LANGS) {
    const v = row[`${base}_${l}`];
    out[l] = v && String(v).trim() ? v : row[`${base}_mn`] || '';
  }
  return out;
}

export function publicTour(row, { days = null, includes = null } = {}) {
  const t = {
    slug: row.slug,
    cover: row.cover,
    coverThumb: thumbFor(row.cover),
    regionKey: row.region_key,
    title: i18n(row, 'title'),
    area: i18n(row, 'area'),
    summary: i18n(row, 'summary'),
    days: row.days,
    kmTotal: row.km_total,
    groupMin: row.group_min,
    groupMax: row.group_max,
    seasonFrom: row.season_from,
    seasonTo: row.season_to,
  };
  if (row.body_mn !== undefined) t.body = i18n(row, 'body');
  if (days) t.itinerary = days.map(publicTourDay);
  if (includes) {
    t.highlights = includes.filter((x) => x.kind === 'high').map(publicInclude);
    t.includes = includes.filter((x) => x.kind === 'in').map(publicInclude);
    t.excludes = includes.filter((x) => x.kind === 'out').map(publicInclude);
  }
  return t;
}

export const publicTourDay = (d) => ({
  dayNo: d.day_no,
  route: i18n(d, 'route'),
  sleep: i18n(d, 'sleep'),
  km: d.km,
});

export const publicInclude = (x) => ({ text: i18n(x, 'text') });

export const publicPhoto = (g) => ({
  id: g.id,
  image: g.image,
  thumb: thumbFor(g.image),
  regionKey: g.region_key,
  place: i18n(g, 'place'),
  caption: i18n(g, 'caption'),
  credit: g.credit || '',
});

