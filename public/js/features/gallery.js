/* ==========================================================================
   gallery.js — «Монгол улс — нутгаар»
   Зураг бүр аймгийн хэлбэрээр таслагдан улсын газрын зураг дотор байрлана
   (21 аймаг + Улаанбаатар, data/aimags.js). Аймаг бүр өөрийн нутгийн
   (Говь / Хөвсгөл / Төв / Баруун) зургаас нэгийг авна. Нутаг сонгоход бусад
   нутаг бүдгэрнэ. Дарахад lightbox. Бүх бичвэрийг textContent-ээр тавина.
   ========================================================================== */
import { getGallery } from '../core/api.js';
import { pick, onLang } from '../core/i18n.js';
import { reveal } from '../core/ui.js';
import { AIMAGS, W } from '../data/aimags.js';
import * as lb from './lightbox.js';

const REGIONS = [
  { key: 'khuvsgul', kr: '홉스골', en: 'Khövsgöl', pin: { x: 40, y: 12 } },
  { key: 'tuv', kr: '중부', en: 'Central', pin: { x: 60, y: 42 } },
  { key: 'gobi', kr: '고비', en: 'Gobi', pin: { x: 50, y: 78 } },
  { key: 'other', kr: '서부 및 기타', en: 'West & elsewhere', pin: { x: 12, y: 34 } },
];
const ALL = { key: 'all', kr: '전체', en: 'All' };
const PHOTOS_WORD = { kr: (n) => `사진 ${n}장`, en: (n) => `${n} photos` };
const SVG = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';

/* Баганы тоо (CSS-тэй ижил) ба эхний зургийн хэмжээ: мөр бүтэн дүүрэх хувилбарыг сонгоно */
function columns() {
  return window.matchMedia('(min-width:700px)').matches ? 7 : 3;
}
function leadKind(n, cols) {
  const opts = [
    ['lead', 4],
    ['lead wide', 2],
    ['', 1],
  ];
  for (const [cls, cells] of opts) if ((cells + n - 1) % cols === 0) return cls;
  return n >= 9 ? 'lead' : 'lead wide';
}

const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* Аймаг бүрд нутгийнх нь зургаас нэгийг ононо: эхлээд сануулгаар, дараа нь дарааллаар */
function assignPhotos(all) {
  const used = new Set();
  const out = new Map();
  const pool = (key) => all.filter((p) => p.regionKey === key);
  for (const a of AIMAGS) {
    const list = pool(a.region);
    if (!list.length) continue;
    let p = list.find((x) => !used.has(x.id) && a.hint.some((h) => x.image.includes(h)));
    if (!p) p = list.find((x) => !used.has(x.id));
    if (!p) p = list[0];
    used.add(p.id);
    out.set(a.id, p);
  }
  return out;
}

export async function initGallery(root = document) {
  const gal = root.querySelector('.gal');
  const filterBox = root.querySelector('#galFilter');
  const stage = root.querySelector('.mn-stage');
  const album = root.querySelector('#galAlbum');
  const stateBox = root.querySelector('#galState');
  if (!gal) return;

  let all = [];
  let region = 'all';
  let lang = 'kr';

  try {
    all = await getGallery({ limit: 200 });
  } catch {
    if (stateBox) stateBox.textContent = 'Could not load the photos';
    return;
  }
  if (!all.length) {
    if (stateBox) stateBox.textContent = 'No photos yet';
    return;
  }
  stateBox?.remove();

  const byRegion = (key) => all.filter((p) => p.regionKey === key);
  const regions = REGIONS.filter((r) => byRegion(r.key).length);
  const photoOf = assignPhotos(all);

  /* ---- Шүүлтүүр --------------------------------------------------------- */
  function renderFilter() {
    if (!filterBox) return;
    const frag = document.createDocumentFragment();
    for (const r of [ALL, ...regions]) {
      const n = r.key === 'all' ? all.length : byRegion(r.key).length;
      const b = el('button');
      b.type = 'button';
      b.dataset.region = r.key;
      b.setAttribute('aria-pressed', String(r.key === region));
      b.classList.toggle('on', r.key === region);
      b.append(r[lang] || r.kr, ' ');
      b.append(el('span', 'n', String(n)));
      frag.append(b);
    }
    filterBox.replaceChildren(frag);
  }
  filterBox?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-region]');
    if (b) select(b.dataset.region);
  });

  /* ---- Газрын зураг: аймаг бүр нэг зураг -------------------------------- */
  function renderMap() {
    if (!stage) return;
    stage.replaceChildren();
    const svg = svgEl('svg', {
      class: 'mn-svg',
      viewBox: `0 0 ${W} 1`,
      'aria-label': 'Map of Mongolia',
    });
    const defs = svgEl('defs');
    const land = svgEl('g', { class: 'mn-land' });
    const tiles = svgEl('g', { class: 'mn-tiles' });

    for (const a of AIMAGS) {
      const clip = svgEl('clipPath', { id: `ai-${a.id}`, clipPathUnits: 'userSpaceOnUse' });
      clip.append(svgEl('path', { d: a.d }));
      defs.append(clip);
      land.append(svgEl('path', { d: a.d, 'vector-effect': 'non-scaling-stroke' }));

      const p = photoOf.get(a.id);
      const g = svgEl('g', {
        class: 'mn-tile',
        'data-region': a.region,
        tabindex: 0,
        role: 'button',
      });
      if (p) {
        g.dataset.id = String(p.id);
        const [x0, y0, x1, y1] = a.box;
        const img = svgEl('image', {
          x: x0,
          y: y0,
          width: x1 - x0,
          height: y1 - y0,
          preserveAspectRatio: 'xMidYMid slice',
          'clip-path': `url(#ai-${a.id})`,
        });
        img.setAttribute('href', p.thumb || p.image);
        img.setAttributeNS(XLINK, 'xlink:href', p.thumb || p.image);
        g.append(img);
      }
      g.append(svgEl('path', { class: 'mn-edge', d: a.d, 'vector-effect': 'non-scaling-stroke' }));
      const title = svgEl('title');
      title.textContent = p ? `${a.name} · ${pick(p.place, lang)}` : a.name;
      g.append(title);
      tiles.append(g);
    }
    svg.append(defs, land, tiles);
    stage.append(svg);
    requestAnimationFrame(() => stage.classList.add('in'));

    for (const r of regions) {
      const pin = el('button', 'mn-pin');
      pin.type = 'button';
      pin.dataset.region = r.key;
      pin.style.left = `${r.pin.x}%`;
      pin.style.top = `${r.pin.y}%`;
      pin.classList.toggle('on', r.key === region);
      pin.append(r[lang] || r.kr, ' ');
      pin.append(el('b', null, String(byRegion(r.key).length)));
      stage.append(pin);
    }
  }
  function openTile(tile) {
    const list = byRegion(tile.dataset.region);
    lb.open(
      list,
      Math.max(
        0,
        list.findIndex((p) => String(p.id) === tile.dataset.id)
      )
    );
  }
  stage?.addEventListener('click', (e) => {
    const pin = e.target.closest('.mn-pin');
    if (pin) {
      select(pin.dataset.region === region ? 'all' : pin.dataset.region);
      return;
    }
    const tile = e.target.closest('.mn-tile');
    if (tile?.dataset.id) openTile(tile);
  });
  stage?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tile = e.target.closest('.mn-tile');
    if (tile?.dataset.id) {
      e.preventDefault();
      openTile(tile);
    }
  });

  /* ---- Цомог: нутаг бүр өөрийн хэсэгтэй --------------------------------- */
  function renderAlbum() {
    if (!album) return;
    const frag = document.createDocumentFragment();
    for (const r of regions) {
      const photos = byRegion(r.key);
      const sec = el('section', 'gal-sec');
      sec.dataset.region = r.key;
      sec.id = `gal-${r.key}`;
      sec.hidden = region !== 'all' && region !== r.key;

      const head = el('div', 'gal-sec-head');
      const h = el('h3', null, r[lang] || r.kr);
      h.append(el('small', null, PHOTOS_WORD[lang](photos.length)));
      head.append(h);

      const grid = el('div', 'gal-grid rv-stg');
      const lead = leadKind(photos.length, columns());
      photos.forEach((ph, i) => {
        const btn = el('button', i === 0 && lead ? lead : null);
        btn.type = 'button';
        btn.style.setProperty('--i', String(Math.min(i, 12)));
        btn.dataset.id = String(ph.id);
        btn.setAttribute('aria-label', pick(ph.place, lang) || 'Photo');
        const img = el('img');
        img.src = ph.thumb || ph.image;
        img.alt = pick(ph.place, lang) || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        btn.append(img, el('figcaption', null, pick(ph.place, lang)));
        grid.append(btn);
      });
      sec.append(head, grid);
      frag.append(sec);
    }
    album.replaceChildren(frag);
    reveal(album);
  }
  album?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const key = btn.dataset.region || btn.closest('.gal-sec')?.dataset.region;
    const list = byRegion(key);
    lb.open(
      list,
      Math.max(
        0,
        list.findIndex((p) => String(p.id) === btn.dataset.id)
      )
    );
  });

  /* ---- Сонгох ----------------------------------------------------------- */
  function select(key) {
    region = key;
    gal.dataset.region = key;
    for (const b of filterBox?.querySelectorAll('button[data-region]') || []) {
      const on = b.dataset.region === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    for (const p of stage?.querySelectorAll('.mn-pin') || [])
      p.classList.toggle('on', p.dataset.region === key);
    for (const s of album?.querySelectorAll('.gal-sec') || [])
      s.hidden = key !== 'all' && s.dataset.region !== key;
  }

  onLang((l) => {
    lang = l;
    renderFilter();
    renderMap();
    renderAlbum();
  });
  gal.dataset.region = region;

  // Баганы тоо өөрчлөгдвөл (утас ↔ ширээ) цомгийг дахин зурна
  let cols = columns();
  let timer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const c = columns();
      if (c !== cols) {
        cols = c;
        renderAlbum();
      }
    }, 150);
  });
}
