/* ==========================================================================
   tour.js — аяллын дэлгэрэнгүй
   Өдрийн хуваарь бөглөгдсөн үед л замын багана болон хүснэгт гарч ирнэ.
   ========================================================================== */
import { getTour, ApiError } from '../core/api.js';
import { pick, onLang, getLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';
import { months, customLabel, daysLabel, regionName } from './tour-common.js';

const BASE_SCALE = 700;

const L = {
  duration: { mn: 'Хугацаа', en: 'Length', kr: '기간' },
  distance: { mn: 'Нийт зам', en: 'Total distance', kr: '총 이동 거리' },
  season: { mn: 'Улирал', en: 'Season', kr: '시즌' },
  group: { mn: 'Бүлэг', en: 'Group', kr: '인원' },
  groupAny: { mn: 'Гэр бүл, хос, найзууд', en: 'Family, a couple, friends', kr: '가족·커플·친구' },
  langs: { mn: 'Хэл', en: 'Languages', kr: '언어' },
  highlights: { mn: 'Аяллын онцлох мөчүүд', en: 'What the days hold', kr: '이 투어의 하이라이트' },
  chart: { mn: 'Өдөр тутмын зам · км', en: 'Distance driven per day · km', kr: '하루 이동 거리 · km' },
  scale: { mn: (n) => `Хэмжүүр 0–${n}`, en: (n) => `Scale 0–${n}`, kr: (n) => `축척 0–${n}` },
  driveDay: { mn: 'Замд байх өдөр', en: 'Driving day', kr: '이동일' },
  restDay: { mn: 'Амралтын өдөр — хөдөлдөггүй', en: 'Rest day — no driving', kr: '휴식일 — 이동 없음' },
  plan: { mn: 'Өдрийн хуваарь', en: 'Day by day', kr: '일자별 일정' },
  day: { mn: 'Өдөр', en: 'Day', kr: '일' },
  route: { mn: 'Маршрут', en: 'Route', kr: '경로' },
  sleep: { mn: 'Хонох', en: 'Sleep', kr: '숙박' },
  included: { mn: 'Багтсан', en: 'Included', kr: '포함' },
  excluded: { mn: 'Багтаагүй', en: 'Not included', kr: '불포함' },
  package: { mn: 'Багц', en: 'What the price covers', kr: '요금 포함 내역' },
  ask: { mn: 'Энэ аяллаар асуух', en: 'Ask about this tour', kr: '이 투어 문의하기' },
  all: { mn: 'Бүх аялал', en: 'All tours', kr: '모든 투어' },
};

const km = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ---- Онцлох мөчүүд ------------------------------------------------------ */
function drawHighlights(box, list, lang) {
  if (!list?.length) {
    box.replaceChildren();
    return;
  }
  const ol = el('ol', 'high-list');
  for (const h of list) ol.append(el('li', null, pick(h.text, lang)));
  box.replaceChildren(el('h2', 'h2 dot-head', L.highlights[lang]), ol);
}

/* ---- Замын уртын багана (өдрийн хуваарьтай үед) ------------------------- */
function drawChart(box, itinerary, lang) {
  const maxKm = Math.max(0, ...itinerary.map((d) => d.km));
  if (!maxKm) {
    box.replaceChildren();
    return;
  }
  const scale = Math.max(BASE_SCALE, Math.ceil(maxKm / 100) * 100);
  const hasRest = itinerary.some((d) => d.km === 0);

  const fig = el('figure', 'drive');
  const cap = el('figcaption');
  cap.append(el('span', null, L.chart[lang]), el('span', null, L.scale[lang](scale)));

  const plot = el('div', 'drive-plot');
  for (const d of itinerary) {
    const bar = el('div', d.km === 0 ? 'bar rest' : 'bar');
    bar.title = `${d.dayNo} · ${d.km === 0 ? '0' : km(d.km)} km`;
    const pct = `${((d.km / scale) * 100).toFixed(1)}%`;
    if (d.km === maxKm && d.km > 0) {
      bar.style.setProperty('--v', pct);
      bar.append(el('b', null, km(d.km)));
    }
    const i = el('i');
    i.style.setProperty('--v', pct);
    bar.append(i);
    plot.append(bar);
  }

  const daysRow = el('div', 'drive-days');
  for (const d of itinerary) daysRow.append(el('span', null, String(d.dayNo)));

  const key = el('div', 'drive-key');
  const k1 = el('span');
  k1.append(el('i'), document.createTextNode(L.driveDay[lang]));
  key.append(k1);
  if (hasRest) {
    const k2 = el('span');
    k2.append(el('i', 'r'), document.createTextNode(L.restDay[lang]));
    key.append(k2);
  }

  fig.append(cap, plot, daysRow, key);
  box.replaceChildren(fig);
}

/* ---- Өдрийн хүснэгт ----------------------------------------------------- */
function drawTable(box, itinerary, lang) {
  if (!itinerary?.length) {
    box.replaceChildren();
    return;
  }
  const table = el('table', 'days-table');
  const thead = el('thead');
  const hr = el('tr');
  for (const h of [L.day[lang], L.route[lang], L.sleep[lang], 'km']) hr.append(el('th', null, h));
  thead.append(hr);

  const tbody = el('tbody');
  for (const d of itinerary) {
    const tr = el('tr', d.km === 0 ? 'rest' : null);
    tr.append(
      el('td', null, String(d.dayNo)),
      el('td', null, pick(d.route, lang)),
      el('td', null, pick(d.sleep, lang) || '—'),
      el('td', null, d.km === 0 ? '—' : km(d.km))
    );
    tbody.append(tr);
  }
  table.append(thead, tbody);
  box.replaceChildren(el('h2', 'h2 dot-head', L.plan[lang]), table);
}

/* ---- Багц --------------------------------------------------------------- */
function drawIncludes(box, tour, lang) {
  if (!tour.includes?.length && !tour.excludes?.length) {
    box.replaceChildren();
    return;
  }
  const grid = el('div', 'incl');
  const col = (title, items, cls) => {
    const d = el('div', cls);
    d.append(el('h3', null, title));
    const ul = el('ul');
    for (const x of items) ul.append(el('li', null, pick(x.text, lang)));
    d.append(ul);
    return d;
  };
  if (tour.includes?.length) grid.append(col(L.included[lang], tour.includes, 'in'));
  if (tour.excludes?.length) grid.append(col(L.excluded[lang], tour.excludes, 'out'));
  box.replaceChildren(el('h2', 'h2 dot-head', L.package[lang]), grid);
}

/* ---- Хажуугийн хураангуй ------------------------------------------------ */
function drawSide(box, tour, lang) {
  const rows = [
    [L.duration[lang], tour.days > 0 ? daysLabel(tour.days, lang) : customLabel(lang)],
    [L.season[lang], months(tour.seasonFrom, tour.seasonTo, lang)],
    [
      L.group[lang],
      tour.groupMin > 0 && tour.groupMax > 0
        ? `${tour.groupMin}–${tour.groupMax}`
        : L.groupAny[lang],
    ],
    [L.langs[lang], 'MN · KR · EN'],
  ];
  if (tour.kmTotal > 0) rows.splice(1, 0, [L.distance[lang], `${km(tour.kmTotal)} km`]);

  const dl = el('dl');
  for (const [k, v] of rows) {
    const d = el('div');
    d.append(el('dt', null, k), el('dd', null, v));
    dl.append(d);
  }
  const act = el('div', 'act');
  const a1 = el('a', 'btn btn-sun btn-block', L.ask[lang]);
  a1.href = '/contact';
  const a2 = el('a', 'btn btn-line btn-block', L.all[lang]);
  a2.href = '/tours';
  act.append(a1, a2);

  box.replaceChildren(el('h3', 'h3', pick(tour.title, lang)), dl, act);
}

/* ---- Үндсэн ------------------------------------------------------------- */
async function main() {
  await boot();
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
  const root = document.querySelector('#tourRoot');
  if (!root) return;

  let tour;
  try {
    tour = await getTour(slug);
  } catch (e) {
    const msg =
      e instanceof ApiError && e.status === 404
        ? 'Ийм аялал олдсонгүй'
        : 'Мэдээллийг ачаалж чадсангүй';
    root.replaceChildren(el('p', 'state', msg));
    return;
  }

  document.title = `${pick(tour.title, getLang())} · Dream Spark Travel`;

  const heroImg = document.querySelector('#tourCover');
  if (heroImg && tour.cover) heroImg.src = tour.cover;
  for (const n of document.querySelectorAll('#tourRoot .tour-hero, #tourRoot .tour-body, #tourRoot .tour-side')) {
    n.dataset.region = tour.regionKey;
  }

  onLang((lang) => {
    const set = (sel, v) => {
      const n = document.querySelector(sel);
      if (n) n.textContent = v;
    };
    set('#tourTitle', pick(tour.title, lang));
    set('#tourArea', pick(tour.area, lang));
    set('#tourRegion', regionName(tour.regionKey, lang));

    const prose = document.querySelector('#tourProse');
    if (prose) {
      const frag = document.createDocumentFragment();
      frag.append(el('p', null, pick(tour.summary, lang)));
      for (const para of String(pick(tour.body, lang)).split(/\n{2,}/).filter(Boolean)) {
        frag.append(el('p', null, para.trim()));
      }
      prose.replaceChildren(frag);
    }

    const high = document.querySelector('#tourHigh');
    if (high) drawHighlights(high, tour.highlights, lang);

    const chart = document.querySelector('#tourChart');
    if (chart) drawChart(chart, tour.itinerary || [], lang);

    const table = document.querySelector('#tourDays');
    if (table) drawTable(table, tour.itinerary, lang);

    const incl = document.querySelector('#tourIncl');
    if (incl) drawIncludes(incl, tour, lang);

    const side = document.querySelector('#tourSide');
    if (side) drawSide(side, tour, lang);

    document.title = `${pick(tour.title, lang)} · Dream Spark Travel`;
  });

  reveal();
}

main();
