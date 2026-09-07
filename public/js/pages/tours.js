/* ==========================================================================
   tours.js — аяллын хуудас. Ангилал бүр (хөтөлбөр) доошоо цувна; дотор нь
   аяллууд дөрвөлжин карт. Карт дээр дарахад тухайн өдрийн дэлгэрэнгүй цонх
   (зураг, зам, үйл ажиллагаа) нээгдэнэ. Бүх бичвэр textContent-ээр.
   ========================================================================== */
import { getCategories } from '../core/api.js';
import { pick, onLang, getLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';

const L = {
  day: { kr: (n) => `${n}일차`, en: (n) => `Day ${n}` },
  stops: { kr: (n) => `${n}곳`, en: (n) => `${n} stops` },
  prev: { kr: '이전', en: 'Previous' },
  next: { kr: '다음', en: 'Next' },
  close: { kr: '닫기', en: 'Close' },
  fail: { kr: '투어를 불러오지 못했습니다', en: 'Could not load the tours' },
  none: { kr: '준비 중입니다', en: 'Coming soon' },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ---- Дөрвөлжин карт ----------------------------------------------------- */
function card(t, lang) {
  const b = el('button', 'tcard');
  b.type = 'button';
  b.dataset.slug = t.slug;
  const img = el('img');
  img.src = t.coverThumb || t.cover;
  img.alt = pick(t.title, lang);
  img.loading = 'lazy';
  img.decoding = 'async';
  b.append(img);
  if (t.dayNo > 0) b.append(el('span', 'tcard-day', L.day[lang](t.dayNo)));
  const cap = el('span', 'tcard-cap');
  cap.append(el('b', null, pick(t.title, lang)));
  const sub = pick(t.place, lang) || pick(t.summary, lang);
  if (sub) cap.append(el('small', null, sub));
  b.append(cap);
  return b;
}

/* ---- Дэлгэрэнгүй цонх --------------------------------------------------- */
let sheet = null;
let ctx = { cat: null, idx: 0, img: 0 };
let lastFocus = null;

function buildSheet() {
  if (sheet) return sheet;
  sheet = el('div', 'ts');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  const cardBox = el('div', 'ts-card');
  const close = el('button', 'ts-close', '×');
  close.type = 'button';
  close.addEventListener('click', closeSheet);
  const media = el('div', 'ts-media');
  const big = el('img', 'ts-big');
  big.alt = '';
  const thumbs = el('div', 'ts-thumbs');
  media.append(big, thumbs);
  const body = el('div', 'ts-body');
  cardBox.append(close, media, body);
  sheet.append(cardBox);
  document.body.append(sheet);

  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeSheet();
  });
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    ctx.img = Number(b.dataset.i);
    paintMedia();
  });
  document.addEventListener('keydown', (e) => {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') closeSheet();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
  onLang(() => {
    if (sheet.classList.contains('open')) paintSheet();
  });
  return sheet;
}

function current() {
  return ctx.cat?.tours[ctx.idx] || null;
}

function paintMedia() {
  const t = current();
  if (!t) return;
  const big = sheet.querySelector('.ts-big');
  const thumbs = sheet.querySelector('.ts-thumbs');
  const list = t.images.length ? t.images : [{ src: t.cover, thumb: t.coverThumb }];
  ctx.img = Math.max(0, Math.min(ctx.img, list.length - 1));
  // Зураг солигдоход зөөлөн илэрнэ (ачаалагдмагц .in)
  const src = list[ctx.img].src;
  if (big.getAttribute('src') !== src) {
    big.classList.remove('in');
    big.onload = () => big.classList.add('in');
    big.src = src;
    if (big.complete && big.naturalWidth) big.classList.add('in');
  } else {
    big.classList.add('in');
  }
  big.alt = pick(t.title);
  thumbs.replaceChildren();
  thumbs.hidden = list.length < 2;
  list.forEach((im, i) => {
    const b = el('button', i === ctx.img ? 'on' : null);
    b.type = 'button';
    b.dataset.i = String(i);
    const img = el('img');
    img.src = im.thumb || im.src;
    img.alt = '';
    img.loading = 'lazy';
    b.append(img);
    thumbs.append(b);
  });
}

function paintSheet() {
  const t = current();
  if (!t) return;
  const lang = getLang();
  const body = sheet.querySelector('.ts-body');
  const frag = document.createDocumentFragment();

  const eyebrow = el('p', 'ts-day');
  if (t.dayNo > 0) eyebrow.append(el('b', null, L.day[lang](t.dayNo)), ' · ');
  eyebrow.append(`${pick(ctx.cat.name, lang)} ${pick(ctx.cat.sub, lang)}`.trim());
  frag.append(eyebrow);

  frag.append(el('h3', 'h2 ts-title', pick(t.title, lang)));
  const place = pick(t.place, lang);
  if (place) frag.append(el('p', 'ts-place', place));
  const meta = pick(t.meta, lang);
  if (meta) frag.append(el('p', 'ts-meta', meta));
  const sum = pick(t.summary, lang);
  if (sum) frag.append(el('p', 'ts-sum', sum));
  const lines = String(pick(t.body, lang))
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length) {
    const ul = el('ul', 'ts-list');
    for (const s of lines) ul.append(el('li', null, s));
    frag.append(ul);
  }

  const nav = el('div', 'ts-nav');
  const prev = el('button', 'btn btn-line btn-sm', `‹ ${L.prev[lang]}`);
  prev.type = 'button';
  prev.disabled = ctx.idx === 0;
  prev.addEventListener('click', () => step(-1));
  const next = el('button', 'btn btn-pine btn-sm', `${L.next[lang]} ›`);
  next.type = 'button';
  next.disabled = ctx.idx >= ctx.cat.tours.length - 1;
  next.addEventListener('click', () => step(1));
  const count = el('span', 'ts-count', `${ctx.idx + 1} / ${ctx.cat.tours.length}`);
  nav.append(prev, count, next);
  frag.append(nav);

  body.replaceChildren(frag);
  [...body.children].forEach((n, i) => n.style.setProperty('--i', String(i)));
  sheet.querySelector('.ts-close').setAttribute('aria-label', L.close[lang]);
  paintMedia();
}

function step(d) {
  const n = ctx.cat.tours.length;
  const i = ctx.idx + d;
  if (i < 0 || i >= n) return;
  ctx.idx = i;
  ctx.img = 0;
  paintSheet();
  sheet.querySelector('.ts-body').scrollTop = 0;
}

function openSheet(cat, idx) {
  buildSheet();
  ctx = { cat, idx, img: 0 };
  lastFocus = document.activeElement;
  paintSheet();
  sheet.classList.add('open');
  document.body.classList.add('lb-open');
  sheet.querySelector('.ts-close').focus();
}

function closeSheet() {
  if (!sheet) return;
  sheet.classList.remove('open');
  document.body.classList.remove('lb-open');
  lastFocus?.focus?.();
}

/* ---- Ангилал ------------------------------------------------------------ */
function section(cat, lang) {
  const sec = el('section', 'cat rv');
  sec.id = cat.slug;
  const head = el('div', 'cat-head');
  const h = el('h2', 'h2', pick(cat.name, lang));
  const small = el('small');
  const bits = [pick(cat.sub, lang), L.stops[lang](cat.tours.length)].filter(Boolean);
  small.textContent = bits.join(' · ');
  h.append(small);
  head.append(h);
  const note = pick(cat.note, lang);
  if (note) head.append(el('p', 'cat-note', note));
  sec.append(head);

  const grid = el('div', 'tour-grid rv-stg');
  cat.tours.forEach((t, i) => {
    const c = card(t, lang);
    c.style.setProperty('--i', String(i));
    grid.append(c);
  });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-slug]');
    if (!b) return;
    openSheet(
      cat,
      cat.tours.findIndex((t) => t.slug === b.dataset.slug)
    );
  });
  sec.append(grid);
  return sec;
}

async function main() {
  await boot();
  const list = document.querySelector('#catList');
  const state = document.querySelector('#toursState');
  if (!list) return;

  let cats = [];
  try {
    cats = (await getCategories()).filter((c) => c.tours.length);
  } catch {
    if (state) state.textContent = L.fail[getLang()];
    return;
  }
  if (!cats.length) {
    if (state) state.textContent = L.none[getLang()];
    return;
  }
  state?.remove();

  onLang((lang) => {
    list.replaceChildren(...cats.map((c) => section(c, lang)));
    reveal(list);
  });

  // #central → ангилал руу гүйлгэнэ; #central-ugii → тухайн аяллын цонхыг шууд нээнэ
  const hash = decodeURIComponent(location.hash.slice(1));
  if (!hash) return;
  for (const cat of cats) {
    const i = cat.tours.findIndex((t) => t.slug === hash);
    if (i >= 0) {
      openSheet(cat, i);
      return;
    }
  }
  document.getElementById(hash)?.scrollIntoView({ block: 'start' });
}

main();
