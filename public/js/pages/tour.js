/* ==========================================================================
   tour.js — багцын хуудас (/tours/<slug>): нүүр зураг, гарчиг, хоног, дараа нь
   өдөр бүр дарааллаар — зургууд (дарахад lightbox), зам/цаг, үйл ажиллагаа.
   ========================================================================== */
import { getTour, ApiError } from '../core/api.js';
import { pick, onLang, getLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';
import * as lb from '../features/lightbox.js';

const L = {
  day: { kr: (n) => `${n}일차`, en: (n) => `Day ${n}` },
  days: { kr: (n) => `${n}일 일정`, en: (n) => `${n}-day itinerary` },
  info: { kr: '투어 안내', en: 'Tour information' },
  notFound: { kr: '해당 투어를 찾을 수 없습니다', en: 'This tour could not be found' },
  fail: { kr: '투어를 불러오지 못했습니다', en: 'Could not load the tour' },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function dayBlock(d, i, lang, tour) {
  const box = el('article', 'td-day');
  box.id = `day-${d.dayNo}`;

  const media = el('div', 'td-media');
  const list = d.images.length ? d.images : [];
  if (list.length) {
    const main = el('button', 'td-main');
    main.type = 'button';
    main.dataset.i = '0';
    const img = el('img');
    img.src = list[0].src;
    img.alt = pick(d.title, lang);
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';
    main.append(img);
    media.append(main);
    if (list.length > 1) {
      const row = el('div', 'td-thumbs');
      list.slice(1).forEach((im, k) => {
        const b = el('button');
        b.type = 'button';
        b.dataset.i = String(k + 1);
        const t = el('img');
        t.src = im.thumb || im.src;
        t.alt = '';
        t.loading = 'lazy';
        b.append(t);
        row.append(b);
      });
      media.append(row);
    }
    media.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      const photos = list.map((im) => ({
        image: im.src,
        place: d.title,
        caption: {
          kr: `${L.day.kr(d.dayNo)} · ${pick(tour.title, 'kr')}`,
          en: `${L.day.en(d.dayNo)} · ${pick(tour.title, 'en')}`,
        },
      }));
      lb.open(photos, Number(b.dataset.i));
    });
  }

  const body = el('div', 'td-body');
  body.append(el('span', 'td-badge', L.day[lang](d.dayNo)));
  body.append(el('h2', 'h2', pick(d.title, lang)));
  const place = pick(d.place, lang);
  if (place) body.append(el('p', 'td-place', place));
  const meta = pick(d.meta, lang);
  if (meta) body.append(el('p', 'ts-meta', meta));
  const sum = pick(d.summary, lang);
  if (sum) body.append(el('p', 'ts-sum', sum));
  const lines = String(pick(d.body, lang))
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length) {
    const ul = el('ul', 'ts-list');
    for (const s of lines) ul.append(el('li', null, s));
    body.append(ul);
  }

  box.append(media, body);
  return box;
}

async function main() {
  await boot();
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
  const root = document.querySelector('#tourRoot');
  if (!root) return;

  let tour;
  try {
    tour = await getTour(slug);
  } catch (e) {
    const lang = getLang();
    const msg = e instanceof ApiError && e.status === 404 ? L.notFound[lang] : L.fail[lang];
    root.replaceChildren(el('p', 'state', msg));
    return;
  }

  const cover = document.querySelector('#tdCover');
  if (cover && tour.cover) cover.src = tour.cover;

  onLang((lang) => {
    const set = (sel, v) => {
      const n = document.querySelector(sel);
      if (n) n.textContent = v;
    };
    set('#tdTitle', pick(tour.title, lang));
    set('#tdSum', pick(tour.summary, lang));
    const cat = document.querySelector('#tdCat');
    if (cat) {
      cat.replaceChildren();
      if (tour.category) cat.append(el('span', null, pick(tour.category.name, lang)));
      const dur = pick(tour.duration, lang);
      if (dur) cat.append(el('b', null, dur));
      if (tour.days?.length) cat.append(el('span', null, L.days[lang](tour.days.length)));
    }
    const back = document.querySelector('#tdBack');
    if (back && tour.category) back.href = `/tours#${tour.category.slug}`;

    const info = document.querySelector('#tdInfo');
    if (info) {
      const lines = String(pick(tour.info, lang))
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      info.hidden = !lines.length;
      const ul = el('ul', 'td-info-list');
      for (const s of lines) ul.append(el('li', null, s));
      info.replaceChildren(el('h2', 'h3', L.info[lang]), ul);
    }

    const days = document.querySelector('#tdDays');
    if (days) {
      days.replaceChildren(...(tour.days || []).map((d, i) => dayBlock(d, i, lang, tour)));
      reveal(days);
    }
    document.title = `${pick(tour.title, lang)} · Dream Spark Travel`;
  });
  reveal();
}

main();
