/* ==========================================================================
   tours.js — аяллын жагсаалт. Дээр нь ангиллын сонголт (chip); ангилал бүр
   доошоо цувна, дотор нь хоногийн багцууд дөрвөлжин карт. Карт → /tours/<slug>.
   ========================================================================== */
import { getCategories } from '../core/api.js';
import { pick, onLang, getLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';

const L = {
  all: { kr: '전체', en: 'All' },
  days: { kr: (n) => `${n}일 일정`, en: (n) => `${n} days` },
  fail: { kr: '투어를 불러오지 못했습니다', en: 'Could not load the tours' },
  none: { kr: '준비 중입니다', en: 'Coming soon' },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ---- Дөрвөлжин карт → багцын хуудас ------------------------------------ */
function card(t, lang) {
  const a = el('a', 'tcard');
  a.href = `/tours/${encodeURIComponent(t.slug)}`;
  const img = el('img');
  img.src = t.coverThumb || t.cover;
  img.alt = pick(t.title, lang);
  img.loading = 'lazy';
  img.decoding = 'async';
  a.append(img);
  const dur = pick(t.duration, lang);
  if (dur) a.append(el('span', 'tcard-day', dur));
  const cap = el('span', 'tcard-cap');
  cap.append(el('b', null, pick(t.title, lang)));
  const sub = pick(t.summary, lang) || (t.daysCount ? L.days[lang](t.daysCount) : '');
  if (sub) cap.append(el('small', null, sub));
  a.append(cap);
  return a;
}

/* ---- Ангилал ------------------------------------------------------------ */
function section(cat, lang) {
  const sec = el('section', 'cat rv');
  sec.id = cat.slug;
  sec.dataset.cat = cat.slug;
  const head = el('div', 'cat-head');
  const h = el('h2', 'h2', pick(cat.name, lang));
  h.append(el('small', null, String(cat.tours.length)));
  head.append(h);
  sec.append(head);

  const grid = el('div', 'tour-grid rv-stg');
  cat.tours.forEach((t, i) => {
    const c = card(t, lang);
    c.style.setProperty('--i', String(i));
    grid.append(c);
  });
  sec.append(grid);
  return sec;
}

async function main() {
  await boot();
  const list = document.querySelector('#catList');
  const filter = document.querySelector('#catFilter');
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

  let current = 'all';
  const hash = decodeURIComponent(location.hash.slice(1));
  if (cats.some((c) => c.slug === hash)) current = hash;

  function renderFilter(lang) {
    if (!filter) return;
    const frag = document.createDocumentFragment();
    for (const c of [
      { slug: 'all', name: L.all, n: cats.reduce((a, x) => a + x.tours.length, 0) },
      ...cats,
    ]) {
      const b = el('button');
      b.type = 'button';
      b.dataset.cat = c.slug;
      b.classList.toggle('on', c.slug === current);
      b.setAttribute('aria-pressed', String(c.slug === current));
      b.append(pick(c.name, lang), ' ');
      b.append(el('span', 'n', String(c.n ?? c.tours.length)));
      frag.append(b);
    }
    filter.replaceChildren(frag);
  }

  function select(slug) {
    current = slug;
    for (const b of filter?.querySelectorAll('button[data-cat]') || []) {
      const on = b.dataset.cat === slug;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    for (const s of list.querySelectorAll('.cat')) {
      s.hidden = slug !== 'all' && s.dataset.cat !== slug;
    }
    reveal(list);
    history.replaceState(null, '', slug === 'all' ? location.pathname : `#${slug}`);
  }
  filter?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (b) select(b.dataset.cat);
  });

  onLang((lang) => {
    renderFilter(lang);
    list.replaceChildren(...cats.map((c) => section(c, lang)));
    for (const s of list.querySelectorAll('.cat'))
      s.hidden = current !== 'all' && s.dataset.cat !== current;
    reveal(list);
  });
}

main();
