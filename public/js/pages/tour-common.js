import { pick } from '../core/i18n.js';

/* Аяллын картуудад нийтлэг жижиг туслахууд. */

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function months(from, to, lang) {
  if (lang === 'en') return `${MONTHS_EN[from - 1]}–${MONTHS_EN[to - 1]}`;
  if (lang === 'kr') return `${from}~${to}월`;
  return `${from}–${to} сар`;
}

const CUSTOM = {
  mn: 'Хугацаа тохиролцоно',
  en: 'Length arranged with you',
  kr: '일정 맞춤 구성',
};

const DAYS = {
  mn: (n) => `${n} хоног`,
  en: (n) => `${n} days`,
  kr: (n) => `${n}일`,
};

const REGION = {
  gobi: { mn: 'Говь', en: 'Gobi', kr: '고비' },
  khuvsgul: { mn: 'Хөвсгөл', en: 'Khövsgöl', kr: '홉스골' },
  tuv: { mn: 'Төв нутаг', en: 'Central Mongolia', kr: '중부' },
  other: { mn: 'Бусад нутаг', en: 'Elsewhere', kr: '기타 지역' },
};

/** Картын мета мөр — зөвхөн бодитой утгыг харуулна. */
export function seasonLabel(t, lang) {
  const out = [];
  if (t.days > 0) out.push(DAYS[lang](t.days));
  else out.push(CUSTOM[lang]);
  out.push(months(t.seasonFrom, t.seasonTo, lang));
  if (t.groupMin > 0 && t.groupMax > 0) out.push(`${t.groupMin}–${t.groupMax}`);
  return out;
}

export const customLabel = (lang) => CUSTOM[lang] || CUSTOM.mn;
export const daysLabel = (n, lang) => (DAYS[lang] || DAYS.mn)(n);
export const regionName = (key, lang) => (REGION[key] || REGION.other)[lang] || REGION[key]?.mn || '';

/** Аяллын карт (нүүр, бидний тухай). */
export function poster(t, lang) {
  const a = document.createElement('a');
  a.className = 'poster';
  a.href = `/tour/${t.slug}`;
  a.dataset.region = t.regionKey;

  const shot = document.createElement('div');
  shot.className = 'shot';
  const img = document.createElement('img');
  img.src = t.coverThumb || t.cover;
  img.alt = pick(t.title, lang);
  img.loading = 'lazy';
  img.decoding = 'async';
  const tag = document.createElement('span');
  tag.className = 'rtag';
  tag.textContent = regionName(t.regionKey, lang);
  shot.append(img, tag);

  const box = document.createElement('div');
  box.className = 'poster-in';

  const h = document.createElement('h3');
  h.className = 'h3';
  h.textContent = pick(t.title, lang);

  const area = document.createElement('p');
  area.className = 'area';
  area.textContent = pick(t.area, lang);

  const p = document.createElement('p');
  p.textContent = pick(t.summary, lang);

  const meta = document.createElement('p');
  meta.className = 'meta';
  for (const v of seasonLabel(t, lang)) {
    const s = document.createElement('span');
    s.textContent = v;
    meta.append(s);
  }

  box.append(h, area, p, meta);
  a.append(shot, box);
  return a;
}
