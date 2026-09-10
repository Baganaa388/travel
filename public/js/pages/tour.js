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

/* Өдөр бүрийн зургийн слайд — дахин зурахаас өмнө цэвэрлэнэ */
const shows = [];
function stopShows() {
  while (shows.length) shows.pop()();
}
const AUTO_MS = 4600;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Том карт дотор бүх зураг давхарлан байрлаж, доор нь туслах зургууд хөвнө.
 * Автоматаар ээлжлэн солигдоно; хулгана дээр очих / товч дарахад түр зогсоно.
 */
function slideshow(list, alt, eager) {
  const stage = el('div', 'td-stage');
  const main = el('button', 'td-main');
  main.type = 'button';
  main.setAttribute('aria-label', alt);
  const slides = list.map((im, k) => {
    const img = el('img', k === 0 ? 'td-slide on' : 'td-slide');
    img.src = im.src;
    img.alt = k === 0 ? alt : '';
    img.loading = eager && k === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';
    return img;
  });
  main.append(...slides);
  stage.append(main);

  let at = 0;
  const dots = [];
  const show = (k) => {
    if (k === at) return;
    slides[at].classList.remove('on');
    dots[at]?.classList.remove('on');
    at = k;
    slides[at].classList.add('on');
    dots[at]?.classList.add('on');
  };

  if (list.length > 1) {
    const row = el('div', 'td-thumbs');
    list.forEach((im, k) => {
      const b = el('button');
      b.type = 'button';
      b.className = k === 0 ? 'on' : '';
      b.setAttribute('aria-label', String(k + 1));
      const t = el('img');
      t.src = im.thumb || im.src;
      t.alt = '';
      t.loading = 'lazy';
      b.append(t);
      b.addEventListener('click', () => {
        show(k);
        bump();
      });
      row.append(b);
      dots.push(b);
    });
    stage.append(row);
  }

  let timer = 0;
  let seen = false;
  let held = false;
  const stop = () => {
    clearInterval(timer);
    timer = 0;
  };
  const start = () => {
    if (timer || held || !seen || list.length < 2 || calm()) return;
    timer = setInterval(() => show((at + 1) % list.length), AUTO_MS);
  };
  const bump = () => {
    stop();
    start();
  };
  const io = new IntersectionObserver(
    (es) => {
      seen = es[0].isIntersecting;
      seen ? start() : stop();
    },
    { threshold: 0.25 }
  );
  io.observe(stage);
  const hold = (v) => {
    held = v;
    v ? stop() : start();
  };
  stage.addEventListener('pointerenter', () => hold(true));
  stage.addEventListener('pointerleave', () => hold(false));
  stage.addEventListener('focusin', () => hold(true));
  stage.addEventListener('focusout', () => hold(false));
  shows.push(() => {
    stop();
    io.disconnect();
  });

  return { stage, main, at: () => at };
}

function dayBlock(d, i, lang, tour) {
  const box = el('article', 'td-day');
  box.id = `day-${d.dayNo}`;

  const media = el('div', 'td-media');
  const list = d.images.length ? d.images : [];
  if (list.length) {
    const show = slideshow(list, pick(d.title, lang), i === 0);
    show.main.addEventListener('click', () => {
      const photos = list.map((im) => ({
        image: im.src,
        place: d.title,
        caption: {
          kr: `${L.day.kr(d.dayNo)} · ${pick(tour.title, 'kr')}`,
          en: `${L.day.en(d.dayNo)} · ${pick(tour.title, 'en')}`,
        },
      }));
      lb.open(photos, show.at());
    });
    media.append(show.stage);
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
      stopShows();
      days.replaceChildren(...(tour.days || []).map((d, i) => dayBlock(d, i, lang, tour)));
      reveal(days);
    }
    document.title = `${pick(tour.title, lang)} · Dream Spark Travel`;
  });
  reveal();
}

main();
